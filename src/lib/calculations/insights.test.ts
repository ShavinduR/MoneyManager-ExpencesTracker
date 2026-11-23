import { describe, expect, it } from 'vitest';
import { emptyMonth } from '@/lib/factories';
import { fromMajor } from '@/lib/money';
import { summarizeMonth } from './monthSummary';
import { categoryShares, savingsRate } from './insights';

describe('insights', () => {
  const record = {
    ...emptyMonth('2026-05'),
    entries: [
      { id: 'i', kind: 'income' as const, category: 'salary' as const, date: '2026-05-25', description: 'Pay', amount: fromMajor(100000), cleared: true },
      { id: 's', kind: 'savings' as const, category: 'goal-fund' as const, date: '2026-05-26', description: 'Save', amount: fromMajor(20000), cleared: true },
      { id: 'r', kind: 'fixed' as const, category: 'housing' as const, date: '2026-05-01', description: 'Rent', amount: fromMajor(30000), cleared: true },
      { id: 'f', kind: 'fixed' as const, category: 'food' as const, date: '2026-05-02', description: 'Food', amount: fromMajor(10000), cleared: true },
    ],
  };
  const summary = summarizeMonth(record, { amount: fromMajor(0), source: 'initial' });

  it('ranks category shares', () => {
    const shares = categoryShares(summary);
    expect(shares.map((s) => s.category)).toEqual(['housing', 'food']);
    expect(shares[0]?.share).toBeCloseTo(0.75);
  });

  it('computes savings rate', () => {
    expect(savingsRate(summary)).toBeCloseTo(0.2);
    expect(savingsRate(summarizeMonth(emptyMonth('2026-06'), { amount: fromMajor(0), source: 'initial' }))).toBeNull();
  });
});
