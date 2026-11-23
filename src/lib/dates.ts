import type { ISODate, MonthKey } from '@/types/finance';

export const MONTH_LABELS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const MONTH_LABELS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const isMonthKey = (value: string): value is MonthKey => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export const isISODate = (value: string): value is ISODate => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && toISODate(date) === value;
};

export const makeMonthKey = (year: number, month1to12: number): MonthKey => `${year}-${pad2(month1to12)}`;

export const toISODate = (date: Date): ISODate =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const todayISO = (): ISODate => toISODate(new Date());

export const currentMonthKey = (now: Date = new Date()): MonthKey => makeMonthKey(now.getFullYear(), now.getMonth() + 1);

export const parseMonthKey = (key: MonthKey): { year: number; month: number } => {
  const [y, m] = key.split('-');
  return { year: Number(y), month: Number(m) };
};

export const monthKeyOf = (date: ISODate): MonthKey => date.slice(0, 7);

export const shiftMonth = (key: MonthKey, delta: number): MonthKey => {
  const { year, month } = parseMonthKey(key);
  const zeroBased = year * 12 + (month - 1) + delta;
  return makeMonthKey(Math.floor(zeroBased / 12), (zeroBased % 12) + 1);
};

export const addDays = (date: ISODate, days: number): ISODate => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const daysBetween = (from: ISODate, to: ISODate): number => {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
};

export const daysInMonth = (key: MonthKey): number => {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0).getDate();
};

/** Clamp a day number into a month: (2026-02, 31) → 2026-02-28 */
export const dateInMonth = (key: MonthKey, day: number): ISODate =>
  `${key}-${pad2(Math.min(Math.max(1, day), daysInMonth(key)))}`;

export const formatMonthLong = (key: MonthKey): string => {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_LABELS_LONG[month - 1] ?? ''} ${year}`;
};

export const formatDateShort = (date: ISODate): string => {
  const [, m, d] = date.split('-');
  return `${MONTH_LABELS_SHORT[Number(m) - 1] ?? ''} ${Number(d)}`;
};

export type DueStatus = 'paid' | 'overdue' | 'due-soon' | 'upcoming';

export const dueStatus = (dueDate: ISODate, paid: boolean, today: ISODate = todayISO()): DueStatus => {
  if (paid) return 'paid';
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due-soon';
  return 'upcoming';
};
