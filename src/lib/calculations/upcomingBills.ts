import type { ISODate, MonthKey, MonthRecord, OtherBill } from '@/types/finance';
import { addDays } from '@/lib/dates';

export type UpcomingBill = OtherBill & { month: MonthKey };

/** Unpaid bills that are overdue or due within `horizonDays`, soonest first. */
export const upcomingBills = (months: Record<MonthKey, MonthRecord>, today: ISODate, horizonDays = 7): UpcomingBill[] => {
  const horizon = addDays(today, horizonDays);
  return Object.values(months)
    .flatMap((record) => record.otherBills.map((bill) => ({ ...bill, month: record.month })))
    .filter((bill) => !bill.paid && bill.dueDate <= horizon)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};
