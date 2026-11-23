import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArchiveRestore, ArrowLeft, History, Pencil, Plus, Quote, Trash2 } from 'lucide-react';
import type { DebtAccount, DebtEntry } from '@/types/finance';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { toast } from '@/components/ui/toast';
import { maskLast4 } from '@/lib/security';
import { formatDateShort, formatMonthLong, monthKeyOf } from '@/lib/dates';
import { removeEntry, upsertEntry } from '@/lib/monthOps';
import { useFinanceStore } from '@/store/useFinanceStore';
import { DebtFormModal } from './DebtFormModal';
import { PaymentModal } from './PaymentModal';
import { PayoffSimulator } from './PayoffSimulator';
import { useDebtProgress } from './useDebtProgress';

const Detail = ({ debt }: { debt: DebtAccount }) => {
  const navigate = useNavigate();
  const months = useFinanceStore((s) => s.data.months);
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const setDebts = useFinanceStore((s) => s.setDebts);
  const deleteDebt = useFinanceStore((s) => s.deleteDebt);
  const { history, progress } = useDebtProgress(debt);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<DebtEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const findEntry = (entryId: string, month: string): DebtEntry | null => {
    const entry = months[month]?.entries.find((e) => e.id === entryId);
    return entry?.kind === 'debt' ? entry : null;
  };

  const savePayment = (entry: DebtEntry): void => {
    const previousMonth = editingPayment ? monthKeyOf(editingPayment.date) : null;
    const target = monthKeyOf(entry.date);
    if (previousMonth && previousMonth !== target) updateMonth(previousMonth, (r) => removeEntry(r, entry.id));
    updateMonth(target, (r) => upsertEntry(r, entry));
    toast.success(editingPayment ? 'Payment updated' : `Payment logged in ${formatMonthLong(target)}`);
  };

  const removePayment = (entry: DebtEntry): void => {
    const month = monthKeyOf(entry.date);
    updateMonth(month, (r) => removeEntry(r, entry.id));
    toast.success('Payment deleted', { label: 'Undo', run: () => updateMonth(month, (r) => upsertEntry(r, entry)) });
  };

  const setArchived = (archived: boolean): void => setDebts((list) => list.map((d) => (d.id === debt.id ? { ...d, archived } : d)));

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/debts" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-zinc-900 dark:hover:text-zinc-100">
          <ArrowLeft className="size-4" /> All debts
        </Link>
        <div className="flex gap-1">
          <IconButton label="Edit debt" onClick={() => setEditOpen(true)}><Pencil className="size-4" /></IconButton>
          <IconButton label={debt.archived ? 'Restore debt' : 'Archive debt'} onClick={() => setArchived(!debt.archived)}>
            {debt.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </IconButton>
          <IconButton label="Delete debt" tone="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{debt.creditor}</h1>
              <p className="mt-1 font-mono text-xs text-muted">Account {maskLast4(debt.accountRef)}</p>
            </div>
            <div className="flex gap-1.5">
              {debt.archived && <Badge>Archived</Badge>}
              <Badge tone={debt.interestRateApr === 0 ? 'green' : debt.interestRateApr >= 20 ? 'red' : 'amber'}>
                {debt.interestRateApr === 0 ? '0% interest' : `${debt.interestRateApr}% APR`}
              </Badge>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {[
              { label: 'Starting balance', value: <Money value={debt.startingBalance} /> },
              { label: 'Minimum payment', value: <Money value={debt.minimumPayment} /> },
              {
                label: progress.plannedCount ? `Paid so far (+ planned)` : 'Paid so far',
                value: (
                  <>
                    <Money value={progress.totalPaid} tone="positive" />
                    {progress.plannedCount > 0 && (
                      <span className="ml-1 text-xs font-normal text-muted">
                        + <Money value={progress.plannedTotal} />
                      </span>
                    )}
                  </>
                ),
              },
              { label: 'Goal payoff date', value: debt.goalPayoffDate ? formatMonthLong(monthKeyOf(debt.goalPayoffDate)) : '—' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-muted">{item.label}</dt>
                <dd className="mt-0.5 font-semibold">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted">Remaining balance</p>
                <Money value={progress.remaining} fit="3xl" className="block font-semibold tracking-tight" />
              </div>
              <span className="text-sm font-semibold tabular text-emerald-700 dark:text-emerald-400">{Math.round(progress.progress * 100)}%</span>
            </div>
            <ProgressBar value={progress.progress} className="h-2" />
          </div>
        </div>
        {debt.motivation && (
          <div className="flex gap-3 border-t border-zinc-100 bg-gradient-to-r from-accent-50 to-transparent px-5 py-4 sm:px-6 dark:border-ink-800 dark:from-accent-500/10">
            <Quote className="mt-0.5 size-4 shrink-0 text-accent-700 dark:text-accent-400" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-400">Why I’m doing this…</p>
              <p className="mt-1 text-sm leading-relaxed text-pretty">{debt.motivation}</p>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-5 [&>*]:min-w-0">
        <div className="xl:col-span-3">
          <PayoffSimulator debt={debt} remaining={progress.remaining} />
        </div>
        <Card className="xl:col-span-2">
          <CardHeader
            title="Payment history"
            subtitle={`${progress.paymentCount} paid${progress.plannedCount ? ` · ${progress.plannedCount} planned` : ''} · from your monthly tracker`}
            icon={<History className="size-4" />}
            action={<Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => { setEditingPayment(null); setPaymentOpen(true); }}>Log</Button>}
          />
          {history.length === 0 ? (
            <EmptyState compact icon={<History className="size-4" />} title="No payments yet" description="Log one here, or add a Debt Payment linked to this debt on the Monthly page." />
          ) : (
            <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-100 text-left text-[11px] uppercase tracking-wider text-subtle dark:border-ink-800">
                  <th className="py-2 pl-4 font-medium sm:pl-5">Date</th>
                  <th className="py-2 text-right font-medium">Paid</th>
                  <th className="py-2 pr-2 text-right font-medium">Balance</th>
                  <th className="w-16 py-2 pr-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((row) => {
                  const entry = findEntry(row.entryId, row.month);
                  return (
                    <tr key={row.entryId} className="group border-b border-zinc-100/70 last:border-0 dark:border-ink-800/60">
                      <td className="py-2.5 pl-4 sm:pl-5">
                        <Link to={`/monthly/${row.month}`} className="whitespace-nowrap text-xs tabular hover:underline">{formatDateShort(row.date)} ’{row.date.slice(2, 4)}</Link>
                        {!row.cleared && <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Planned: not counted yet</p>}
                        {row.notes && <p className="max-w-32 truncate text-[11px] text-muted">{row.notes}</p>}
                      </td>
                      <td className={row.cleared ? 'py-2.5 text-right font-medium' : 'py-2.5 text-right italic text-muted'}><Money value={row.amountPaid} /></td>
                      <td className="py-2.5 pr-2 text-right text-muted">{row.cleared ? <Money value={row.remainingBalance} /> : '—'}</td>
                      <td className="py-2.5 pr-3">
                        {entry && (
                          <div className="flex justify-end opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                            <IconButton label="Edit payment" className="size-7" onClick={() => { setEditingPayment(entry); setPaymentOpen(true); }}><Pencil className="size-3" /></IconButton>
                            <IconButton label="Delete payment" tone="danger" className="size-7" onClick={() => removePayment(entry)}><Trash2 className="size-3" /></IconButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      </div>

      <DebtFormModal open={editOpen} onClose={() => setEditOpen(false)} debt={debt} onSave={(next) => setDebts((list) => list.map((d) => (d.id === next.id ? next : d)))} />
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${debt.creditor}?`}
        description="Its payments stay in your monthly tables, unlinked from this debt."
        confirmLabel="Delete debt"
        tone="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteDebt(debt.id);
          navigate('/debts');
          toast.success(`Deleted ${debt.creditor}`);
        }}
      />
      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} debt={debt} payment={editingPayment} onSave={savePayment} />
    </div>
  );
};

export const DebtDetailPage = () => {
  const { debtId } = useParams();
  const debt = useFinanceStore((s) => s.data.debts.find((d) => d.id === debtId));
  if (!debt) return <Navigate to="/debts" replace />;
  return <Detail debt={debt} />;
};

export default DebtDetailPage;
