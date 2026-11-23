import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BankAccount, DebtAccount, FinanceData, MonthKey, MonthRecord, Profile, YearPlan } from '@/types/finance';
import { SCHEMA_VERSION } from '@/types/finance';
import type { FinanceRepository } from './repository';
import { parseAndMigrate } from './schema';

type KvValue =
  | { key: 'profile'; value: Profile }
  | { key: 'debts'; value: DebtAccount[] }
  | { key: 'bankAccounts'; value: BankAccount[] }
  | { key: 'schemaVersion'; value: number };

interface PlannerDB extends DBSchema {
  months: { key: MonthKey; value: MonthRecord };
  yearPlans: { key: number; value: YearPlan };
  kv: { key: KvValue['key']; value: KvValue };
}

const DB_NAME = 'mindset-finance-planner';

export class IndexedDbRepository implements FinanceRepository {
  private db: Promise<IDBPDatabase<PlannerDB>>;

  constructor() {
    this.db = openDB<PlannerDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('months', { keyPath: 'month' });
        db.createObjectStore('yearPlans', { keyPath: 'year' });
        db.createObjectStore('kv', { keyPath: 'key' });
      },
    });
  }

  async load(): Promise<FinanceData | null> {
    const db = await this.db;
    const [profile, debts, bankAccounts, months, yearPlans] = await Promise.all([
      db.get('kv', 'profile'),
      db.get('kv', 'debts'),
      db.get('kv', 'bankAccounts'),
      db.getAll('months'),
      db.getAll('yearPlans'),
    ]);
    if (!profile || profile.key !== 'profile') return null;
    const version = await db.get('kv', 'schemaVersion');
    const candidate = {
      schemaVersion: version?.key === 'schemaVersion' ? version.value : SCHEMA_VERSION,
      profile: profile.value,
      months: Object.fromEntries(months.map((m) => [m.month, m])),
      debts: debts?.key === 'debts' ? debts.value : [],
      yearPlans: Object.fromEntries(yearPlans.map((p) => [String(p.year), p])),
      bankAccounts: bankAccounts?.key === 'bankAccounts' ? bankAccounts.value : [],
    };
    const parsed = parseAndMigrate(candidate);
    if (!parsed.ok) {
      console.error('Stored data failed validation:', parsed.error);
      return null;
    }
    return parsed.value;
  }

  async saveMonth(record: MonthRecord): Promise<void> {
    await (await this.db).put('months', record);
  }

  async deleteMonth(month: MonthKey): Promise<void> {
    await (await this.db).delete('months', month);
  }

  async saveDebts(debts: DebtAccount[]): Promise<void> {
    await (await this.db).put('kv', { key: 'debts', value: debts });
  }

  async saveYearPlan(plan: YearPlan): Promise<void> {
    await (await this.db).put('yearPlans', plan);
  }

  async saveBankAccounts(accounts: BankAccount[]): Promise<void> {
    await (await this.db).put('kv', { key: 'bankAccounts', value: accounts });
  }

  async saveProfile(profile: Profile): Promise<void> {
    await (await this.db).put('kv', { key: 'profile', value: profile });
  }

  async replaceAll(data: FinanceData): Promise<void> {
    const db = await this.db;
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

  async clear(): Promise<void> {
    const db = await this.db;
    const tx = db.transaction(['months', 'yearPlans', 'kv'], 'readwrite');
    await Promise.all([tx.objectStore('months').clear(), tx.objectStore('yearPlans').clear(), tx.objectStore('kv').clear()]);
    await tx.done;
  }
}
