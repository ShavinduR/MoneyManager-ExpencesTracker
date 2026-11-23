import type { Cents, DebtAccount, DebtEntry, Id, MonthKey, MonthRecord } from '@/types/finance';
import { cents, maxCents, subCents, sumCents, ZERO } from '@/lib/money';

export type DebtPaymentRow = {
  entryId: Id;
  month: MonthKey;
  date: string;
  amountPaid: Cents;
  /** Starting balance minus cumulative payments, floored at 0. */
  remainingBalance: Cents;
  notes: string;
  description: string;
};

/** Every monthly debt entry linked to this debt, oldest first. Single source of truth: the monthly tables. */
export const linkedPayments = (debtId: Id, months: Record<MonthKey, MonthRecord>): (DebtEntry & { month: MonthKey })[] =>
  Object.values(months)
    .flatMap((record) =>
      record.entries.flatMap((entry) => (entry.kind === 'debt' && entry.debtId === debtId ? [{ ...entry, month: record.month }] : [])),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

export const debtPaymentHistory = (debt: DebtAccount, months: Record<MonthKey, MonthRecord>): DebtPaymentRow[] => {
  let remaining: Cents = debt.startingBalance;
  return linkedPayments(debt.id, months).map((entry) => {
    remaining = maxCents(ZERO, subCents(remaining, entry.amount));
    return {
      entryId: entry.id,
      month: entry.month,
      date: entry.date,
      amountPaid: entry.amount,
      remainingBalance: remaining,
      notes: entry.notes,
      description: entry.description,
    };
  });
};

export type DebtProgress = { totalPaid: Cents; remaining: Cents; progress: number; paymentCount: number };

export const debtProgress = (debt: DebtAccount, history: readonly DebtPaymentRow[]): DebtProgress => {
  const totalPaid = sumCents(history.map((r) => r.amountPaid));
  const remaining = history.at(-1)?.remainingBalance ?? debt.startingBalance;
  return {
    totalPaid,
    remaining,
    progress: debt.startingBalance > 0 ? Math.min(1, (debt.startingBalance - remaining) / debt.startingBalance) : 1,
    paymentCount: history.length,
  };
};

export const totalDebtRemaining = (debts: readonly DebtAccount[], months: Record<MonthKey, MonthRecord>): Cents =>
  cents(
    debts
      .filter((d) => !d.archived)
      .reduce((acc, d) => acc + debtProgress(d, debtPaymentHistory(d, months)).remaining, 0),
  );
