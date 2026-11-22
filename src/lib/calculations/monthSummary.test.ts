import { describe, expect, it } from 'vitest';
import type { MonthRecord } from '@/types/finance';
import { fromMajor } from '@/lib/money';
import { summarizeAllMonths } from './carryOver';
import { summarizeMonth } from './monthSummary';

const month = (key: string, overrides: Partial<MonthRecord> = {}): MonthRecord => ({
  month: key,
  openingBalanceOverride: null,
  goals: [],
  entries: [],
  otherBills: [],
  notes: '',
  reflection: '',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const sample = month('2026-01', {
  entries: [
    { id: '1', kind: 'income', category: 'salary', date: '2026-01-25', description: 'Salary', amount: fromMajor(100000), cleared: true },
    { id: '2', kind: 'savings', category: 'fixed-deposit', date: '2026-01-26', description: 'FD', amount: fromMajor(15000), cleared: true },
    { id: '3', kind: 'debt', category: 'debt', debtId: null, notes: '', date: '2026-01-05', description: 'Loan', amount: fromMajor(20000), cleared: true },
    { id: '4', kind: 'fixed', category: 'housing', date: '2026-01-01', description: 'Rent', amount: fromMajor(30000), cleared: false },
    { id: '5', kind: 'fixed', category: 'fuel', date: '2026-01-10', description: 'Petrol', amount: fromMajor(1500.5), cleared: true },
  ],
  otherBills: [
    { id: 'b1', name: 'Doctor', dueDate: '2026-01-15', amountDue: fromMajor(5000), amountPaid: fromMajor(3000), paid: false, category: 'health', notes: '' },
  ],
});

describe('summarizeMonth', () => {
  const s = summarizeMonth(sample, { amount: fromMajor(10000), source: 'initial' });

  it('totals each section', () => {
    expect(s.totalIncome).toBe(fromMajor(100000));
    expect(s.totalSavings).toBe(fromMajor(15000));
    expect(s.totalExpenses).toBe(fromMajor(20000 + 30000 + 1500.5 + 3000));
    expect(s.outstandingBills).toBe(fromMajor(2000));
    expect(s.unpaidBillCount).toBe(1);
    const settled = summarizeMonth(
      { ...sample, otherBills: sample.otherBills.map((b) => ({ ...b, paid: true })) },
      { amount: fromMajor(0), source: 'initial' },
    );
    expect(settled.outstandingBills).toBe(0);
    expect(s.incomeMinusExpenses).toBe(fromMajor(100000 - 54500.5));
  });

  it('balance forward = opening + income − expenses − savings', () => {
    expect(s.netDifference).toBe(fromMajor(100000 - 54500.5 - 15000));
    expect(s.balanceForward).toBe(fromMajor(10000 + 30499.5));
  });

  it('detects biggest and smallest spending areas', () => {
    expect(s.biggestCategory).toBe('housing');
    expect(s.smallestCategory).toBe('fuel');
    expect(s.clearedCount).toBe(4);
    expect(s.rowCount).toBe(6);
  });
});

describe('summarizeAllMonths (carry-over)', () => {
  it('carries balance forward, skipping gaps, and respects overrides', () => {
    const income = (id: string, d: string, amt: number) =>
      ({ id, kind: 'income', category: 'salary', date: d, description: 'Pay', amount: fromMajor(amt), cleared: true }) as const;
    const all = summarizeAllMonths(
      {
        '2026-01': month('2026-01', { entries: [income('a', '2026-01-01', 1000)] }),
        '2026-03': month('2026-03', { entries: [income('b', '2026-03-01', 500)] }),
        '2026-04': month('2026-04', { openingBalanceOverride: fromMajor(99) }),
      },
      fromMajor(200),
    );
    expect(all.get('2026-01')?.openingSource).toBe('initial');
    expect(all.get('2026-01')?.balanceForward).toBe(fromMajor(1200));
    expect(all.get('2026-03')?.openingBalance).toBe(fromMajor(1200));
    expect(all.get('2026-03')?.openingSource).toBe('carried');
    expect(all.get('2026-04')?.openingBalance).toBe(fromMajor(99));
    expect(all.get('2026-04')?.openingSource).toBe('override');
  });
});
