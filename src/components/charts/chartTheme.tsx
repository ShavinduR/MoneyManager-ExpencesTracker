import { useIsDark } from '@/hooks/useTheme';

export const SERIES = {
  income: '#10b981',
  expenses: '#f59e0b',
  savings: '#0ea5e9',
  balance: '#6366f1',
  baseline: '#a1a1aa',
  accelerated: '#10b981',
} as const;

export type ChartTheme = { grid: string; axis: string; cursor: string; legend: string };

export const useChartTheme = (): ChartTheme => {
  const dark = useIsDark();
  return dark
    ? { grid: '#1d2430', axis: '#a1a1aa', cursor: 'rgba(255,255,255,0.04)', legend: '#d4d4d8' }
    : { grid: '#f0f0f2', axis: '#5f5f67', cursor: 'rgba(0,0,0,0.035)', legend: '#3f3f46' };
};

/**
 * Axis ticks and legend labels use neutral text colours that meet WCAG AA (audit H5); series colours
 * appear only in the legend dots and the marks themselves.
 */
export const legendFormatter = (color: string) => (value: string) => <span style={{ color }}>{value}</span>;

/** Shared axis props: compact ticks so LKR amounts never clip on 390px screens. */
export const AXIS_TICK = { fontSize: 11 } as const;
export const Y_AXIS_WIDTH = 44;
