import type { Id, MonthGoal, MonthRecord, MonthlyEntry, OtherBill } from '@/types/finance';

/** Pure, immutable edits on a MonthRecord. The store wraps these and persists the result. */

const byDate = <T extends { date: string }>(a: T, b: T): number => a.date.localeCompare(b.date);

export const upsertEntry = (record: MonthRecord, entry: MonthlyEntry): MonthRecord => {
  const exists = record.entries.some((e) => e.id === entry.id);
  const entries = exists ? record.entries.map((e) => (e.id === entry.id ? entry : e)) : [...record.entries, entry];
  return { ...record, entries: [...entries].sort(byDate) };
};

export const removeEntry = (record: MonthRecord, id: Id): MonthRecord => ({
  ...record,
  entries: record.entries.filter((e) => e.id !== id),
});

export const toggleEntryCleared = (record: MonthRecord, id: Id): MonthRecord => ({
  ...record,
  entries: record.entries.map((e) => (e.id === id ? { ...e, cleared: !e.cleared } : e)),
});

export const updateGoal = (record: MonthRecord, id: Id, patch: Partial<Omit<MonthGoal, 'id'>>): MonthRecord => ({
  ...record,
  goals: record.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
});

export const addGoal = (record: MonthRecord, goal: MonthGoal): MonthRecord => ({ ...record, goals: [...record.goals, goal] });

export const removeGoal = (record: MonthRecord, id: Id): MonthRecord => ({
  ...record,
  goals: record.goals.filter((g) => g.id !== id),
});

export const upsertBill = (record: MonthRecord, bill: OtherBill): MonthRecord => {
  const exists = record.otherBills.some((b) => b.id === bill.id);
  const otherBills = exists ? record.otherBills.map((b) => (b.id === bill.id ? bill : b)) : [...record.otherBills, bill];
  return { ...record, otherBills: [...otherBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) };
};

export const removeBill = (record: MonthRecord, id: Id): MonthRecord => ({
  ...record,
  otherBills: record.otherBills.filter((b) => b.id !== id),
});

/** Toggling a bill to paid fills amountPaid with amountDue when nothing was entered yet. */
export const toggleBillPaid = (record: MonthRecord, id: Id): MonthRecord => ({
  ...record,
  otherBills: record.otherBills.map((b) => {
    if (b.id !== id) return b;
    const paid = !b.paid;
    return { ...b, paid, amountPaid: paid && b.amountPaid === 0 ? b.amountDue : b.amountPaid };
  }),
});
