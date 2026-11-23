import type { Cents, ExpenseCategory, MonthKey, MonthSummary } from '@/types/finance';
import { EXPENSE_CATEGORIES } from '@/types/finance';
import { makeMonthKey, MONTH_LABELS_SHORT } from '@/lib/dates';
import { addCents, sumCents, ZERO } from '@/lib/money';

export type YearRange = 'full' | 'h1' | 'h2';

export const RANGE_MONTHS: Record<YearRange, readonly number[]> = {
  full: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  h1: [1, 2, 3, 4, 5, 6],
  h2: [7, 8, 9, 10, 11, 12],
};

export type YearMonthRow = { month: MonthKey; label: string; summary: MonthSummary | null };

export type CategoryRow = { category: ExpenseCategory; values: (Cents | null)[]; total: Cents };

export type YearSummary = {
  year: number;
  range: YearRange;
  rows: YearMonthRow[];
  totals: { income: Cents; expenses: Cents; savings: Cents; net: Cents; debtPayments: Cents };
  /** Balance forward of the last recorded month in range (the planner's "Balance" row end value). */
  closingBalance: Cents | null;
  recordedMonths: number;
  categoryMatrix: CategoryRow[];
  /** Savings accumulated month by month within the range. */
  cumulativeSavings: (Cents | null)[];
};

export const summarizeYear = (summaries: Map<MonthKey, MonthSummary>, year: number, range: YearRange): YearSummary => {
  const rows: YearMonthRow[] = RANGE_MONTHS[range].map((m) => {
    const month = makeMonthKey(year, m);
    return { month, label: MONTH_LABELS_SHORT[m - 1] ?? '', summary: summaries.get(month) ?? null };
  });
  const recorded = rows.flatMap((r) => (r.summary ? [r.summary] : []));
  const total = (pick: (s: MonthSummary) => Cents): Cents => sumCents(recorded.map(pick));

  const categoryMatrix: CategoryRow[] = EXPENSE_CATEGORIES.flatMap((category) => {
    const values = rows.map((r) => (r.summary ? (r.summary.byCategory[category] ?? null) : null));
    const rowTotal = sumCents(values.flatMap((v) => (v === null ? [] : [v])));
    return rowTotal > 0 ? [{ category, values, total: rowTotal }] : [];
  }).sort((a, b) => b.total - a.total);

  let running: Cents = ZERO;
  const cumulativeSavings = rows.map((r) => {
    if (!r.summary) return null;
    running = addCents(running, r.summary.totalSavings);
    return running;
  });

  return {
    year,
    range,
    rows,
    totals: {
      income: total((s) => s.totalIncome),
      expenses: total((s) => s.totalExpenses),
      savings: total((s) => s.totalSavings),
      net: total((s) => s.netDifference),
      debtPayments: total((s) => s.totalDebtPayments),
    },
    closingBalance: recorded.at(-1)?.balanceForward ?? null,
    recordedMonths: recorded.length,
    categoryMatrix,
    cumulativeSavings,
  };
};
