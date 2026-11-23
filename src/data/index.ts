import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';
import { IndexedDbRepository } from './indexedDbRepository';
import { LocalStorageRepository, localStorageWorks } from './localStorageRepository';
import { MemoryRepository } from './memoryRepository';
import type { FinanceRepository, LoadResult, StorageMode } from './repository';

/**
 * Picks the best available storage on first use: IndexedDB → localStorage → memory (H1).
 * Nothing runs at import time, so a browser that blocks storage can never white-screen the app.
 */
export class ResilientRepository implements FinanceRepository {
  mode: StorageMode = 'indexeddb';
  private chosen: Promise<FinanceRepository> | null = null;

  private pick(): Promise<FinanceRepository> {
    this.chosen ??= (async () => {
      if (typeof indexedDB !== 'undefined') {
        const idb = new IndexedDbRepository();
        try {
          await idb.open();
          this.mode = 'indexeddb';
          return idb;
        } catch {
          /* fall through */
        }
      }
      if (typeof localStorage !== 'undefined' && localStorageWorks()) {
        this.mode = 'localstorage';
        return new LocalStorageRepository();
      }
      this.mode = 'memory';
      return new MemoryRepository();
    })();
    return this.chosen;
  }

  async load(): Promise<LoadResult> {
    return (await this.pick()).load();
  }
  async exportRaw(): Promise<unknown> {
    return (await this.pick()).exportRaw();
  }
  async saveMonth(record: MonthRecord): Promise<void> {
    return (await this.pick()).saveMonth(record);
  }
  async deleteMonth(month: MonthKey): Promise<void> {
    return (await this.pick()).deleteMonth(month);
  }
  async saveDebts(debts: DebtAccount[]): Promise<void> {
    return (await this.pick()).saveDebts(debts);
  }
  async saveYearPlan(plan: YearPlan): Promise<void> {
    return (await this.pick()).saveYearPlan(plan);
  }
  async saveBankAccounts(accounts: BankAccount[]): Promise<void> {
    return (await this.pick()).saveBankAccounts(accounts);
  }
  async saveProfile(profile: Profile): Promise<void> {
    return (await this.pick()).saveProfile(profile);
  }
  async replaceAll(data: FinanceData): Promise<void> {
    return (await this.pick()).replaceAll(data);
  }
  async clear(): Promise<void> {
    return (await this.pick()).clear();
  }
}

export const createRepository = (): ResilientRepository => new ResilientRepository();

export type { FinanceRepository, LoadResult, StorageMode } from './repository';
