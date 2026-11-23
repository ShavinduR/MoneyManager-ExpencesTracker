import { useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2, Link2 } from 'lucide-react';
import type { EntryKind, MonthKey, MonthlyEntry } from '@/types/finance';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { CheckCircle } from '@/components/ui/CheckCircle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { toast } from '@/components/ui/toast';
import { categoryLabel, CATEGORY_COLORS, isExpenseCategory } from '@/lib/categories';
import { formatDateShort, monthKeyOf } from '@/lib/dates';
import { sumCents } from '@/lib/money';
import { removeEntry, toggleEntryCleared, upsertEntry } from '@/lib/monthOps';
import { cn } from '@/lib/cn';
import { useFinanceStore } from '@/store/useFinanceStore';
import { EntryFormModal } from './EntryFormModal';

type EntrySectionProps = {
  kind: EntryKind;
  month: MonthKey;
  title: string;
  subtitle: string;
  icon: ReactNode;
  emptyHint: string;
  entries: MonthlyEntry[];
  className?: string;
  /** Anchor for the guided tour. */
  tourId?: string;
};

const dotColor = (entry: MonthlyEntry): string =>
  entry.kind === 'income' ? '#10b981' : entry.kind === 'savings' ? '#0ea5e9' : isExpenseCategory(entry.category) ? CATEGORY_COLORS[entry.category] : '#94a3b8';

export const EntrySection = ({ kind, month, title, subtitle, icon, emptyHint, entries, className, tourId }: EntrySectionProps) => {
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const debts = useFinanceStore((s) => s.data.debts);
  const [editing, setEditing] = useState<MonthlyEntry | null>(null);
  const [open, setOpen] = useState(false);

  const total = sumCents(entries.map((e) => e.amount));
  const cleared = entries.filter((e) => e.cleared).length;

  const openNew = (): void => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (entry: MonthlyEntry): void => {
    setEditing(entry);
    setOpen(true);
  };

  const save = (entry: MonthlyEntry): void => {
    const target = monthKeyOf(entry.date);
    if (target !== month) {
      updateMonth(month, (r) => removeEntry(r, entry.id));
      toast.info(`Moved to ${target} because of its date`);
    }
    updateMonth(target, (r) => upsertEntry(r, entry));
  };

  const remove = (entry: MonthlyEntry): void => {
    updateMonth(month, (r) => removeEntry(r, entry.id));
    toast.success(`Deleted “${entry.description}”`, { label: 'Undo', run: () => updateMonth(month, (r) => upsertEntry(r, entry)) });
  };

  const toggle = (entry: MonthlyEntry): void => updateMonth(month, (r) => toggleEntryCleared(r, entry.id));

  const secondary = (entry: MonthlyEntry): string => {
    if (entry.kind === 'debt') {
      const creditor = entry.debtId ? debts.find((d) => d.id === entry.debtId)?.creditor : null;
      return creditor ? (entry.notes ? `${creditor} · ${entry.notes}` : creditor) : entry.notes || 'Not linked to a debt';
    }
    return categoryLabel(entry.kind, entry.category);
  };

  return (
    <Card className={cn('flex flex-col', className)} data-tour={tourId}>
      <CardHeader
        title={title}
        subtitle={entries.length ? `${cleared} of ${entries.length} ${kind === 'income' ? 'received' : 'cleared'}` : subtitle}
        icon={icon}
        action={
          <Button size="sm" onClick={openNew} icon={<Plus className="size-3.5" />} aria-label={`Add ${title}`}>
            Add
          </Button>
        }
      />

      <div className="mt-3 flex-1">
        {entries.length === 0 ? (
          <EmptyState compact icon={icon} title={`No ${title.toLowerCase()} yet`} description={emptyHint} />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-y border-zinc-100 text-left text-[11px] font-medium uppercase tracking-wider text-subtle dark:border-ink-800">
                  <th className="w-14 py-2 pl-5 font-medium"><span className="sr-only">Status</span></th>
                  <th className="w-20 whitespace-nowrap py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 font-medium">{kind === 'income' || kind === 'savings' ? 'Source' : 'Description'}</th>
                  <th className="whitespace-nowrap py-2 pr-2 text-right font-medium">Amount</th>
                  <th className="w-20 py-2 pr-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="group border-b border-zinc-100/70 last:border-0 hover:bg-zinc-50/70 dark:border-ink-800/60 dark:hover:bg-ink-850/50">
                    <td className="py-2.5 pl-5">
                      <CheckCircle checked={entry.cleared} onChange={() => toggle(entry)} label={`Mark ${entry.description} ${entry.cleared ? 'not cleared' : 'cleared'}`} />
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-muted tabular">{formatDateShort(entry.date)}</td>
                    <td className="w-full max-w-0 py-2.5 pr-3">
                      <p className={cn('truncate font-medium', entry.cleared && kind !== 'income' && 'text-muted dark:text-zinc-400')}>{entry.description}</p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                        {entry.kind === 'debt' && entry.debtId ? (
                          <Link2 className="size-3 shrink-0 text-violet-500" />
                        ) : (
                          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor(entry) }} />
                        )}
                        {secondary(entry)}
                      </p>
                    </td>
                    <td className="py-2.5 pr-2 text-right font-medium">
                      <Money value={entry.amount} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex justify-end opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                        <IconButton label={`Edit ${entry.description}`} onClick={() => openEdit(entry)} className="size-8">
                          <Pencil className="size-3.5" />
                        </IconButton>
                        <IconButton label={`Delete ${entry.description}`} tone="danger" onClick={() => remove(entry)} className="size-8">
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-zinc-100 border-t border-zinc-100 sm:hidden dark:divide-ink-800 dark:border-ink-800">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle checked={entry.cleared} onChange={() => toggle(entry)} label={`Mark ${entry.description} ${entry.cleared ? 'not cleared' : 'cleared'}`} />
                  <button type="button" onClick={() => openEdit(entry)} className="min-w-0 flex-1 text-left">
                    <p className={cn('truncate text-sm font-medium', entry.cleared && kind !== 'income' && 'text-muted dark:text-zinc-400')}>{entry.description}</p>
                    <p className="truncate text-xs text-muted">
                      {formatDateShort(entry.date)} · {secondary(entry)}
                    </p>
                  </button>
                  <Money value={entry.amount} className="text-sm font-medium" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex items-center justify-between rounded-b-[var(--radius-card)] border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 sm:px-5 dark:border-ink-800 dark:bg-ink-850/40">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total</span>
        <Money value={total} className="text-sm font-semibold" />
      </div>

      <EntryFormModal open={open} onClose={() => setOpen(false)} kind={kind} month={month} entry={editing} onSave={save} />
    </Card>
  );
};
