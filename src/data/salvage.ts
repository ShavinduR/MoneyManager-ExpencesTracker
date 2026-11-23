import type { z } from 'zod';
import type { BankAccount, DebtAccount, FinanceData, MonthRecord, Profile, YearPlan } from '@/types/finance';
import { SCHEMA_VERSION } from '@/types/finance';
import { defaultProfile, emptyYearPlan } from '@/lib/factories';
import { formatMonthLong, isMonthKey } from '@/lib/dates';
import {
  bankAccountSchema,
  debtAccountSchema,
  monthGoalSchema,
  monthlyEntrySchema,
  monthRecordSchema,
  otherBillSchema,
  profileSchema,
  yearlyGoalSchema,
  yearPlanSchema,
} from './schema';

/**
 * Loads stored data record by record so that ONE bad value can never take the whole database down
 * (audit finding C1). Whatever validates is returned; whatever doesn't is reported in `issues` and the
 * caller keeps a raw recovery copy. Nothing here writes or deletes anything.
 */

export type SalvageResult = { data: FinanceData; issues: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Keeps items that validate; returns how many were dropped. */
const keepValid = <S extends z.ZodType>(schema: S, items: unknown[]): { kept: z.output<S>[]; dropped: number } => {
  const kept: z.output<S>[] = [];
  let dropped = 0;
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) kept.push(parsed.data);
    else dropped += 1;
  }
  return { kept, dropped };
};

const salvageProfile = (raw: unknown, issues: string[]): Profile => {
  const whole = profileSchema.safeParse(raw);
  if (whole.success) return whole.data;
  const fallback = defaultProfile();
  if (raw === undefined) return fallback;
  // Field by field: keep every setting that is still valid.
  const source = isRecord(raw) ? raw : {};
  const fields = profileSchema.shape;
  const merged = {
    name: fields.name.safeParse(source.name).data ?? fallback.name,
    email: fields.email.safeParse(source.email).data ?? fallback.email,
    phone: fields.phone.safeParse(source.phone).data ?? fallback.phone,
    city: fields.city.safeParse(source.city).data ?? fallback.city,
    country: fields.country.safeParse(source.country).data ?? fallback.country,
    currency: fields.currency.safeParse(source.currency).data ?? fallback.currency,
    theme: fields.theme.safeParse(source.theme).data ?? fallback.theme,
    initialBalance: fields.initialBalance.safeParse(source.initialBalance).data ?? fallback.initialBalance,
    llmEnabled: fields.llmEnabled.safeParse(source.llmEnabled).data ?? fallback.llmEnabled,
  };
  issues.push('Some profile settings couldn’t be read and were reset to defaults.');
  return merged;
};

const salvageMonth = (raw: unknown, issues: string[]): MonthRecord | null => {
  const whole = monthRecordSchema.safeParse(raw);
  if (whole.success) return whole.data;
  if (!isRecord(raw) || typeof raw.month !== 'string' || !isMonthKey(raw.month)) {
    issues.push('A month record couldn’t be identified and was skipped.');
    return null;
  }
  const key = raw.month;
  const entries = keepValid(monthlyEntrySchema, asArray(raw.entries));
  const bills = keepValid(otherBillSchema, asArray(raw.otherBills));
  const goals = keepValid(monthGoalSchema, asArray(raw.goals));
  const fields = monthRecordSchema.shape;
  const record: MonthRecord = {
    month: key,
    openingBalanceOverride: fields.openingBalanceOverride.safeParse(raw.openingBalanceOverride).data ?? null,
    goals: goals.kept,
    entries: entries.kept,
    otherBills: bills.kept,
    notes: fields.notes.safeParse(raw.notes).data ?? '',
    reflection: fields.reflection.safeParse(raw.reflection).data ?? '',
    updatedAt: fields.updatedAt.safeParse(raw.updatedAt).data ?? new Date(0).toISOString(),
  };
  const lost = [
    entries.dropped ? plural(entries.dropped, 'entry') : '',
    bills.dropped ? plural(bills.dropped, 'bill') : '',
    goals.dropped ? plural(goals.dropped, 'goal') : '',
  ].filter(Boolean);
  issues.push(`${formatMonthLong(key)}: ${lost.length ? `${lost.join(', ')} couldn’t be read` : 'some fields were reset'}.`);
  return record;
};

const salvageYearPlan = (raw: unknown, issues: string[]): YearPlan | null => {
  const whole = yearPlanSchema.safeParse(raw);
  if (whole.success) return whole.data;
  if (!isRecord(raw) || typeof raw.year !== 'number') {
    issues.push('A yearly plan couldn’t be identified and was skipped.');
    return null;
  }
  const year = raw.year;
  const base = emptyYearPlan(year);
  const goals = keepValid(yearlyGoalSchema, asArray(raw.goals));
  const fields = yearPlanSchema.shape;
  issues.push(`${year} goals: ${goals.dropped ? `${plural(goals.dropped, 'goal')} couldn’t be read` : 'some fields were reset'}.`);
  return {
    year,
    commitment: fields.commitment.safeParse(raw.commitment).data ?? '',
    mindMap: fields.mindMap.safeParse(raw.mindMap).data ?? '',
    goals: base.goals.map((empty) => goals.kept.find((g) => g.slot === empty.slot) ?? empty),
  };
};

/** `doc` must already be migrated to the current schema version. */
export const salvageFinanceData = (doc: Record<string, unknown>): SalvageResult => {
  const issues: string[] = [];
  const profile = salvageProfile(doc.profile, issues);

  const months: Record<string, MonthRecord> = {};
  for (const raw of Object.values(isRecord(doc.months) ? doc.months : {})) {
    const record = salvageMonth(raw, issues);
    if (record) months[record.month] = record;
  }

  const debts = keepValid(debtAccountSchema, asArray(doc.debts));
  if (debts.dropped) issues.push(`${plural(debts.dropped, 'debt account')} couldn’t be read.`);
  const accounts = keepValid(bankAccountSchema, asArray(doc.bankAccounts));
  if (accounts.dropped) issues.push(`${plural(accounts.dropped, 'bank account')} couldn’t be read.`);

  const yearPlans: Record<string, YearPlan> = {};
  for (const raw of Object.values(isRecord(doc.yearPlans) ? doc.yearPlans : {})) {
    const plan = salvageYearPlan(raw, issues);
    if (plan) yearPlans[String(plan.year)] = plan;
  }

  const debtList: DebtAccount[] = debts.kept;
  const accountList: BankAccount[] = accounts.kept;
  return {
    data: { schemaVersion: SCHEMA_VERSION, profile, months, debts: debtList, yearPlans, bankAccounts: accountList },
    issues,
  };
};
