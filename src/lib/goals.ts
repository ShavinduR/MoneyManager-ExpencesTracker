import type { GoalStatus, YearlyGoal } from '@/types/finance';
import { GOAL_STATUSES } from '@/types/finance';

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  achieved: 'Achieved',
  paused: 'Paused',
};

export const isGoalStatus = (v: string): v is GoalStatus => GOAL_STATUSES.some((s) => s === v);

/** 0–1 progress for goals with a target amount; achieved goals count as complete. */
export const goalProgress = (goal: YearlyGoal): number | null => {
  if (goal.status === 'achieved') return 1;
  if (goal.targetAmount === null || goal.targetAmount <= 0) return null;
  return Math.min(1, Math.max(0, goal.currentAmount / goal.targetAmount));
};

export const goalStats = (goals: readonly YearlyGoal[]) => {
  const set = goals.filter((g) => g.title.trim());
  return {
    set: set.length,
    achieved: set.filter((g) => g.status === 'achieved').length,
    inProgress: set.filter((g) => g.status === 'in-progress').length,
  };
};
