import { describe, expect, it } from 'vitest';
import { createDemoData } from '@/lib/demoData';
import { salvageFinanceData } from './salvage';

const demo = createDemoData(new Date('2026-11-22T10:00:00'));
const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(demo));
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('fixture missing');
  return value;
};

describe('salvageFinanceData', () => {
  it('returns valid data unchanged with no issues', () => {
    expect(salvageFinanceData(clone())).toEqual({ data: demo, issues: [] });
  });

  it('keeps every valid profile field when one is invalid', () => {
    const doc = clone();
    const profile = doc.profile as Record<string, unknown>;
    profile.currency = 'XYZ';
    const { data, issues } = salvageFinanceData(doc);
    expect(data.profile.currency).toBe('LKR');
    expect(data.profile.name).toBe(demo.profile.name);
    expect(data.profile.initialBalance).toBe(demo.profile.initialBalance);
    expect(issues).toHaveLength(1);
  });

  it('drops only the broken debt, account and goal', () => {
    const doc = clone();
    must((doc.debts as Record<string, unknown>[])[0]).interestRateApr = 'lots';
    must((doc.bankAccounts as Record<string, unknown>[])[1]).cardLast4 = '4111111111111111';
    const plan = must(Object.values(doc.yearPlans as Record<string, { goals: Record<string, unknown>[] }>)[0]);
    must(plan.goals[0]).currentAmount = -1;
    const { data, issues } = salvageFinanceData(doc);
    expect(data.debts).toHaveLength(1);
    expect(data.bankAccounts).toHaveLength(3);
    const goals = must(Object.values(data.yearPlans)[0]).goals;
    expect(goals).toHaveLength(8);
    expect(must(goals[0]).title).toBe('');
    expect(issues).toHaveLength(3);
  });

  it('a whole-month record without a valid month key is skipped and reported', () => {
    const doc = clone();
    (doc.months as Record<string, unknown>)['oops'] = { month: 'not-a-month' };
    const { data, issues } = salvageFinanceData(doc);
    expect(Object.keys(data.months)).toHaveLength(6);
    expect(issues[0]).toMatch(/couldn’t be identified/);
  });
});
