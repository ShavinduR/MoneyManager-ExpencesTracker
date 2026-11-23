import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';

/**
 * Result of reading storage. Loading NEVER writes user data and never turns a failure into "empty":
 * - `empty`: nothing has ever been saved on this device.
 * - `loaded`: data was read; `issues` lists records that couldn't be read (a raw copy was kept).
 * - `unreadable`: storage exists but can't be interpreted (e.g. written by a newer app version).
 */
export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; data: FinanceData; issues: string[] }
  | { kind: 'unreadable'; error: string };

/**
 * Persistence seam. The store only talks to this contract, so a future HttpRepository
 * (Express + MongoDB) can replace IndexedDB without touching UI code.
 */
export interface FinanceRepository {
  load(): Promise<LoadResult>;
  /** Everything in storage, unvalidated, for the "download raw data" recovery path. */
  exportRaw(): Promise<unknown>;
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

export type StorageMode = 'indexeddb' | 'localstorage' | 'memory';

export type RecoverySnapshot = { savedAt: string; reason: string; raw: unknown };
