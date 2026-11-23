import { describe, expect, it } from 'vitest';
import { createDemoData } from '@/lib/demoData';
import { summarizeAllMonths } from './carryOver';
import { availableYears, summarizeYear } from './yearSummary';

describe('summarizeYear', () => {
  const demo = createDemoData(new Date('2026-11-22T10:00:00'));
  const summaries = summarizeAllMonths(demo.months, demo.profile.initialBalance);

  it('aggregates the full year with empty months as null', () => {
    const y = summarizeYear(summaries, 2026, 'full');
    expect(y.rows).toHaveLength(12);
    expect(y.recordedMonths).toBe(6);
    expect(y.rows[0]?.summary).toBeNull();
    const income = [...summaries.values()].reduce((a, s) => a + s.totalIncome, 0);
    expect(y.totals.income).toBe(income);
    expect(y.closingBalance).toBe(summaries.get('2026-11')?.balanceForward);
  });

  it('splits Jan–Jun and Jul–Dec', () => {
    const h1 = summarizeYear(summaries, 2026, 'h1');
    const h2 = summarizeYear(summaries, 2026, 'h2');
    expect(h1.rows.map((r) => r.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
    expect(h1.recordedMonths + h2.recordedMonths).toBe(6);
    expect(h1.totals.income + h2.totals.income).toBe(summarizeYear(summaries, 2026, 'full').totals.income);
  });

  it('builds a category matrix sorted by total with cumulative savings', () => {
    const y = summarizeYear(summaries, 2026, 'h2');
    const totals = y.categoryMatrix.map((r) => r.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    const last = y.cumulativeSavings.filter((v) => v !== null).at(-1);
    expect(last).toBe(y.totals.savings);
  });

  it('lists available years', () => {
    expect(availableYears(['2025-12', '2026-01'], 2027)).toEqual([2027, 2026, 2025]);
  });
});
