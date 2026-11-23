import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck2, Gauge, PiggyBank, Target, Timer } from 'lucide-react';
import type { Cents, DebtAccount } from '@/types/finance';
import { Card, CardHeader } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { Badge } from '@/components/ui/Badge';
import { DebtBalanceChart } from '@/components/charts/DebtBalanceChart';
import { comparePayoff, requiredMonthlyPayment, type PayoffResult } from '@/lib/calculations/payoffSimulator';
import { currentMonthKey, formatMonthLong, monthKeyOf, parseMonthKey } from '@/lib/dates';
import { cents, fromMajor, parseMoney, toMajor } from '@/lib/money';
import { cn } from '@/lib/cn';

const monthsBetween = (from: string, to: string): number => {
  const a = parseMonthKey(from);
  const b = parseMonthKey(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
};

const durationLabel = (months: number): string => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ') || '0 mo';
};

const ResultTile = ({ title, result, highlight }: { title: string; result: PayoffResult; highlight?: boolean }) => (
  <div className={cn('rounded-2xl p-4', highlight ? 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20' : 'bg-zinc-50 dark:bg-ink-850')}>
    <p className="text-xs font-medium text-zinc-500">{title}</p>
    {result.kind === 'paid-off' ? (
      <>
        <p className="mt-1 text-lg font-semibold tracking-tight">{formatMonthLong(result.payoffMonth)}</p>
        <p className="text-xs text-zinc-500">{durationLabel(result.months)} · interest <Money value={result.totalInterest} /></p>
      </>
    ) : result.kind === 'never' ? (
      <>
        <p className="mt-1 text-lg font-semibold tracking-tight text-red-600 dark:text-red-400">Never</p>
        <p className="text-xs text-zinc-500">
          {result.reason === 'too-long' ? 'Takes over 50 years' : result.reason === 'invalid-input' ? 'Check the rate and amounts' : 'Payment doesn’t cover interest'}
        </p>
      </>
    ) : (
      <p className="mt-1 text-lg font-semibold">Paid off 🎉</p>
    )}
  </div>
);

type Props = { debt: DebtAccount; remaining: Cents };

export const PayoffSimulator = ({ debt, remaining }: Props) => {
  const [extraMajor, setExtraMajor] = useState(() => Math.round(toMajor(debt.minimumPayment) / 2 / 500) * 500);
  const startMonth = currentMonthKey();
  const sliderMax = Math.max(50_000, Math.ceil((toMajor(debt.minimumPayment) * 3) / 5000) * 5000);
  const extra = fromMajor(extraMajor);
  const interestFree = debt.interestRateApr === 0;

  const comparison = useMemo(
    () => comparePayoff({ balance: remaining, aprPercent: debt.interestRateApr, monthlyPayment: debt.minimumPayment, extraPayment: extra, startMonth }),
    [remaining, debt.interestRateApr, debt.minimumPayment, extra, startMonth],
  );

  const goalMonth = debt.goalPayoffDate ? monthKeyOf(debt.goalPayoffDate) : null;
  const monthsToGoal = goalMonth ? monthsBetween(startMonth, goalMonth) : null;
  const neededForGoal = monthsToGoal !== null && monthsToGoal > 0 ? requiredMonthlyPayment(remaining, debt.interestRateApr, monthsToGoal) : null;
  const accelerated = comparison.accelerated;
  const onTrack = goalMonth && accelerated.kind === 'paid-off' ? accelerated.payoffMonth <= goalMonth : null;
  const firstInterest =
    comparison.baseline.kind === 'never' && comparison.baseline.reason === 'payment-below-interest' ? comparison.baseline.firstMonthInterest : null;

  if (remaining <= 0) return null;

  return (
    <Card>
      <CardHeader
        title="Payoff simulator"
        subtitle="What if I pay a little extra each month?"
        icon={<Gauge className="size-4" />}
        action={interestFree ? <Badge tone="green">0% interest</Badge> : <Badge tone={debt.interestRateApr >= 20 ? 'red' : 'amber'}>{debt.interestRateApr}% APR</Badge>}
      />
      <div className="space-y-5 p-4 sm:p-5">
        {firstInterest !== null && (
          <div className="flex gap-2.5 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">
            <AlertTriangle className="size-4 shrink-0" />
            <p>
              The minimum payment of <Money value={debt.minimumPayment} className="font-semibold" /> doesn’t cover the monthly interest of{' '}
              <Money value={firstInterest} className="font-semibold" />, so this balance will keep growing. Pay at least{' '}
              <Money value={cents(firstInterest + 100)} className="font-semibold" /> a month to start making progress.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-end justify-between gap-3">
            <label htmlFor={`extra-${debt.id}`} className="text-sm font-medium">Extra per month</label>
            <div className="flex items-center gap-1 rounded-xl border border-zinc-200 px-2.5 py-1 dark:border-ink-700">
              <span className="text-xs text-zinc-500">+</span>
              <input
                aria-label="Extra monthly payment amount"
                value={extraMajor}
                onChange={(e) => {
                  const parsed = parseMoney(e.target.value || '0');
                  if (parsed !== null) setExtraMajor(Math.min(toMajor(parsed), 10_000_000));
                }}
                inputMode="decimal"
                className="w-24 bg-transparent text-right text-sm font-semibold tabular focus:outline-none"
              />
            </div>
          </div>
          <input
            id={`extra-${debt.id}`}
            type="range"
            min={0}
            max={sliderMax}
            step={500}
            value={Math.min(extraMajor, sliderMax)}
            onChange={(e) => setExtraMajor(Number(e.target.value))}
            className="mt-3 w-full accent-emerald-500"
          />
          <div className="mt-1 flex justify-between text-[11px] text-zinc-500 tabular">
            <span>Min only</span>
            <span>
              Paying <Money value={cents(debt.minimumPayment + extra)} className="font-medium text-zinc-700 dark:text-zinc-300" /> / month
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ResultTile title="Minimum payment only" result={comparison.baseline} />
          <ResultTile title="With extra payment" result={accelerated} highlight={accelerated.kind === 'paid-off'} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <PiggyBank className="mt-0.5 size-4 text-emerald-500" />
            <div>
              <p className="text-xs text-zinc-500">Interest saved</p>
              {comparison.interestSaved !== null ? (
                <Money value={comparison.interestSaved} className="font-semibold" />
              ) : (
                <span className="font-semibold">{comparison.baseline.kind === 'never' && accelerated.kind === 'paid-off' ? 'Escapes the debt trap' : '—'}</span>
              )}
              {interestFree && <p className="text-[11px] text-zinc-500">Interest-free: extra only shortens the term</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Timer className="mt-0.5 size-4 text-sky-500" />
            <div>
              <p className="text-xs text-zinc-500">Time saved</p>
              <span className="font-semibold">{comparison.monthsSaved !== null ? durationLabel(comparison.monthsSaved) : '—'}</span>
            </div>
          </div>
          {goalMonth && (
            <div className="col-span-2 flex items-start gap-2 sm:col-span-1">
              {onTrack ? <CalendarCheck2 className="mt-0.5 size-4 text-emerald-500" /> : <Target className="mt-0.5 size-4 text-amber-500" />}
              <div>
                <p className="text-xs text-zinc-500">Goal: {formatMonthLong(goalMonth)}</p>
                {onTrack ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">On track ✓</span>
                ) : neededForGoal !== null ? (
                  <span className="font-semibold">
                    Pay <Money value={cents(Math.ceil(neededForGoal / 100) * 100)} />/mo
                  </span>
                ) : (
                  <span className="font-semibold text-zinc-500">Goal date has passed</span>
                )}
              </div>
            </div>
          )}
        </div>

        <DebtBalanceChart baseline={comparison.baseline} accelerated={accelerated} />
      </div>
    </Card>
  );
};
