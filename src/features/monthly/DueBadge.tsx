import type { ISODate } from '@/types/finance';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { daysBetween, dueStatus, todayISO, type DueStatus } from '@/lib/dates';

const TONE: Record<DueStatus, BadgeTone> = { paid: 'green', overdue: 'red', 'due-soon': 'amber', upcoming: 'neutral' };

const label = (status: DueStatus, dueDate: ISODate): string => {
  const days = daysBetween(todayISO(), dueDate);
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'overdue':
      return days === -1 ? 'Overdue 1 day' : `Overdue ${-days} days`;
    case 'due-soon':
      return days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
    case 'upcoming':
      return days <= 14 ? `Due in ${days} days` : 'Upcoming';
  }
};

/** Status is conveyed by text, not color alone. */
export const DueBadge = ({ dueDate, paid }: { dueDate: ISODate; paid: boolean }) => {
  const status = dueStatus(dueDate, paid);
  return <Badge tone={TONE[status]}>{label(status, dueDate)}</Badge>;
};
