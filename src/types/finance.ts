/**
 * Domain model for the Mindset Finance Planner.
 * Stored types live here; derived (computed) types are at the bottom and are never persisted.
 */

/** Integer minor units (cents). Construct only through helpers in `lib/money.ts`. */
export type Cents = number & { readonly __brand: 'Cents' };
/** "YYYY-MM", validated by `isMonthKey` in `lib/dates.ts`. */
export type MonthKey = string;
/** "YYYY-MM-DD". */
export type ISODate = string;
export type Id = string;

export const CURRENCY_CODES = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

// ---------- Categories ----------

export const EXPENSE_CATEGORIES = [
  'housing',
  'utilities',
  'groceries',
  'food',
  'transport',
  'fuel',
  'health',
  'education',
  'insurance',
  'subscriptions',
  'phone-internet',
  'shopping',
  'entertainment',
  'family',
  'gifts-donations',
  'personal-care',
  'debt',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const INCOME_CATEGORIES = ['salary', 'freelance', 'business', 'interest', 'gift', 'other-income'] as const;
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const SAVINGS_CATEGORIES = [
  'emergency-fund',
  'fixed-deposit',
  'investment',
  'goal-fund',
  'other-savings',
] as const;
export type SavingsCategory = (typeof SAVINGS_CATEGORIES)[number];

// ---------- Monthly workspace ----------

export const ENTRY_KINDS = ['income', 'savings', 'debt', 'fixed'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

type EntryBase = {
  id: Id;
  date: ISODate;
  /** "Source" for income/savings, description otherwise. */
  description: string;
  amount: Cents;
  /** Paid / cleared / received toggle (the ○ in the paper planner). */
  cleared: boolean;
};

export type IncomeEntry = EntryBase & { kind: 'income'; category: IncomeCategory };
export type SavingsEntry = EntryBase & { kind: 'savings'; category: SavingsCategory };
export type DebtEntry = EntryBase & { kind: 'debt'; category: 'debt'; debtId: Id | null; notes: string };
export type FixedEntry = EntryBase & { kind: 'fixed'; category: ExpenseCategory };

export type MonthlyEntry = IncomeEntry | SavingsEntry | DebtEntry | FixedEntry;

export type OtherBill = {
  id: Id;
  name: string;
  dueDate: ISODate;
  amountDue: Cents;
  amountPaid: Cents;
  paid: boolean;
  category: ExpenseCategory;
  notes: string;
};

export type MonthGoal = { id: Id; text: string; done: boolean };

export type MonthRecord = {
  month: MonthKey;
  /** null = carry over automatically from the previous recorded month. */
  openingBalanceOverride: Cents | null;
  goals: MonthGoal[];
  entries: MonthlyEntry[];
  otherBills: OtherBill[];
  notes: string;
  /** "This month taught me..." */
  reflection: string;
  updatedAt: string;
};

// ---------- Debts ----------

export type DebtAccount = {
  id: Id;
  creditor: string;
  /** Last 4 characters only, rendered "•••• 4821". */
  accountRef: string | null;
  /** Annual percentage rate, e.g. 18.5 */
  interestRateApr: number;
  startingBalance: Cents;
  startDate: ISODate;
  minimumPayment: Cents;
  goalPayoffDate: ISODate | null;
  /** "Why I'm doing this..." */
  motivation: string;
  archived: boolean;
};

// ---------- Yearly goals ----------

export const GOAL_STATUSES = ['not-started', 'in-progress', 'achieved', 'paused'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export type GoalSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type YearlyGoal = {
  id: Id;
  slot: GoalSlot;
  title: string;
  targetAmount: Cents | null;
  currentAmount: Cents;
  status: GoalStatus;
  notes: string;
};

export type YearPlan = {
  year: number;
  /** "This year, I will..." */
  commitment: string;
  goals: YearlyGoal[];
  /** Free-form "My Mind Map" page from the paper planner. */
  mindMap: string;
};

// ---------- Bank accounts (security-by-design) ----------

export const ACCOUNT_TYPES = ['savings', 'current', 'credit', 'wallet'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Deliberately has NO password, login note, security hint or access-code hint fields.
 * See README "Security by design".
 */
export type BankAccount = {
  id: Id;
  name: string;
  institution: string;
  type: AccountType;
  branch: string;
  /** Exactly 4 digits or null. Never a full card/account number. */
  cardLast4: string | null;
  currentBalance: Cents;
  notes: string;
};

// ---------- Profile & root ----------

export type Profile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  theme: ThemePreference;
  /** Opening balance for the very first recorded month. */
  initialBalance: Cents;
  llmEnabled: boolean;
};

export const SCHEMA_VERSION = 1;

export type FinanceData = {
  schemaVersion: typeof SCHEMA_VERSION;
  profile: Profile;
  months: Record<MonthKey, MonthRecord>;
  debts: DebtAccount[];
  yearPlans: Record<string, YearPlan>;
  bankAccounts: BankAccount[];
};

export type BackupEnvelope = {
  app: 'mindset-finance-planner';
  exportedAt: string;
  data: FinanceData;
};

// ---------- Derived (never stored) ----------

export type OpeningSource = 'override' | 'carried' | 'initial';

export type MonthSummary = {
  month: MonthKey;
  openingBalance: Cents;
  openingSource: OpeningSource;
  totalIncome: Cents;
  totalSavings: Cents;
  totalFixed: Cents;
  totalDebtPayments: Cents;
  totalOtherBills: Cents;
  /** fixed + debt payments + other bills (amount paid) */
  totalExpenses: Cents;
  /** income − expenses (the planner's "Difference" row) */
  incomeMinusExpenses: Cents;
  /** income − expenses − savings */
  netDifference: Cents;
  /** opening + netDifference */
  balanceForward: Cents;
  /** Σ max(0, amountDue − amountPaid) */
  outstandingBills: Cents;
  unpaidBillCount: number;
  byCategory: Partial<Record<ExpenseCategory, Cents>>;
  biggestCategory: ExpenseCategory | null;
  smallestCategory: ExpenseCategory | null;
  clearedCount: number;
  rowCount: number;
};
