import { Link } from 'react-router-dom';
import { ChevronRight, CreditCard, Landmark, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { debtPaymentHistory, debtProgress } from '@/lib/calculations/debt';
import { accountTotals } from '@/lib/accounts';
import { goalStats } from '@/lib/goals';
import { sumCents } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';

const Tile = ({ to, icon, label, children }: { to: string; icon: ReactNode; label: string; children: ReactNode }) => (
  <Link to={to} className="group block">
    <Card className="h-full p-4 transition-[border-color,box-shadow] duration-150 group-hover:border-zinc-300 group-hover:shadow-sm dark:group-hover:border-ink-700">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        {label}
        <ChevronRight className="ml-auto size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
      </p>
      <div className="mt-1.5">{children}</div>
    </Card>
  </Link>
);

/** Cross-module snapshot: debts, this year's goals, and bank net position. */
export const ModuleTiles = () => {
  const debts = useFinanceStore((s) => s.data.debts);
  const months = useFinanceStore((s) => s.data.months);
  const accounts = useFinanceStore((s) => s.data.bankAccounts);
  const plan = useFinanceStore((s) => s.data.yearPlans[String(new Date().getFullYear())]);

  const active = debts.filter((d) => !d.archived);
  const progress = active.map((d) => debtProgress(d, debtPaymentHistory(d, months)));
  const remaining = sumCents(progress.map((p) => p.remaining));
  const starting = sumCents(active.map((d) => d.startingBalance));
  const stats = goalStats(plan?.goals ?? []);
  const net = accountTotals(accounts).net;

  return (
    <div className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
      <Tile to="/debts" icon={<CreditCard className="size-3.5 text-violet-500" />} label="Debt remaining">
        {active.length ? (
          <>
            <Money value={remaining} fit="lg" className="font-semibold tracking-tight" />
            <ProgressBar value={starting > 0 ? (starting - remaining) / starting : 0} className="mt-2" />
            <p className="mt-1 text-[11px] text-muted">{active.length} active debt{active.length > 1 ? 's' : ''}</p>
          </>
        ) : (
          <p className="text-sm text-muted">No debts tracked</p>
        )}
      </Tile>
      <Tile to="/goals" icon={<Target className="size-3.5 text-accent-500" />} label={`${new Date().getFullYear()} goals`}>
        <p className="text-lg font-semibold tracking-tight tabular">
          {stats.achieved}<span className="text-sm font-normal text-muted"> / {stats.set || 8} achieved</span>
        </p>
        <ProgressBar value={stats.set ? stats.achieved / stats.set : 0} className="mt-2" />
        <p className="mt-1 text-[11px] text-muted">{stats.inProgress} in progress</p>
      </Tile>
      <Tile to="/accounts" icon={<Landmark className="size-3.5 text-sky-500" />} label="Bank net position">
        {accounts.length ? (
          <>
            <Money value={net} tone="auto" signed={net < 0} fit="lg" className="font-semibold tracking-tight" />
            <p className="mt-2.5 text-[11px] text-muted">{accounts.length} account{accounts.length > 1 ? 's' : ''}</p>
          </>
        ) : (
          <p className="text-sm text-muted">Add your accounts</p>
        )}
      </Tile>
    </div>
  );
};
