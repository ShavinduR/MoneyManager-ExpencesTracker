import { ChevronsRight, Crown, Feather, Receipt } from 'lucide-react';
import type { Cents, MonthSummary } from '@/types/finance';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { CATEGORY_COLORS, EXPENSE_LABELS } from '@/lib/categories';
import { categoryShares, savingsRate } from '@/lib/calculations/insights';
import { cn } from '@/lib/cn';

type RowProps = { label: string; value: Cents; operator?: '+' | '−' | '='; emphasis?: boolean; signed?: boolean };

const Row = ({ label, value, operator, emphasis, signed }: RowProps) => (
  <div className={cn('flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5', emphasis && 'bg-zinc-900 text-white dark:bg-ink-800')}>
    <span className={cn('flex items-center gap-2 text-sm', emphasis ? 'font-semibold' : 'text-zinc-600 dark:text-zinc-400')}>
      <span className={cn('w-3 text-center font-mono text-xs', emphasis ? 'text-accent-400' : 'text-zinc-400')} aria-hidden>
        {operator ?? ''}
      </span>
      {label}
    </span>
    <Money
      value={value}
      signed={signed}
      tone={signed ? 'auto' : 'none'}
      className={cn('text-sm', emphasis ? 'text-base font-semibold' : 'font-medium', emphasis && signed && value >= 0 && 'text-accent-400')}
    />
  </div>
);

const SpendingArea = ({ title, icon, category, amount, share }: { title: string; icon: React.ReactNode; category: MonthSummary['biggestCategory']; amount: Cents | null; share: number | null }) => (
  <div className="flex-1 px-4 py-4 sm:px-5">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
      {icon}
      {title}
    </p>
    {category && amount !== null ? (
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-base font-semibold tracking-tight">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
            {EXPENSE_LABELS[category]}
          </p>
          {share !== null && <p className="mt-0.5 text-xs text-zinc-500 tabular">{Math.round(share * 100)}% of expenses</p>}
        </div>
        <Money value={amount} className="text-sm font-medium" />
      </div>
    ) : (
      <p className="mt-2 text-sm text-zinc-400">Add expenses to see this</p>
    )}
  </div>
);

/** The planner's "This Month's Financial Overview", calculated automatically. */
export const OverviewCard = ({ summary }: { summary: MonthSummary }) => {
  const shares = categoryShares(summary);
  const biggest = shares.find((s) => s.category === summary.biggestCategory) ?? null;
  const smallest = shares.find((s) => s.category === summary.smallestCategory) ?? null;
  const rate = savingsRate(summary);

  return (
    <Card className="overflow-hidden lg:col-span-2">
      <div className="flex items-center gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
        <ChevronsRight className="size-4 text-accent-500" />
        <h2 className="text-[15px] font-semibold tracking-tight">This month’s financial overview</h2>
        <span className="ml-auto text-[11px] text-zinc-500">Calculated automatically</span>
      </div>

      <div className="mt-4 grid border-t border-zinc-100 md:grid-cols-2 dark:border-ink-800">
        <div className="divide-y divide-zinc-100 md:border-r dark:divide-ink-800 dark:border-ink-800">
          <Row label="Opening balance" value={summary.openingBalance} />
          <Row label="Total income" value={summary.totalIncome} operator="+" />
          <Row label="Total expenses" value={summary.totalExpenses} operator="−" />
          <Row label="Difference" value={summary.incomeMinusExpenses} operator="=" signed />
          <Row label="Total savings" value={summary.totalSavings} operator="−" />
          <Row label="Balance forward" value={summary.balanceForward} operator="=" emphasis />
        </div>

        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-ink-800">
          <SpendingArea title="My biggest spending area" icon={<Crown className="size-3.5 text-amber-500" />} category={summary.biggestCategory} amount={biggest?.amount ?? null} share={biggest?.share ?? null} />
          <SpendingArea title="My smallest spending area" icon={<Feather className="size-3.5 text-sky-500" />} category={summary.smallestCategory} amount={smallest?.amount ?? null} share={smallest?.share ?? null} />
          <div className="px-4 py-4 sm:px-5">
            {shares.length > 0 && (
              <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-ink-800" role="img" aria-label="Expense mix by category">
                {shares.map((s) => (
                  <div key={s.category} style={{ width: `${s.share * 100}%`, backgroundColor: CATEGORY_COLORS[s.category] }} title={`${EXPENSE_LABELS[s.category]} ${Math.round(s.share * 100)}%`} />
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-zinc-500">Savings rate</p>
                <p className="mt-0.5 text-sm font-semibold tabular">{rate === null ? '—' : `${Math.round(rate * 100)}%`}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-zinc-500"><Receipt className="size-3" /> Outstanding bills</p>
                <p className="mt-0.5 text-sm font-semibold">
                  <Money value={summary.outstandingBills} tone={summary.outstandingBills > 0 ? 'negative' : 'muted'} />
                  {summary.unpaidBillCount > 0 && <span className="ml-1 text-xs font-normal text-zinc-500">({summary.unpaidBillCount} unpaid)</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
