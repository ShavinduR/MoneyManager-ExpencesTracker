import { describe, expect, it } from 'vitest';
import type { DebtAccount, MonthRecord } from '@/types/finance';
import { emptyMonth } from '@/lib/factories';
import { fromMajor } from '@/lib/money';
import { debtPaymentHistory, debtProgress } from './debt';

const debt: DebtAccount = {
  id: 'd1', creditor: 'Loan', accountRef: '1234', interestRateApr: 0, startingBalance: fromMajor(50000),
  startDate: '2026-01-01', minimumPayment: fromMajor(10000), goalPayoffDate: null, motivation: '', archived: false,
};

const pay = (id: string, date: string, amount: number, debtId: string | null = 'd1') =>
  ({ id, kind: 'debt' as const, category: 'debt' as const, debtId, notes: '', date, description: 'Pay', amount: fromMajor(amount), cleared: true });

describe('debt history', () => {
  const months: Record<string, MonthRecord> = {
    '2026-02': { ...emptyMonth('2026-02'), entries: [pay('b', '2026-02-05', 20000), pay('x', '2026-02-06', 999, 'other')] },
    '2026-01': { ...emptyMonth('2026-01'), entries: [pay('a', '2026-01-05', 10000)] },
    '2026-03': { ...emptyMonth('2026-03'), entries: [pay('c', '2026-03-05', 40000)] },
  };

  it('derives rows across months in date order, ignoring other debts', () => {
    const rows = debtPaymentHistory(debt, months);
    expect(rows.map((r) => r.entryId)).toEqual(['a', 'b', 'c']);
    expect(rows.map((r) => r.remainingBalance)).toEqual([fromMajor(40000), fromMajor(20000), fromMajor(0)]);
  });

  it('computes progress, flooring overpayment at zero', () => {
    const p = debtProgress(debt, debtPaymentHistory(debt, months));
    expect(p.totalPaid).toBe(fromMajor(70000));
    expect(p.remaining).toBe(0);
    expect(p.progress).toBe(1);
  });
});
