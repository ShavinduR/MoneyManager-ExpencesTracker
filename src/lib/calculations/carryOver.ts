import type { Cents, MonthKey, MonthRecord, MonthSummary } from '@/types/finance';
import { summarizeMonth } from './monthSummary';

/**
 * Resolve every recorded month's summary in one forward pass:
 *   opening(m) = override(m) ?? balanceForward(previous recorded month) ?? initialBalance
 * Skipped months don't reset the balance: the nearest earlier recorded month carries forward.
 */
export const summarizeAllMonths = (
  months: Record<MonthKey, MonthRecord>,
  initialBalance: Cents,
): Map<MonthKey, MonthSummary> => {
  const result = new Map<MonthKey, MonthSummary>();
  const keys = Object.keys(months).sort();
  let previous: MonthSummary | null = null;
  for (const key of keys) {
    const record = months[key];
    if (!record) continue;
    const opening: { amount: Cents; source: MonthSummary['openingSource'] } =
      record.openingBalanceOverride !== null
        ? { amount: record.openingBalanceOverride, source: 'override' }
        : previous
          ? { amount: previous.balanceForward, source: 'carried' }
          : { amount: initialBalance, source: 'initial' };
    const summary = summarizeMonth(record, opening);
    result.set(key, summary);
    previous = summary;
  }
  return result;
};

/** Opening balance a not-yet-created month would get (for previewing an empty month). */
export const projectedOpening = (
  summaries: Map<MonthKey, MonthSummary>,
  month: MonthKey,
  initialBalance: Cents,
): { amount: Cents; source: MonthSummary['openingSource'] } => {
  const earlier = [...summaries.keys()].filter((k) => k < month).sort();
  const last = earlier.at(-1);
  const summary = last ? summaries.get(last) : undefined;
  return summary ? { amount: summary.balanceForward, source: 'carried' } : { amount: initialBalance, source: 'initial' };
};
