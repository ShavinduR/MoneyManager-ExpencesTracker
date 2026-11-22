import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';
import type { FinanceRepository } from './repository';
import { parseFinanceData } from './schema';

const KEY = 'mfp-data';

/** Fallback for browsers where IndexedDB is unavailable (e.g. some private modes). Whole-document writes. */
export class LocalStorageRepository implements FinanceRepository {
  private cache: FinanceData | null = null;

  async load(): Promise<FinanceData | null> {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const parsed = parseFinanceData(JSON.parse(raw));
      this.cache = parsed.ok ? parsed.value : null;
    } catch {
      this.cache = null;
    }
    return this.cache;
  }

  private async mutate(update: (data: FinanceData) => FinanceData): Promise<void> {
    const current = this.cache ?? (await this.load());
    if (!current) return;
    this.cache = update(current);
    localStorage.setItem(KEY, JSON.stringify(this.cache));
  }

  saveMonth(record: MonthRecord): Promise<void> {
    return this.mutate((d) => ({ ...d, months: { ...d.months, [record.month]: record } }));
  }

  deleteMonth(month: MonthKey): Promise<void> {
    return this.mutate((d) => {
      const months = { ...d.months };
      delete months[month];
      return { ...d, months };
    });
  }

  saveDebts(debts: DebtAccount[]): Promise<void> {
    return this.mutate((d) => ({ ...d, debts }));
  }

  saveYearPlan(plan: YearPlan): Promise<void> {
    return this.mutate((d) => ({ ...d, yearPlans: { ...d.yearPlans, [String(plan.year)]: plan } }));
  }

  saveBankAccounts(accounts: BankAccount[]): Promise<void> {
    return this.mutate((d) => ({ ...d, bankAccounts: accounts }));
  }

  saveProfile(profile: Profile): Promise<void> {
    return this.mutate((d) => ({ ...d, profile }));
  }

  async replaceAll(data: FinanceData): Promise<void> {
    this.cache = data;
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  async clear(): Promise<void> {
    this.cache = null;
    localStorage.removeItem(KEY);
  }
}
