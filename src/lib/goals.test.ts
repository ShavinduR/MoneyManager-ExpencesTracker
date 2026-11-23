import { describe, expect, it } from 'vitest';
import { emptyYearlyGoal } from './factories';
import { fromMajor } from './money';
import { goalProgress, goalStats } from './goals';

describe('goals', () => {
  it('computes progress from target and current amount', () => {
    const g = { ...emptyYearlyGoal(1), title: 'Fund', targetAmount: fromMajor(300000), currentAmount: fromMajor(195000), status: 'in-progress' as const };
    expect(goalProgress(g)).toBeCloseTo(0.65);
    expect(goalProgress({ ...g, currentAmount: fromMajor(400000) })).toBe(1);
    expect(goalProgress({ ...g, targetAmount: null })).toBeNull();
    expect(goalProgress({ ...g, targetAmount: null, status: 'achieved' })).toBe(1);
  });

  it('counts only goals with a title', () => {
    const goals = [
      { ...emptyYearlyGoal(1), title: 'A', status: 'achieved' as const },
      { ...emptyYearlyGoal(2), title: 'B', status: 'in-progress' as const },
      emptyYearlyGoal(3),
    ];
    expect(goalStats(goals)).toEqual({ set: 2, achieved: 1, inProgress: 1 });
  });
});
