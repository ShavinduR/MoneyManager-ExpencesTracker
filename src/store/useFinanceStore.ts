import { create } from 'zustand';
import type {
  BankAccount,
  DebtAccount,
  FinanceData,
  MonthKey,
  MonthRecord,
  MonthlyEntry,
  Profile,
  YearPlan,
} from '@/types/finance';
import { createRepository, type LoadResult, type StorageMode } from '@/data';
import { startCrossTabSync, type SyncHandle } from '@/data/sync';
import { emptyData, emptyMonth, emptyYearPlan, newId } from '@/lib/factories';
import { createDemoData } from '@/lib/demoData';
import { monthKeyOf } from '@/lib/dates';
import { upsertEntry } from '@/lib/monthOps';
import type { QuickEntryDraft } from '@/lib/quickEntry/parser';
import { assertNever } from '@/lib/assertNever';

/**
 * - `loading`: reading storage.
 * - `ready`: normal operation.
 * - `unreadable`: storage exists but can't be interpreted; the app shows a recovery screen and writes NOTHING.
 */
type Status = 'loading' | 'ready' | 'unreadable';

export type SaveError = { message: string; retry: () => void };

type FinanceState = {
  status: Status;
  data: FinanceData;
  /** True once the user has any data (demo or real); drives the welcome state. */
  hasData: boolean;
  storageMode: StorageMode;
  /** Records that couldn't be read on load (a raw recovery copy was kept). */
  loadIssues: string[];
  unreadableReason: string | null;
  saveError: SaveError | null;
  hydrate: () => Promise<void>;
  /** Re-reads storage, e.g. after another tab saved. Deferred while this tab has writes in flight. */
  reloadFromStorage: () => Promise<void>;
  exportRawData: () => Promise<unknown>;
  dismissLoadIssues: () => void;
  updateMonth: (month: MonthKey, updater: (record: MonthRecord) => MonthRecord) => void;
  addFromDraft: (draft: QuickEntryDraft) => MonthlyEntry;
  updateProfile: (patch: Partial<Profile>) => void;
  setDebts: (updater: (debts: DebtAccount[]) => DebtAccount[]) => void;
  /** Deletes the account and unlinks (but keeps) its payments in the monthly tables. */
  deleteDebt: (id: string) => void;
  setBankAccounts: (updater: (accounts: BankAccount[]) => BankAccount[]) => void;
  updateYearPlan: (year: number, updater: (plan: YearPlan) => YearPlan) => void;
  /** These three throw on failure so the caller can tell the user. */
  replaceAll: (data: FinanceData) => Promise<void>;
  loadDemo: () => Promise<void>;
  resetAll: () => Promise<void>;
};

const repository = createRepository();

/** Whether the user has created anything yet: drives the welcome screen (a stored empty profile doesn't count). */
export const hasContent = (data: FinanceData): boolean =>
  Object.keys(data.months).length > 0 || data.debts.length > 0 || data.bankAccounts.length > 0 || Object.keys(data.yearPlans).length > 0;

const describeSaveFailure = (error: unknown): string =>
  error instanceof DOMException && error.name === 'QuotaExceededError'
    ? 'Your last change couldn’t be saved: this device is out of storage space. Export a backup, then free up space.'
    : 'Your last change couldn’t be saved. It’s still on screen. Retry, or export a backup so nothing is lost.';

// ---- Write tracking & cross-tab sync (module state; browser only) ----
let pendingWrites = 0;
let reloadQueued = false;
let sync: SyncHandle | null = null;

export const draftToEntry = (draft: QuickEntryDraft): MonthlyEntry => {
  const base = { id: newId(), date: draft.date, description: draft.description, amount: draft.amount, cleared: true };
  const t = draft.target;
  switch (t.kind) {
    case 'income':
      return { ...base, kind: 'income', category: t.category };
    case 'savings':
      return { ...base, kind: 'savings', category: t.category };
    case 'debt':
      return { ...base, kind: 'debt', category: 'debt', debtId: draft.debtId, notes: '' };
    case 'fixed':
      return { ...base, kind: 'fixed', category: t.category };
    default:
      return assertNever(t);
  }
};

export const useFinanceStore = create<FinanceState>((set, get) => {
  /**
   * Optimistic writes: memory updates first, storage in the background. Failures are surfaced in the UI
   * with a retry (M3) instead of only being logged. Successful writes notify other tabs (H2).
   */
  const persist = (task: () => Promise<void>): void => {
    pendingWrites += 1;
    task()
      .then(() => {
        sync?.notify();
        if (get().saveError) set({ saveError: null });
      })
      .catch((error: unknown) => {
        set({ saveError: { message: describeSaveFailure(error), retry: () => persist(task) } });
      })
      .finally(() => {
        pendingWrites -= 1;
        if (pendingWrites === 0 && reloadQueued) {
          reloadQueued = false;
          void get().reloadFromStorage();
        }
      });
  };

  const applyLoad = (result: LoadResult): void => {
    switch (result.kind) {
      case 'empty':
        // Nothing stored yet: start fresh in memory. Nothing is written until the user creates something.
        set({ data: emptyData(), hasData: false, status: 'ready', unreadableReason: null });
        return;
      case 'loaded':
        set({ data: result.data, hasData: hasContent(result.data), status: 'ready', loadIssues: result.issues, unreadableReason: null });
        return;
      case 'unreadable':
        set({ status: 'unreadable', unreadableReason: result.error });
        return;
      default:
        assertNever(result);
    }
  };

  return {
    status: 'loading',
    data: emptyData(),
    hasData: false,
    storageMode: 'indexeddb',
    loadIssues: [],
    unreadableReason: null,
    saveError: null,

    hydrate: async () => {
      let result: LoadResult;
      try {
        result = await repository.load();
      } catch (error) {
        result = { kind: 'unreadable', error: error instanceof Error ? error.message : 'Storage could not be read.' };
      }
      set({ storageMode: repository.mode });
      applyLoad(result);

      if (typeof window !== 'undefined' && !sync) {
        sync = startCrossTabSync(() => void get().reloadFromStorage());
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void get().reloadFromStorage();
        });
      }
    },

    reloadFromStorage: async () => {
      if (get().status !== 'ready') return;
      if (pendingWrites > 0) {
        reloadQueued = true;
        return;
      }
      try {
        const result = await repository.load();
        // A write may have started while reading; its data is newer than what was read.
        if (pendingWrites > 0) {
          reloadQueued = true;
          return;
        }
        applyLoad(result);
      } catch {
        /* keep current in-memory data */
      }
    },

    exportRawData: () => repository.exportRaw(),

    dismissLoadIssues: () => set({ loadIssues: [] }),

    updateMonth: (month, updater) => {
      const { data } = get();
      const current = data.months[month] ?? emptyMonth(month);
      const next: MonthRecord = { ...updater(current), month, updatedAt: new Date().toISOString() };
      set({ data: { ...data, months: { ...data.months, [month]: next } }, hasData: true });
      persist(() => repository.saveMonth(next));
    },

    addFromDraft: (draft) => {
      const entry = draftToEntry(draft);
      get().updateMonth(monthKeyOf(draft.date), (record) => upsertEntry(record, entry));
      return entry;
    },

    updateProfile: (patch) => {
      const { data } = get();
      const profile = { ...data.profile, ...patch };
      set({ data: { ...data, profile } });
      persist(() => repository.saveProfile(profile));
    },

    setDebts: (updater) => {
      const { data } = get();
      const debts = updater(data.debts);
      set({ data: { ...data, debts }, hasData: true });
      persist(() => repository.saveDebts(debts));
    },

    deleteDebt: (id) => {
      const { data } = get();
      const affected = Object.values(data.months).filter((m) => m.entries.some((e) => e.kind === 'debt' && e.debtId === id));
      for (const record of affected) {
        get().updateMonth(record.month, (r) => ({
          ...r,
          entries: r.entries.map((e) => (e.kind === 'debt' && e.debtId === id ? { ...e, debtId: null } : e)),
        }));
      }
      get().setDebts((debts) => debts.filter((d) => d.id !== id));
    },

    setBankAccounts: (updater) => {
      const { data } = get();
      const bankAccounts = updater(data.bankAccounts);
      set({ data: { ...data, bankAccounts }, hasData: true });
      persist(() => repository.saveBankAccounts(bankAccounts));
    },

    updateYearPlan: (year, updater) => {
      const { data } = get();
      const plan = updater(data.yearPlans[String(year)] ?? emptyYearPlan(year));
      set({ data: { ...data, yearPlans: { ...data.yearPlans, [String(year)]: plan } }, hasData: true });
      persist(() => repository.saveYearPlan(plan));
    },

    replaceAll: async (data) => {
      await repository.replaceAll(data);
      set({ data, hasData: hasContent(data), loadIssues: [], saveError: null });
      sync?.notify();
    },

    loadDemo: async () => {
      const { profile } = get().data;
      const demo = createDemoData();
      // Keep the user's display preferences when exploring the demo.
      await get().replaceAll({ ...demo, profile: { ...demo.profile, theme: profile.theme } });
    },

    resetAll: async () => {
      await repository.clear();
      set({ data: emptyData(), hasData: false, loadIssues: [], saveError: null });
      sync?.notify();
    },
  };
});
