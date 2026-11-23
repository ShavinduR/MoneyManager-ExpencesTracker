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
import { cents } from '@/lib/money';
import { isISODate, isMonthKey } from '@/lib/dates';

/**
 * Runtime mirror of `types/finance.ts`, used at trust boundaries (JSON import, stored data).
 * `parseFinanceData` returning `FinanceData` makes the compiler check the two stay in sync.
 */
const centsSchema = z.number().int().transform(cents);
const isoDate = z.string().refine(isISODate, 'Expected YYYY-MM-DD');
const monthKey = z.string().refine(isMonthKey, 'Expected YYYY-MM');
const id = z.string().min(1);
const expenseCategory = z.enum(EXPENSE_CATEGORIES);

const entryBase = {
  id,
  date: isoDate,
  description: z.string(),
  amount: centsSchema,
  cleared: z.boolean(),
};

const monthlyEntry = z.discriminatedUnion('kind', [
  z.object({ ...entryBase, kind: z.literal('income'), category: z.enum(INCOME_CATEGORIES) }),
  z.object({ ...entryBase, kind: z.literal('savings'), category: z.enum(SAVINGS_CATEGORIES) }),
  z.object({ ...entryBase, kind: z.literal('debt'), category: z.literal('debt'), debtId: id.nullable(), notes: z.string() }),
  z.object({ ...entryBase, kind: z.literal('fixed'), category: expenseCategory }),
]);

const otherBill = z.object({
  id,
  name: z.string(),
  dueDate: isoDate,
  amountDue: centsSchema,
  amountPaid: centsSchema,
  paid: z.boolean(),
  category: expenseCategory,
  notes: z.string(),
});

export const monthRecordSchema = z.object({
  month: monthKey,
  openingBalanceOverride: centsSchema.nullable(),
  goals: z.array(z.object({ id, text: z.string(), done: z.boolean() })),
  entries: z.array(monthlyEntry),
  otherBills: z.array(otherBill),
  notes: z.string(),
  reflection: z.string(),
  updatedAt: z.string(),
});

const debtAccount = z.object({
  id,
  creditor: z.string().min(1),
  accountRef: z.string().max(4).nullable(),
  interestRateApr: z.number().min(0).max(100),
  startingBalance: centsSchema,
  startDate: isoDate,
  minimumPayment: centsSchema,
  goalPayoffDate: isoDate.nullable(),
  motivation: z.string(),
  archived: z.boolean(),
});

const goalSlot = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(6), z.literal(7), z.literal(8),
]);

const yearPlan = z.object({
  year: z.number().int().min(2000).max(2100),
  commitment: z.string(),
  mindMap: z.string().default(''),
  goals: z.array(
    z.object({
      id,
      slot: goalSlot,
      title: z.string(),
      targetAmount: centsSchema.nullable(),
      currentAmount: centsSchema,
      status: z.enum(GOAL_STATUSES),
      notes: z.string(),
    }),
  ),
});

/** `.strict()` rejects unknown keys, so a backup can't smuggle in e.g. a "password" field. */
const bankAccount = z
  .object({
    id,
    name: z.string().min(1),
    institution: z.string(),
    type: z.enum(ACCOUNT_TYPES),
    branch: z.string(),
    cardLast4: z.string().regex(/^\d{4}$/).nullable(),
    currentBalance: centsSchema,
    notes: z.string(),
  })
  .strict();

const profile = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().default(''),
  city: z.string().default(''),
  country: z.string().default(''),
  currency: z.enum(CURRENCY_CODES),
  theme: z.enum(THEME_PREFERENCES),
  initialBalance: centsSchema,
  llmEnabled: z.boolean(),
});

export const financeDataSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  profile,
  months: z.record(monthKey, monthRecordSchema),
  debts: z.array(debtAccount),
  yearPlans: z.record(z.string().regex(/^\d{4}$/), yearPlan),
  bankAccounts: z.array(bankAccount),
});

export type ParseOutcome<T> = { ok: true; value: T } | { ok: false; error: string };

const describeError = (error: z.ZodError): string => {
  const first = error.issues[0];
  return first ? `${first.path.join('.') || 'root'}: ${first.message}` : 'Invalid data';
};

export const parseFinanceData = (input: unknown): ParseOutcome<FinanceData> => {
  const result = financeDataSchema.safeParse(input);
  return result.success ? { ok: true, value: result.data } : { ok: false, error: describeError(result.error) };
};

/** Stored or imported document → migrate older schema versions → validate. */
export const parseAndMigrate = (input: unknown): ParseOutcome<FinanceData> => {
  const migrated = migrateToLatest(input);
  return migrated.ok ? parseFinanceData(migrated.value) : { ok: false, error: migrated.error };
};
