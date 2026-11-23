import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';
import { emptyData } from '@/lib/factories';
import type { FinanceRepository, LoadResult } from './repository';
import { interpretStoredDocument } from './interpret';

const KEY = 'mfp-data';
const RECOVERY_KEY = 'mfp-data-recovery';

/** True when localStorage can actually be written (it throws in some privacy modes). */
export const localStorageWorks = (): boolean => {
  try {
    const probe = '__mfp_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

/**
 * Fallback when IndexedDB is unavailable. Whole-document writes; throws on quota errors so the
 * store can tell the user (M3).
 */
export class LocalStorageRepository implements FinanceRepository {
  private cache: FinanceData | null = null;

  async load(): Promise<LoadResult> {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { kind: 'empty' };
    let doc: unknown;
    try {
      doc = JSON.parse(raw);
    } catch {
      doc = raw;
    }
    const keepCopy = async (reason: string): Promise<void> => {
      if (localStorage.getItem(RECOVERY_KEY) === null) {
        try {
          localStorage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), reason, raw }));
        } catch {
          /* best effort */
        }
      }
    };
    const result = await interpretStoredDocument(doc, keepCopy);
    if (result.kind === 'loaded') this.cache = result.data;
    return result;
  }

  async exportRaw(): Promise<unknown> {
    return { app: 'mindset-finance-planner', kind: 'raw-recovery', exportedAt: new Date().toISOString(), current: localStorage.getItem(KEY), recoveryCopy: localStorage.getItem(RECOVERY_KEY) };
  }

  private async mutate(update: (data: FinanceData) => FinanceData): Promise<void> {
    // Start from an empty document if nothing was stored yet, so the first write is never dropped.
    this.cache = update(this.cache ?? emptyData());
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
    localStorage.setItem(KEY, JSON.stringify(data));
    this.cache = data;
  }

  async clear(): Promise<void> {
    this.cache = null;
    localStorage.removeItem(KEY);
    localStorage.removeItem(RECOVERY_KEY);
  }
}
