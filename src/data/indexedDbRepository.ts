import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';
import { SCHEMA_VERSION } from '@/types/finance';
import type { FinanceRepository, LoadResult, RecoverySnapshot } from './repository';
import { interpretStoredDocument } from './interpret';

type KvValue =
  | { key: 'profile'; value: Profile }
  | { key: 'debts'; value: DebtAccount[] }
  | { key: 'bankAccounts'; value: BankAccount[] }
  | { key: 'schemaVersion'; value: number };

interface PlannerDB extends DBSchema {
  months: { key: MonthKey; value: MonthRecord };
  yearPlans: { key: number; value: YearPlan };
  kv: { key: KvValue['key']; value: KvValue };
  /** Raw copies taken whenever stored data couldn't be fully read. Never read back into the app. */
  recovery: { key: number; value: RecoverySnapshot };
}

const DB_NAME = 'mindset-finance-planner';
const DB_VERSION = 2;
const OPEN_TIMEOUT_MS = 5_000;
const MAX_RECOVERY_COPIES = 5;

export class IndexedDbRepository implements FinanceRepository {
  private db: Promise<IDBPDatabase<PlannerDB>> | null = null;

  /**
   * Opens lazily. `indexedDB.open` can THROW synchronously (blocked storage, some privacy modes):
   * that is converted into a rejected promise so callers can fall back instead of crashing (H1).
   */
  open(): Promise<IDBPDatabase<PlannerDB>> {
    if (this.db) return this.db;
    let opening: Promise<IDBPDatabase<PlannerDB>>;
    try {
      opening = openDB<PlannerDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          if (oldVersion < 1) {
            db.createObjectStore('months', { keyPath: 'month' });
            db.createObjectStore('yearPlans', { keyPath: 'year' });
            db.createObjectStore('kv', { keyPath: 'key' });
          }
          if (oldVersion < 2) db.createObjectStore('recovery', { autoIncrement: true });
        },
      });
    } catch (error) {
      opening = Promise.reject(error);
    }
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('IndexedDB did not open in time')), OPEN_TIMEOUT_MS);
    });
    this.db = Promise.race([opening, timeout]);
    // Allow a later retry if this attempt failed.
    this.db.catch(() => {
      this.db = null;
    });
    return this.db;
  }

  private async readRaw(db: IDBPDatabase<PlannerDB>) {
    const [kv, months, yearPlans] = await Promise.all([db.getAll('kv'), db.getAll('months'), db.getAll('yearPlans')]);
    const kvValue = (key: KvValue['key']): unknown => kv.find((row) => row.key === key)?.value;
    return {
      isEmpty: kv.length === 0 && months.length === 0 && yearPlans.length === 0,
      doc: {
        schemaVersion: kvValue('schemaVersion') ?? SCHEMA_VERSION,
        profile: kvValue('profile'),
        months: Object.fromEntries(months.map((m, i) => [typeof m?.month === 'string' ? m.month : `invalid-${i}`, m])),
        debts: kvValue('debts') ?? [],
        bankAccounts: kvValue('bankAccounts') ?? [],
        yearPlans: Object.fromEntries(yearPlans.map((p, i) => [String(p?.year ?? `invalid-${i}`), p])),
      },
    };
  }

  async load(): Promise<LoadResult> {
    const db = await this.open();
    const { isEmpty, doc } = await this.readRaw(db);
    if (isEmpty) return { kind: 'empty' };
    return interpretStoredDocument(doc, (reason) => this.keepRecoveryCopy(db, doc, reason));
  }

  /** Additive only: stores a raw copy unless it is identical to the latest one; keeps the newest few. */
  private async keepRecoveryCopy(db: IDBPDatabase<PlannerDB>, raw: unknown, reason: string): Promise<void> {
    try {
      const tx = db.transaction('recovery', 'readwrite');
      const keys = await tx.store.getAllKeys();
      const lastKey = keys.at(-1);
      const last = lastKey === undefined ? undefined : await tx.store.get(lastKey);
      if (!last || JSON.stringify(last.raw) !== JSON.stringify(raw)) {
        await tx.store.add({ savedAt: new Date().toISOString(), reason, raw });
        const excess = keys.length + 1 - MAX_RECOVERY_COPIES;
        for (const key of keys.slice(0, Math.max(0, excess))) await tx.store.delete(key);
      }
      await tx.done;
    } catch {
      /* best effort: a failed recovery copy must never block loading */
    }
  }

  async exportRaw(): Promise<unknown> {
    const db = await this.open();
    const { doc } = await this.readRaw(db);
    return { app: 'mindset-finance-planner', kind: 'raw-recovery', exportedAt: new Date().toISOString(), current: doc, recoveryCopies: await db.getAll('recovery') };
  }

  async saveMonth(record: MonthRecord): Promise<void> {
    await (await this.open()).put('months', record);
  }

  async deleteMonth(month: MonthKey): Promise<void> {
    await (await this.open()).delete('months', month);
  }

  async saveDebts(debts: DebtAccount[]): Promise<void> {
    await (await this.open()).put('kv', { key: 'debts', value: debts });
  }

  async saveYearPlan(plan: YearPlan): Promise<void> {
    await (await this.open()).put('yearPlans', plan);
  }

  async saveBankAccounts(accounts: BankAccount[]): Promise<void> {
    await (await this.open()).put('kv', { key: 'bankAccounts', value: accounts });
  }

  async saveProfile(profile: Profile): Promise<void> {
    await (await this.open()).put('kv', { key: 'profile', value: profile });
  }

  async replaceAll(data: FinanceData): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(['months', 'yearPlans', 'kv'], 'readwrite');
    await Promise.all([tx.objectStore('months').clear(), tx.objectStore('yearPlans').clear(), tx.objectStore('kv').clear()]);
    await Promise.all([
      ...Object.values(data.months).map((m) => tx.objectStore('months').put(m)),
      ...Object.values(data.yearPlans).map((p) => tx.objectStore('yearPlans').put(p)),
      tx.objectStore('kv').put({ key: 'profile', value: data.profile }),
      tx.objectStore('kv').put({ key: 'debts', value: data.debts }),
      tx.objectStore('kv').put({ key: 'bankAccounts', value: data.bankAccounts }),
      tx.objectStore('kv').put({ key: 'schemaVersion', value: data.schemaVersion }),
    ]);
    await tx.done;
  }

  /** User-initiated reset. Recovery copies are cleared too, since the user asked to delete everything. */
  async clear(): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(['months', 'yearPlans', 'kv', 'recovery'], 'readwrite');
    await Promise.all([
      tx.objectStore('months').clear(),
      tx.objectStore('yearPlans').clear(),
      tx.objectStore('kv').clear(),
      tx.objectStore('recovery').clear(),
    ]);
    await tx.done;
  }
}
