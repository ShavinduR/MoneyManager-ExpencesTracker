import type { Cents, MonthKey, MonthRecord, MonthSummary } from '@/types/finance';
import { summarizeAllMonths } from '@/lib/calculations/carryOver';
import { useFinanceStore } from './useFinanceStore';

/**
 * Memoize the forward carry-over pass on the identity of the months object + initial balance.
 * Every month edit creates a new `months` object, so this recomputes exactly when needed.
 */
let cache: { months: Record<MonthKey, MonthRecord>; initial: Cents; result: Map<MonthKey, MonthSummary> } | null = null;

export const selectSummaries = (months: Record<MonthKey, MonthRecord>, initial: Cents): Map<MonthKey, MonthSummary> => {
  if (cache && cache.months === months && cache.initial === initial) return cache.result;
  const result = summarizeAllMonths(months, initial);
  cache = { months, initial, result };
  return result;
};

export const useMonthSummaries = (): Map<MonthKey, MonthSummary> => {
  const months = useFinanceStore((s) => s.data.months);
  const initial = useFinanceStore((s) => s.data.profile.initialBalance);
  return selectSummaries(months, initial);
};

export const useCurrency = () => useFinanceStore((s) => s.data.profile.currency);
