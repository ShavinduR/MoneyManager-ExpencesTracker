import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Plus, Quote } from 'lucide-react';
import type { DebtAccount } from '@/types/finance';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { toast } from '@/components/ui/toast';
import { maskLast4 } from '@/lib/security';
import { formatMonthLong, monthKeyOf } from '@/lib/dates';
import { totalDebtRemaining } from '@/lib/calculations/debt';
import { useFinanceStore } from '@/store/useFinanceStore';
import { DebtFormModal } from './DebtFormModal';
import { useDebtProgress } from './useDebtProgress';

const DebtCard = ({ debt }: { debt: DebtAccount }) => {
  const { progress } = useDebtProgress(debt);
  return (
    <Link to={`/debts/${debt.id}`} className="group block">
      <Card className="flex h-full flex-col p-4 transition-[border-color,box-shadow] duration-150 group-hover:border-zinc-300 group-hover:shadow-sm sm:p-5 dark:group-hover:border-ink-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight">{debt.creditor}</p>
            <p className="font-mono text-xs text-zinc-500">{maskLast4(debt.accountRef)}</p>
          </div>
          <Badge tone={debt.interestRateApr === 0 ? 'green' : debt.interestRateApr >= 20 ? 'red' : 'amber'}>
            {debt.interestRateApr === 0 ? '0% interest' : `${debt.interestRateApr}% APR`}
          </Badge>
        </div>
        <div className="mt-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Remaining</p>
          <Money value={progress.remaining} className="text-2xl font-semibold tracking-tight" />
          <p className="text-xs text-zinc-500">
            of <Money value={debt.startingBalance} /> · {Math.round(progress.progress * 100)}% paid off
          </p>
        </div>
        <ProgressBar value={progress.progress} className="mt-3" />
        {debt.motivation && (
          <p className="mt-4 flex gap-2 text-xs italic text-zinc-500">
            <Quote className="size-3.5 shrink-0" />
            <span className="line-clamp-2">{debt.motivation}</span>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-zinc-500">
          <span>
            Min <Money value={debt.minimumPayment} />
            {debt.goalPayoffDate && ` · goal ${formatMonthLong(monthKeyOf(debt.goalPayoffDate))}`}
          </span>
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
};

export const DebtsPage = () => {
  const debts = useFinanceStore((s) => s.data.debts);
  const months = useFinanceStore((s) => s.data.months);
  const setDebts = useFinanceStore((s) => s.setDebts);
  const [open, setOpen] = useState(false);
  const active = debts.filter((d) => !d.archived);
  const archived = debts.filter((d) => d.archived);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Debt payment tracker"
        subtitle="Every payment logged in your monthly tracker counts here automatically."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Add debt</Button>}
      />

      {active.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <p className="text-xs font-medium text-zinc-500">Total remaining across {active.length} debt{active.length > 1 ? 's' : ''}</p>
            <Money value={totalDebtRemaining(debts, months)} className="text-2xl font-semibold tracking-tight" />
          </div>
          <p className="max-w-sm text-xs text-zinc-500">Open a debt to log payments, see its full history and run the payoff simulator.</p>
        </Card>
      )}

      {debts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard className="size-4" />}
            title="No debts tracked"
            description="Add a loan, leasing or credit card to track payments and simulate paying it off faster. Interest-free installments work too."
            action={<Button variant="primary" size="sm" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>Add a debt</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((d) => <DebtCard key={d.id} debt={d} />)}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">Paid off & archived</h2>
          <div className="grid gap-3 opacity-75 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((d) => <DebtCard key={d.id} debt={d} />)}
          </div>
        </div>
      )}

      <DebtFormModal
        open={open}
        onClose={() => setOpen(false)}
        debt={null}
        onSave={(debt) => {
          setDebts((list) => [...list, debt]);
          toast.success(`Added ${debt.creditor}`);
        }}
      />
    </div>
  );
};

export default DebtsPage;
