import { useMemo } from 'react';
import type { MonthKey, MonthRecord, MonthSummary } from '@/types/finance';
import { emptyMonth } from '@/lib/factories';
import { projectedOpening } from '@/lib/calculations/carryOver';
import { summarizeMonth } from '@/lib/calculations/monthSummary';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useMonthSummaries } from '@/store/selectors';

export type MonthView = { record: MonthRecord; summary: MonthSummary; previousMonth: MonthKey | null; exists: boolean };

/** Record + summary for any month, including months not created yet (shown with a projected opening balance). */
export const useMonthView = (month: MonthKey): MonthView => {
  const stored = useFinanceStore((s) => s.data.months[month]);
  const initial = useFinanceStore((s) => s.data.profile.initialBalance);
  const summaries = useMonthSummaries();

  return useMemo(() => {
    const previousMonth = [...summaries.keys()].filter((k) => k < month).sort().at(-1) ?? null;
    const existing = summaries.get(month);
    if (stored && existing) return { record: stored, summary: existing, previousMonth, exists: true };
    const record = emptyMonth(month);
    return { record, summary: summarizeMonth(record, projectedOpening(summaries, month, initial)), previousMonth, exists: false };
  }, [stored, summaries, month, initial]);
};
