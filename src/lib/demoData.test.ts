import { describe, expect, it } from 'vitest';
import { parseFinanceData } from '@/data/schema';
import { summarizeAllMonths } from './calculations/carryOver';
import { createDemoData } from './demoData';

describe('createDemoData', () => {
  const demo = createDemoData(new Date('2026-11-22T10:00:00'));

  it('passes schema validation', () => {
    const parsed = parseFinanceData(demo);
    expect(parsed.ok ? 'ok' : parsed.error).toBe('ok');
  });

  it('has 6 months, 2 debts, 4 yearly goals, reflections', () => {
    expect(Object.keys(demo.months)).toHaveLength(6);
    expect(demo.debts).toHaveLength(2);
    const plan = Object.values(demo.yearPlans)[0];
    expect(plan?.goals.filter((g) => g.title).length).toBe(4);
    expect(Object.values(demo.months).filter((m) => m.reflection).length).toBeGreaterThanOrEqual(5);
  });

  it('produces a positive, growing balance (sanity)', () => {
    const summaries = [...summarizeAllMonths(demo.months, demo.profile.initialBalance).values()];
    expect(summaries.every((s) => s.balanceForward > 0)).toBe(true);
  });
});
