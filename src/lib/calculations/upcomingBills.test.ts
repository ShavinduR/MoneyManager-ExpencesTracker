import { describe, expect, it } from 'vitest';
import { emptyMonth } from '@/lib/factories';
import { fromMajor } from '@/lib/money';
import { upcomingBills } from './upcomingBills';

const bill = (id: string, dueDate: string, paid = false) => ({
  id, name: id, dueDate, amountDue: fromMajor(100), amountPaid: fromMajor(0), paid, category: 'other' as const, notes: '',
});

describe('upcomingBills', () => {
  it('returns unpaid overdue and soon-due bills, soonest first', () => {
    const months = {
      '2026-10': { ...emptyMonth('2026-10'), otherBills: [bill('old', '2026-10-30'), bill('paid', '2026-10-01', true)] },
      '2026-11': { ...emptyMonth('2026-11'), otherBills: [bill('soon', '2026-11-25'), bill('later', '2026-12-20')] },
    };
    expect(upcomingBills(months, '2026-11-22').map((b) => b.id)).toEqual(['old', 'soon']);
  });
});
