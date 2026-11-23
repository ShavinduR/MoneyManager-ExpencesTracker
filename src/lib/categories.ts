import type { EntryKind, ExpenseCategory, IncomeCategory, SavingsCategory } from '@/types/finance';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES } from '@/types/finance';

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing & Rent',
  utilities: 'Utilities',
  groceries: 'Groceries',
  food: 'Food & Dining',
  transport: 'Transport',
  fuel: 'Fuel',
  health: 'Health',
  education: 'Education',
  insurance: 'Insurance',
  subscriptions: 'Subscriptions',
  'phone-internet': 'Phone & Internet',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  family: 'Family',
  'gifts-donations': 'Gifts & Donations',
  'personal-care': 'Personal Care',
  debt: 'Debt Payments',
  other: 'Other',
};

export const INCOME_LABELS: Record<IncomeCategory, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  business: 'Business',
  interest: 'Interest',
  gift: 'Gift',
  'other-income': 'Other Income',
};

export const SAVINGS_LABELS: Record<SavingsCategory, string> = {
  'emergency-fund': 'Emergency Fund',
  'fixed-deposit': 'Fixed Deposit',
  investment: 'Investment',
  'goal-fund': 'Goal Fund',
  'other-savings': 'Other Savings',
};

export const KIND_LABELS: Record<EntryKind, string> = {
  income: 'Income',
  savings: 'Savings',
  debt: 'Debt Payment',
  fixed: 'Expense / Bill',
};

/** Fixed, colorblind-friendly-ish palette for category charts (light & dark legible). */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  housing: '#6366f1',
  utilities: '#0ea5e9',
  groceries: '#10b981',
  food: '#f59e0b',
  transport: '#8b5cf6',
  fuel: '#ef4444',
  health: '#ec4899',
  education: '#14b8a6',
  insurance: '#64748b',
  subscriptions: '#a855f7',
  'phone-internet': '#06b6d4',
  shopping: '#f97316',
  entertainment: '#eab308',
  family: '#84cc16',
  'gifts-donations': '#d946ef',
  'personal-care': '#fb7185',
  debt: '#dc2626',
  other: '#94a3b8',
};

export const expenseCategoryOptions = EXPENSE_CATEGORIES.filter((c) => c !== 'debt').map((value) => ({
  value,
  label: EXPENSE_LABELS[value],
}));
export const incomeCategoryOptions = INCOME_CATEGORIES.map((value) => ({ value, label: INCOME_LABELS[value] }));
export const savingsCategoryOptions = SAVINGS_CATEGORIES.map((value) => ({ value, label: SAVINGS_LABELS[value] }));

export const isExpenseCategory = (v: string): v is ExpenseCategory =>
  EXPENSE_CATEGORIES.some((c) => c === v);
export const isIncomeCategory = (v: string): v is IncomeCategory => INCOME_CATEGORIES.some((c) => c === v);
export const isSavingsCategory = (v: string): v is SavingsCategory =>
  SAVINGS_CATEGORIES.some((c) => c === v);

export const categoryLabel = (kind: EntryKind, category: string): string => {
  if (kind === 'income' && isIncomeCategory(category)) return INCOME_LABELS[category];
  if (kind === 'savings' && isSavingsCategory(category)) return SAVINGS_LABELS[category];
  if (isExpenseCategory(category)) return EXPENSE_LABELS[category];
  return category;
};
