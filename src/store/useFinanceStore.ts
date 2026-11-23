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
import { createRepository, type FinanceRepository } from '@/data';
import { emptyData, emptyMonth, emptyYearPlan, newId } from '@/lib/factories';
import { createDemoData } from '@/lib/demoData';
import { monthKeyOf } from '@/lib/dates';
import { upsertEntry } from '@/lib/monthOps';
import type { QuickEntryDraft } from '@/lib/quickEntry/parser';
import { assertNever } from '@/lib/assertNever';

type Status = 'loading' | 'ready' | 'error';

type FinanceState = {
  status: Status;
  data: FinanceData;
  /** True once the user has any data (demo or real); drives the welcome state. */
  hasData: boolean;
  hydrate: () => Promise<void>;
  updateMonth: (month: MonthKey, updater: (record: MonthRecord) => MonthRecord) => void;
  addFromDraft: (draft: QuickEntryDraft) => MonthlyEntry;
  updateProfile: (patch: Partial<Profile>) => void;
  setDebts: (updater: (debts: DebtAccount[]) => DebtAccount[]) => void;
  /** Deletes the account and unlinks (but keeps) its payments in the monthly tables. */
  deleteDebt: (id: string) => void;
  setBankAccounts: (updater: (accounts: BankAccount[]) => BankAccount[]) => void;
  updateYearPlan: (year: number, updater: (plan: YearPlan) => YearPlan) => void;
  replaceAll: (data: FinanceData) => Promise<void>;
  loadDemo: () => Promise<void>;
  resetAll: () => Promise<void>;
};

const repository: FinanceRepository = createRepository();

/** Optimistic writes: update memory first, persist in the background, surface failures in the console. */
const persist = (task: Promise<void>): void => {
  task.catch((error: unknown) => console.error('Failed to save', error));
};

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

export const useFinanceStore = create<FinanceState>((set, get) => ({
  status: 'loading',
  data: emptyData(),
  hasData: false,

  hydrate: async () => {
    try {
      const stored = await repository.load();
      if (stored) {
        set({ data: stored, hasData: true, status: 'ready' });
      } else {
        const fresh = emptyData();
        await repository.replaceAll(fresh);
        set({ data: fresh, hasData: false, status: 'ready' });
      }
    } catch (error) {
      console.error(error);
      set({ status: 'error' });
    }
  },

  updateMonth: (month, updater) => {
    const { data } = get();
    const current = data.months[month] ?? emptyMonth(month);
    const next: MonthRecord = { ...updater(current), month, updatedAt: new Date().toISOString() };
    set({ data: { ...data, months: { ...data.months, [month]: next } }, hasData: true });
    persist(repository.saveMonth(next));
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
    persist(repository.saveProfile(profile));
  },

  setDebts: (updater) => {
    const { data } = get();
    const debts = updater(data.debts);
    set({ data: { ...data, debts }, hasData: true });
    persist(repository.saveDebts(debts));
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
    persist(repository.saveBankAccounts(bankAccounts));
  },

  updateYearPlan: (year, updater) => {
    const { data } = get();
    const plan = updater(data.yearPlans[String(year)] ?? emptyYearPlan(year));
    set({ data: { ...data, yearPlans: { ...data.yearPlans, [String(year)]: plan } }, hasData: true });
    persist(repository.saveYearPlan(plan));
  },

  replaceAll: async (data) => {
    await repository.replaceAll(data);
    set({ data, hasData: Object.keys(data.months).length > 0 || data.debts.length > 0 });
  },

  loadDemo: async () => {
    const { profile } = get().data;
    const demo = createDemoData();
    // Keep the user's display preferences when exploring the demo.
    await get().replaceAll({ ...demo, profile: { ...demo.profile, theme: profile.theme } });
  },

  resetAll: async () => {
    const fresh = emptyData();
    await repository.replaceAll(fresh);
    set({ data: fresh, hasData: false });
  },
}));
