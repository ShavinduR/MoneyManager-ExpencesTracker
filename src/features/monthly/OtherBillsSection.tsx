import { useState } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import type { MonthKey, OtherBill } from '@/types/finance';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { CheckCircle } from '@/components/ui/CheckCircle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { toast } from '@/components/ui/toast';
import { EXPENSE_LABELS } from '@/lib/categories';
import { formatDateShort, monthKeyOf } from '@/lib/dates';
import { maxCents, subCents, sumCents, ZERO } from '@/lib/money';
import { removeBill, toggleBillPaid, upsertBill } from '@/lib/monthOps';
import { cn } from '@/lib/cn';
import { useFinanceStore } from '@/store/useFinanceStore';
import { BillFormModal } from './BillFormModal';
import { DueBadge } from './DueBadge';

export const OtherBillsSection = ({ month, bills }: { month: MonthKey; bills: OtherBill[] }) => {
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const [editing, setEditing] = useState<OtherBill | null>(null);
  const [open, setOpen] = useState(false);

  const totalDue = sumCents(bills.map((b) => b.amountDue));
  const totalPaid = sumCents(bills.map((b) => b.amountPaid));
  const outstanding = sumCents(bills.filter((b) => !b.paid).map((b) => maxCents(ZERO, subCents(b.amountDue, b.amountPaid))));
  const paidCount = bills.filter((b) => b.paid).length;

  const openNew = (): void => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (bill: OtherBill): void => {
    setEditing(bill);
    setOpen(true);
  };

  const save = (bill: OtherBill): void => {
    const target = monthKeyOf(bill.dueDate);
    if (target !== month) {
      updateMonth(month, (r) => removeBill(r, bill.id));
      toast.info(`Moved to ${target} because of its due date`);
    }
    updateMonth(target, (r) => upsertBill(r, bill));
  };

  const remove = (bill: OtherBill): void => {
    updateMonth(month, (r) => removeBill(r, bill.id));
    toast.success(`Deleted “${bill.name}”`, { label: 'Undo', run: () => updateMonth(month, (r) => upsertBill(r, bill)) });
  };

  const toggle = (bill: OtherBill): void => updateMonth(month, (r) => toggleBillPaid(r, bill.id));

  return (
    <Card className="flex flex-col lg:col-span-2">
      <CardHeader
        title="Other bills & expenses"
        subtitle={bills.length ? `${paidCount} of ${bills.length} paid` : 'Irregular and one-off bills with due dates'}
        icon={<FileText className="size-4" />}
        action={<Button size="sm" onClick={openNew} icon={<Plus className="size-3.5" />} aria-label="Add other bill">Add</Button>}
      />

      <div className="mt-3 flex-1">
        {bills.length === 0 ? (
          <EmptyState compact icon={<FileText className="size-4" />} title="No other bills this month" description="Doctor visits, repairs, gifts, annual fees. Add them with a due date to get overdue reminders." />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-zinc-100 text-left text-[11px] font-medium uppercase tracking-wider text-subtle dark:border-ink-800">
                    <th className="w-14 py-2 pl-5 font-medium">Paid</th>
                    <th className="py-2 pr-3 font-medium">Bill</th>
                    <th className="whitespace-nowrap py-2 pr-3 font-medium">Due date</th>
                    <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">Amt. due</th>
                    <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">Amt. paid</th>
                    <th className="hidden py-2 pr-3 font-medium lg:table-cell">Notes</th>
                    <th className="w-20 py-2 pr-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="group border-b border-zinc-100/70 last:border-0 hover:bg-zinc-50/70 dark:border-ink-800/60 dark:hover:bg-ink-850/50">
                      <td className="py-2.5 pl-5">
                        <CheckCircle checked={bill.paid} onChange={() => toggle(bill)} label={`Mark ${bill.name} ${bill.paid ? 'unpaid' : 'paid'}`} />
                      </td>
                      <td className="max-w-56 py-2.5 pr-3">
                        <p className={cn('truncate font-medium', bill.paid && 'text-muted dark:text-zinc-400')}>{bill.name}</p>
                        <p className="truncate text-xs text-muted">{EXPENSE_LABELS[bill.category]}</p>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3">
                        <span className="mr-2 text-xs text-muted tabular">{formatDateShort(bill.dueDate)}</span>
                        <DueBadge dueDate={bill.dueDate} paid={bill.paid} />
                      </td>
                      <td className="py-2.5 pr-3 text-right"><Money value={bill.amountDue} /></td>
                      <td className="py-2.5 pr-3 text-right font-medium">
                        <Money value={bill.amountPaid} tone={bill.amountPaid === 0 ? 'muted' : 'none'} />
                        {!bill.paid && bill.amountPaid > 0 && bill.amountPaid < bill.amountDue && <p className="text-[10px] font-normal text-amber-700 dark:text-amber-400">Partial</p>}
                      </td>
                      <td className="hidden max-w-48 truncate py-2.5 pr-3 text-xs text-muted lg:table-cell">{bill.notes || '—'}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex justify-end opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                          <IconButton label={`Edit ${bill.name}`} onClick={() => openEdit(bill)} className="size-8"><Pencil className="size-3.5" /></IconButton>
                          <IconButton label={`Delete ${bill.name}`} tone="danger" onClick={() => remove(bill)} className="size-8"><Trash2 className="size-3.5" /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-zinc-100 border-t border-zinc-100 sm:hidden dark:divide-ink-800 dark:border-ink-800">
              {bills.map((bill) => (
                <li key={bill.id} className="flex items-start gap-3 px-4 py-3">
                  <CheckCircle checked={bill.paid} onChange={() => toggle(bill)} label={`Mark ${bill.name} ${bill.paid ? 'unpaid' : 'paid'}`} className="mt-0.5" />
                  <button type="button" onClick={() => openEdit(bill)} className="min-w-0 flex-1 text-left">
                    <p className={cn('truncate text-sm font-medium', bill.paid && 'text-muted dark:text-zinc-400')}>{bill.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span className="tabular">{formatDateShort(bill.dueDate)}</span>
                      <DueBadge dueDate={bill.dueDate} paid={bill.paid} />
                    </div>
                  </button>
                  <div className="text-right text-sm">
                    <Money value={bill.amountDue} className="font-medium" />
                    <p className="text-[11px] text-muted">paid <Money value={bill.amountPaid} /></p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-b-[var(--radius-card)] border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 text-right sm:px-5 dark:border-ink-800 dark:bg-ink-850/40">
        <div className="text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Total due</p>
          <Money value={totalDue} className="text-sm font-semibold" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Total paid</p>
          <Money value={totalPaid} className="text-sm font-semibold" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Outstanding</p>
          <Money value={outstanding} tone={outstanding > 0 ? 'negative' : 'muted'} className="text-sm font-semibold" />
        </div>
      </div>

      <BillFormModal open={open} onClose={() => setOpen(false)} month={month} bill={editing} onSave={save} />
    </Card>
  );
};
