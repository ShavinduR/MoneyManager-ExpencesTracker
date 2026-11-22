import type {
  Cents,
  ExpenseCategory,
  MonthRecord,
  MonthSummary,
  OpeningSource,
} from '@/types/finance';
import { EXPENSE_CATEGORIES } from '@/types/finance';
import { addCents, maxCents, subCents, sumCents, ZERO } from '@/lib/money';

export type OpeningBalance = { amount: Cents; source: OpeningSource };

/**
 * Pure monthly arithmetic. The opening balance is resolved by the caller (see carryOver.ts)
 * so this function never needs to look at other months.
 */
export const summarizeMonth = (record: MonthRecord, opening: OpeningBalance): MonthSummary => {
  const amountsOf = (kind: MonthRecord['entries'][number]['kind']): Cents[] =>
    record.entries.filter((e) => e.kind === kind).map((e) => e.amount);

  const totalIncome = sumCents(amountsOf('income'));
  const totalSavings = sumCents(amountsOf('savings'));
  const totalFixed = sumCents(amountsOf('fixed'));
  const totalDebtPayments = sumCents(amountsOf('debt'));
  const totalOtherBills = sumCents(record.otherBills.map((b) => b.amountPaid));
  const totalExpenses = sumCents([totalFixed, totalDebtPayments, totalOtherBills]);
  const netDifference = subCents(subCents(totalIncome, totalExpenses), totalSavings);
  const outstandingBills = sumCents(record.otherBills.map((b) => maxCents(ZERO, subCents(b.amountDue, b.amountPaid))));

  const byCategory = expenseByCategory(record);
  const { biggest, smallest } = rankCategories(byCategory);

  const tracked = [...record.entries.map((e) => e.cleared), ...record.otherBills.map((b) => b.paid)];

  return {
    month: record.month,
    openingBalance: opening.amount,
    openingSource: opening.source,
    totalIncome,
    totalSavings,
    totalFixed,
    totalDebtPayments,
    totalOtherBills,
    totalExpenses,
    netDifference,
    balanceForward: addCents(opening.amount, netDifference),
    outstandingBills,
    byCategory,
    biggestCategory: biggest,
    smallestCategory: smallest,
    clearedCount: tracked.filter(Boolean).length,
    rowCount: tracked.length,
  };
};

export const expenseByCategory = (record: MonthRecord): Partial<Record<ExpenseCategory, Cents>> => {
  const totals: Partial<Record<ExpenseCategory, Cents>> = {};
  const add = (category: ExpenseCategory, amount: Cents): void => {
    totals[category] = addCents(totals[category] ?? ZERO, amount);
  };
  for (const entry of record.entries) {
    if (entry.kind === 'fixed') add(entry.category, entry.amount);
    if (entry.kind === 'debt') add('debt', entry.amount);
  }
  for (const bill of record.otherBills) {
    if (bill.amountPaid > 0) add(bill.category, bill.amountPaid);
  }
  return totals;
};

/** Biggest = max, smallest = min of non-zero buckets. Ties break alphabetically for stability. */
export const rankCategories = (
  byCategory: Partial<Record<ExpenseCategory, Cents>>,
): { biggest: ExpenseCategory | null; smallest: ExpenseCategory | null } => {
  const rows = Object.entries(byCategory)
    .flatMap(([category, amount]) => (amount && amount > 0 ? [{ category, amount }] : []))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  const biggest = rows[0];
  const smallest = rows.length > 0 ? [...rows].sort((a, b) => a.amount - b.amount || a.category.localeCompare(b.category))[0] : undefined;
  return {
    biggest: biggest ? toCategory(biggest.category) : null,
    smallest: smallest ? toCategory(smallest.category) : null,
  };
};

const toCategory = (value: string): ExpenseCategory | null =>
  EXPENSE_CATEGORIES.find((c) => c === value) ?? null;
