import type {
  FinanceData,
  GoalSlot,
  MonthGoal,
  MonthKey,
  MonthRecord,
  Profile,
  YearPlan,
  YearlyGoal,
} from '@/types/finance';
import { SCHEMA_VERSION } from '@/types/finance';
import { ZERO } from './money';

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const MIN_MONTH_GOALS = 5;

export const emptyGoal = (): MonthGoal => ({ id: newId(), text: '', done: false });

export const emptyMonth = (month: MonthKey): MonthRecord => ({
  month,
  openingBalanceOverride: null,
  goals: Array.from({ length: MIN_MONTH_GOALS }, emptyGoal),
  entries: [],
  otherBills: [],
  notes: '',
  reflection: '',
  updatedAt: new Date().toISOString(),
});

export const GOAL_SLOTS: readonly GoalSlot[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const emptyYearlyGoal = (slot: GoalSlot): YearlyGoal => ({
  id: newId(),
  slot,
  title: '',
  targetAmount: null,
  currentAmount: ZERO,
  status: 'not-started',
  notes: '',
});

export const emptyYearPlan = (year: number): YearPlan => ({
  year,
  commitment: '',
  mindMap: '',
  goals: GOAL_SLOTS.map(emptyYearlyGoal),
});

export const defaultProfile = (): Profile => ({
  name: '',
  email: '',
  phone: '',
  city: '',
  country: 'Sri Lanka',
  currency: 'LKR',
  theme: 'system',
  initialBalance: ZERO,
  llmEnabled: false,
});

export const emptyData = (): FinanceData => ({
  schemaVersion: SCHEMA_VERSION,
  profile: defaultProfile(),
  months: {},
  debts: [],
  yearPlans: {},
  bankAccounts: [],
});
