import { useIsDark } from '@/hooks/useTheme';

export const SERIES = {
  income: '#10b981',
  expenses: '#f59e0b',
  savings: '#0ea5e9',
  balance: '#6366f1',
  baseline: '#a1a1aa',
  accelerated: '#10b981',
} as const;

export type ChartTheme = { grid: string; axis: string; cursor: string };

export const useChartTheme = (): ChartTheme => {
  const dark = useIsDark();
  return dark
    ? { grid: '#1d2430', axis: '#71717a', cursor: 'rgba(255,255,255,0.04)' }
    : { grid: '#f0f0f2', axis: '#a1a1aa', cursor: 'rgba(0,0,0,0.035)' };
};

/** Shared axis props: compact ticks so LKR amounts never clip on 390px screens. */
export const AXIS_TICK = { fontSize: 11 } as const;
export const Y_AXIS_WIDTH = 44;
