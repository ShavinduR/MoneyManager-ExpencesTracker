import { useState, type FormEvent } from 'react';
import { ArrowRightLeft, Pencil, RotateCcw } from 'lucide-react';
import type { MonthKey, MonthSummary } from '@/types/finance';
import { Money } from '@/components/ui/Money';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { cents, parseMoney, toInputString } from '@/lib/money';
import { formatMonthLong, shiftMonth } from '@/lib/dates';
import { useFinanceStore } from '@/store/useFinanceStore';

type Props = { month: MonthKey; summary: MonthSummary; previousMonth: MonthKey | null };

const SOURCE_TEXT = (summary: MonthSummary, previousMonth: MonthKey | null): string => {
  switch (summary.openingSource) {
    case 'override':
      return 'Set manually';
    case 'carried':
      return `Carried from ${previousMonth ? formatMonthLong(previousMonth) : 'last month'}`;
    case 'initial':
      return 'Your starting balance (Settings)';
  }
};

export const OpeningBalanceCard = ({ month, summary, previousMonth }: Props) => {
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [negative, setNegative] = useState(false);

  const start = (): void => {
    setValue(toInputString(cents(Math.abs(summary.openingBalance))));
    setNegative(summary.openingBalance < 0);
    setEditing(true);
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const parsed = parseMoney(value);
    if (parsed === null) return;
    updateMonth(month, (r) => ({ ...r, openingBalanceOverride: negative ? cents(-parsed) : parsed }));
    setEditing(false);
  };

  return (
    <div data-tour="carry-over" className="flex flex-col justify-between gap-2 rounded-[var(--radius-card)] border border-zinc-200/80 bg-white p-4 sm:p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <ArrowRightLeft className="size-3.5" /> Starting balance
        </p>
        {!editing && (
          <IconButton label="Edit starting balance" onClick={start} className="-mr-2 size-7">
            <Pencil className="size-3.5" />
          </IconButton>
        )}
      </div>
      {editing ? (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setNegative((n) => !n)} className="h-9 rounded-lg px-2 text-sm font-semibold text-muted ring-1 ring-zinc-200 dark:ring-ink-700" aria-label="Toggle negative">
            {negative ? '−' : '+'}
          </button>
          <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className="h-9 w-32 flex-1 tabular" aria-label="Starting balance" />
          <Button size="sm" variant="primary" type="submit">Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </form>
      ) : (
        <Money value={summary.openingBalance} fit="2xl" className="font-semibold tracking-tight" />
      )}
      <div className="flex items-center gap-2">
        <Badge tone={summary.openingSource === 'override' ? 'amber' : 'neutral'}>{SOURCE_TEXT(summary, previousMonth ?? shiftMonth(month, -1))}</Badge>
        {summary.openingSource === 'override' && (
          <button type="button" onClick={() => updateMonth(month, (r) => ({ ...r, openingBalanceOverride: null }))} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-700 hover:underline dark:text-accent-400">
            <RotateCcw className="size-3" /> Use carry-over
          </button>
        )}
      </div>
    </div>
  );
};
