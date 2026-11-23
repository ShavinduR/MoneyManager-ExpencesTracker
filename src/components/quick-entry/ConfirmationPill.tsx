import { ArrowDownLeft, ArrowUpRight, CalendarDays, CreditCard, PiggyBank, Sparkles } from 'lucide-react';
import type { QuickEntryDraft } from '@/lib/quickEntry/parser';
import { decodeTarget, encodeTarget, TARGET_GROUPS, targetLabel } from '@/lib/quickEntry/targets';
import { formatDateShort, todayISO } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Money } from '@/components/ui/Money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { KIND_LABELS } from '@/lib/categories';
import type { EntryKind } from '@/types/finance';

const KIND_STYLE: Record<EntryKind, { icon: typeof ArrowDownLeft; className: string }> = {
  income: { icon: ArrowDownLeft, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  savings: { icon: PiggyBank, className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
  debt: { icon: CreditCard, className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' },
  fixed: { icon: ArrowUpRight, className: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' },
};

type ConfirmationPillProps = {
  draft: QuickEntryDraft;
  onChange: (draft: QuickEntryDraft) => void;
  onConfirm: () => void;
};

/** Preview of what will be saved. Category and date are editable inline before confirming. */
export const ConfirmationPill = ({ draft, onChange, onConfirm }: ConfirmationPillProps) => {
  const debts = useFinanceStore((s) => s.data.debts);
  const style = KIND_STYLE[draft.target.kind];
  const Icon = style.icon;
  const debtName = draft.debtId ? debts.find((d) => d.id === draft.debtId)?.creditor : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-900/5 animate-pop-in dark:border-ink-700 dark:bg-ink-850 dark:shadow-black/30">
      <div className="flex flex-wrap items-center gap-2 p-1">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', style.className)}>
          <Icon className="size-3.5" />
          {KIND_LABELS[draft.target.kind]}
        </span>

        <label className="relative inline-flex items-center rounded-full bg-zinc-100 text-xs font-medium dark:bg-ink-800">
          <span className="sr-only">Category</span>
          <select
            value={encodeTarget(draft.target)}
            onChange={(e) => {
              const target = decodeTarget(e.target.value);
              if (target) onChange({ ...draft, target, debtId: target.kind === 'debt' ? draft.debtId : null });
            }}
            className="appearance-none rounded-full bg-transparent py-1 pl-2.5 pr-6 focus:outline-none"
          >
            {TARGET_GROUPS.map((group) => (
              <optgroup key={group.kind} label={group.label}>
                {group.targets.map((t) => (
                  <option key={encodeTarget(t)} value={encodeTarget(t)}>
                    {targetLabel(t)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 text-subtle">▾</span>
        </label>

        {draft.target.kind === 'debt' && debts.length > 0 && (
          <label className="relative inline-flex items-center rounded-full bg-zinc-100 text-xs font-medium dark:bg-ink-800">
            <span className="sr-only">Debt account</span>
            <select
              value={draft.debtId ?? ''}
              onChange={(e) => onChange({ ...draft, debtId: e.target.value || null })}
              className="appearance-none rounded-full bg-transparent py-1 pl-2.5 pr-6 focus:outline-none"
            >
              <option value="">No linked debt</option>
              {debts.filter((d) => !d.archived).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.creditor}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 text-subtle">▾</span>
          </label>
        )}

        <label className="relative inline-flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-2.5 pr-2.5 text-xs font-medium dark:bg-ink-800">
          <CalendarDays className="size-3.5 text-muted" />
          <span>{draft.date === todayISO() ? 'Today' : formatDateShort(draft.date)}</span>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => e.target.value && onChange({ ...draft, date: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Date"
          />
        </label>

        {draft.source === 'ai' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            <Sparkles className="size-3" /> AI
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-ink-900">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{draft.description}</p>
          <p className="truncate text-[11px] text-muted">
            {debtName ? `Linked to ${debtName}` : draft.matchedTerm ? `Matched “${draft.matchedTerm}”` : draft.source === 'ai' ? 'Parsed by Gemini' : 'No keyword matched, so pick a category'}
          </p>
        </div>
        <Money value={draft.amount} className="text-lg font-semibold tracking-tight" />
      </div>

      <button
        type="button"
        onClick={onConfirm}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-medium text-white transition-[background-color,transform] active:scale-[0.99] dark:bg-accent-500 dark:text-ink-950"
      >
        Save entry <kbd className="rounded bg-white/15 px-1.5 text-[10px] dark:bg-ink-950/15">Enter</kbd>
      </button>
    </div>
  );
};
