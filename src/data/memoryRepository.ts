import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';
import { emptyData } from '@/lib/factories';
import type { FinanceRepository, LoadResult } from './repository';

/** Last-resort adapter when the browser allows no storage at all: the app works, but nothing survives a reload. */
export class MemoryRepository implements FinanceRepository {
  private data: FinanceData | null = null;

  async load(): Promise<LoadResult> {
    return this.data ? { kind: 'loaded', data: this.data, issues: [] } : { kind: 'empty' };
  }

  async exportRaw(): Promise<unknown> {
    return this.data;
  }

  private mutate(update: (data: FinanceData) => FinanceData): Promise<void> {
    this.data = update(this.data ?? emptyData());
    return Promise.resolve();
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
    this.data = data;
  }

  async clear(): Promise<void> {
    this.data = null;
  }
}
