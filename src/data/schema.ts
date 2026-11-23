import { z } from 'zod';
import type { FinanceData } from '@/types/finance';
import { migrateToLatest } from './migrations';
import {
  ACCOUNT_TYPES,
  CURRENCY_CODES,
  EXPENSE_CATEGORIES,
  GOAL_STATUSES,
  INCOME_CATEGORIES,
  SAVINGS_CATEGORIES,
  SCHEMA_VERSION,
  THEME_PREFERENCES,
} from '@/types/finance';
import { cents, MAX_CENTS } from '@/lib/money';
import { isISODate, isMonthKey } from '@/lib/dates';
import { looksLikeSecret } from '@/lib/security';

/**
 * Runtime mirror of `types/finance.ts`, used at trust boundaries (stored data, JSON import).
 * Every object is `.strict()`: unknown keys (e.g. a smuggled "password") are rejected, not silently kept.
 * `parseFinanceData` returning `FinanceData` makes the compiler check the two stay in sync.
 */

// ---------- Primitives ----------

/** Amounts that can only be zero or positive (entries, bills, debt balances, goals). */
const amountCents = z.number().int().min(0, 'Amount can’t be negative').max(MAX_CENTS, 'Amount is too large').transform(cents);
/** Balances that may legitimately be negative (bank balance owed, opening balance overrides). */
const signedCents = z.number().int().min(-MAX_CENTS, 'Amount is too large').max(MAX_CENTS, 'Amount is too large').transform(cents);
const isoDate = z.string().refine(isISODate, 'Expected a valid YYYY-MM-DD date');
const monthKey = z.string().refine(isMonthKey, 'Expected YYYY-MM');
const id = z.string().min(1).max(64);
const shortText = z.string().max(200);
const mediumText = z.string().max(2_000);
const longText = z.string().max(20_000);
const expenseCategory = z.enum(EXPENSE_CATEGORIES);

// ---------- Monthly workspace ----------

const entryBase = {
  id,
  date: isoDate,
  description: shortText,
  amount: amountCents,
  cleared: z.boolean(),
};

export const monthlyEntrySchema = z.discriminatedUnion('kind', [
  z.object({ ...entryBase, kind: z.literal('income'), category: z.enum(INCOME_CATEGORIES) }).strict(),
  z.object({ ...entryBase, kind: z.literal('savings'), category: z.enum(SAVINGS_CATEGORIES) }).strict(),
  z.object({ ...entryBase, kind: z.literal('debt'), category: z.literal('debt'), debtId: id.nullable(), notes: mediumText }).strict(),
  z.object({ ...entryBase, kind: z.literal('fixed'), category: expenseCategory }).strict(),
]);

export const otherBillSchema = z
  .object({
    id,
    name: shortText,
    dueDate: isoDate,
    amountDue: amountCents,
    amountPaid: amountCents,
    paid: z.boolean(),
    category: expenseCategory,
    notes: mediumText,
  })
  .strict();

export const monthGoalSchema = z.object({ id, text: shortText, done: z.boolean() }).strict();

export const monthRecordSchema = z
  .object({
    month: monthKey,
    openingBalanceOverride: signedCents.nullable(),
    goals: z.array(monthGoalSchema).max(50),
    entries: z.array(monthlyEntrySchema).max(5_000),
    otherBills: z.array(otherBillSchema).max(1_000),
    notes: longText,
    reflection: longText,
    updatedAt: z.string().max(40),
  })
  .strict();

// ---------- Debts, goals, accounts, profile ----------

export const debtAccountSchema = z
  .object({
    id,
    creditor: z.string().min(1).max(100),
    /** Last 1–4 digits only (L13): the UI keeps digits, so imports must too. */
    accountRef: z.string().regex(/^\d{1,4}$/, 'Account reference must be the last 4 digits').nullable(),
    interestRateApr: z.number().min(0).max(100),
    startingBalance: amountCents,
    startDate: isoDate,
    minimumPayment: amountCents,
    goalPayoffDate: isoDate.nullable(),
    motivation: mediumText,
    archived: z.boolean(),
  })
  .strict();

const goalSlot = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(6), z.literal(7), z.literal(8),
]);

export const yearlyGoalSchema = z
  .object({
    id,
    slot: goalSlot,
    title: shortText,
    targetAmount: amountCents.nullable(),
    currentAmount: amountCents,
    status: z.enum(GOAL_STATUSES),
    notes: mediumText,
  })
  .strict();

export const yearPlanSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    commitment: mediumText,
    mindMap: longText.default(''),
    goals: z.array(yearlyGoalSchema).max(8),
  })
  .strict();

/** No credential fields exist; unknown keys are rejected. Secret-looking text is rejected on import (see below). */
export const bankAccountSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    institution: z.string().max(100),
    type: z.enum(ACCOUNT_TYPES),
    branch: z.string().max(100),
    cardLast4: z.string().regex(/^\d{4}$/, 'Card reference must be exactly the last 4 digits').nullable(),
    currentBalance: signedCents,
    notes: mediumText,
  })
  .strict();

export const profileSchema = z
  .object({
    name: z.string().max(100),
    email: z.string().max(200),
    phone: z.string().max(40).default(''),
    city: z.string().max(100).default(''),
    country: z.string().max(100).default(''),
    currency: z.enum(CURRENCY_CODES),
    theme: z.enum(THEME_PREFERENCES),
    initialBalance: signedCents,
    llmEnabled: z.boolean(),
  })
  .strict();

export const financeDataSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    profile: profileSchema,
    months: z.record(monthKey, monthRecordSchema),
    debts: z.array(debtAccountSchema).max(500),
    yearPlans: z.record(z.string().regex(/^\d{4}$/), yearPlanSchema),
    bankAccounts: z.array(bankAccountSchema).max(500),
  })
  .strict();

// ---------- Cross-record integrity (imports) ----------

/**
 * Checks that only make sense across records. Applied to imports, where a hand-edited or foreign
 * file could be internally inconsistent; stored data is written by the app and only checked structurally.
 */
export const integrityIssues = (data: FinanceData): string[] => {
  const issues: string[] = [];
  const ids = new Set<string>();
  const claim = (value: string, where: string): void => {
    if (ids.has(value)) issues.push(`${where}: duplicate id "${value.slice(0, 24)}"`);
    ids.add(value);
  };
  const debtIds = new Set(data.debts.map((d) => d.id));

  for (const [key, record] of Object.entries(data.months)) {
    if (record.month !== key) issues.push(`months.${key}: record says it is ${record.month}`);
    for (const entry of record.entries) {
      claim(entry.id, `months.${key}.entries`);
      if (!entry.date.startsWith(key)) issues.push(`months.${key}: entry "${entry.description.slice(0, 30)}" is dated ${entry.date}`);
      if (entry.kind === 'debt' && entry.debtId !== null && !debtIds.has(entry.debtId)) {
        issues.push(`months.${key}: payment "${entry.description.slice(0, 30)}" links to a debt that isn’t in the file`);
      }
    }
    for (const bill of record.otherBills) {
      claim(bill.id, `months.${key}.otherBills`);
      if (!bill.dueDate.startsWith(key)) issues.push(`months.${key}: bill "${bill.name.slice(0, 30)}" is due ${bill.dueDate}`);
    }
  }
  data.debts.forEach((d) => claim(d.id, 'debts'));
  for (const account of data.bankAccounts) {
    claim(account.id, 'bankAccounts');
    if ([account.name, account.institution, account.branch, account.notes].some(looksLikeSecret)) {
      issues.push(`bankAccounts: “${account.name.slice(0, 30)}” contains what looks like a password, PIN or full card number`);
    }
  }
  for (const [key, plan] of Object.entries(data.yearPlans)) {
    if (String(plan.year) !== key) issues.push(`yearPlans.${key}: plan says it is ${plan.year}`);
    const slots = new Set<number>();
    for (const goal of plan.goals) {
      claim(goal.id, `yearPlans.${key}.goals`);
      if (slots.has(goal.slot)) issues.push(`yearPlans.${key}: goal slot ${goal.slot} appears twice`);
      slots.add(goal.slot);
    }
  }
  return issues;
};

// ---------- Parsing helpers ----------

export type ParseOutcome<T> = { ok: true; value: T } | { ok: false; error: string };

export const describeError = (error: z.ZodError): string => {
  const first = error.issues[0];
  return first ? `${first.path.join('.') || 'root'}: ${first.message}` : 'Invalid data';
};

export const parseFinanceData = (input: unknown): ParseOutcome<FinanceData> => {
  const result = financeDataSchema.safeParse(input);
  return result.success ? { ok: true, value: result.data } : { ok: false, error: describeError(result.error) };
};

/** Imported document → migrate older schema versions → validate structure → validate integrity. */
export const parseImport = (input: unknown): ParseOutcome<FinanceData> => {
  const migrated = migrateToLatest(input);
  if (!migrated.ok) return { ok: false, error: migrated.error };
  const parsed = parseFinanceData(migrated.value);
  if (!parsed.ok) return parsed;
  const issues = integrityIssues(parsed.value);
  return issues.length === 0
    ? parsed
    : { ok: false, error: `${issues[0]}${issues.length > 1 ? ` (and ${issues.length - 1} more problem${issues.length > 2 ? 's' : ''})` : ''}` };
};
