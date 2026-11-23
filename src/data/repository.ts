import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';

/**
 * Persistence seam. The store only talks to this contract, so a future HttpRepository
 * (Express + MongoDB) can replace IndexedDB without touching UI code.
 */
export interface FinanceRepository {
  load(): Promise<FinanceData | null>;
  saveMonth(record: MonthRecord): Promise<void>;
  deleteMonth(month: MonthKey): Promise<void>;
  saveDebts(debts: DebtAccount[]): Promise<void>;
  saveYearPlan(plan: YearPlan): Promise<void>;
  saveBankAccounts(accounts: BankAccount[]): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
  /** Import / demo data / reset. */
  replaceAll(data: FinanceData): Promise<void>;
  clear(): Promise<void>;
}
