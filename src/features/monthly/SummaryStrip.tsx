import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet } from 'lucide-react';
import type { MonthSummary } from '@/types/finance';
import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/cn';

const Stat = ({ label, children, icon, className }: { label: string; children: React.ReactNode; icon: React.ReactNode; className?: string }) => (
  <div className={cn('rounded-[var(--radius-card)] border border-zinc-200/80 bg-white p-4 dark:border-ink-800 dark:bg-ink-900', className)}>
    <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      {icon}
      {label}
    </p>
    <div className="mt-1.5 text-lg font-semibold tracking-tight sm:text-xl">{children}</div>
  </div>
);

export const SummaryStrip = ({ summary }: { summary: MonthSummary }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Stat label="Income" icon={<ArrowDownLeft className="size-3.5 text-emerald-500" />}>
      <Money value={summary.totalIncome} />
    </Stat>
    <Stat label="Expenses" icon={<ArrowUpRight className="size-3.5 text-amber-500" />}>
      <Money value={summary.totalExpenses} />
    </Stat>
    <Stat label="Savings" icon={<PiggyBank className="size-3.5 text-sky-500" />}>
      <Money value={summary.totalSavings} />
    </Stat>
    <Stat label="Balance forward" icon={<Wallet className="size-3.5 text-accent-500" />} className="bg-zinc-900 text-white dark:bg-ink-850 [&_p]:text-zinc-400">
      <Money value={summary.balanceForward} />
      <p className="mt-0.5 text-[11px] font-normal">
        Net <Money value={summary.netDifference} signed className={summary.netDifference < 0 ? 'text-red-400' : 'text-accent-400'} />
      </p>
    </Stat>
  </div>
);
