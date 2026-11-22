import type { Cents, ExpenseCategory, MonthSummary } from '@/types/finance';
import { EXPENSE_CATEGORIES } from '@/types/finance';

export type CategoryShare = { category: ExpenseCategory; amount: Cents; share: number };

/** Category buckets sorted by amount, each with its share of total expenses (0–1). */
export const categoryShares = (summary: MonthSummary): CategoryShare[] =>
  EXPENSE_CATEGORIES.flatMap((category) => {
    const amount = summary.byCategory[category];
    return amount && amount > 0
      ? [{ category, amount, share: summary.totalExpenses > 0 ? amount / summary.totalExpenses : 0 }]
      : [];
  }).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));

/** Savings as a share of income (0–1), or null when there is no income. */
export const savingsRate = (summary: MonthSummary): number | null =>
  summary.totalIncome > 0 ? summary.totalSavings / summary.totalIncome : null;
