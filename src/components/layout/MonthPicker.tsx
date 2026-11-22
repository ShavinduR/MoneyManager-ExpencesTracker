import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthKey } from '@/types/finance';
import { currentMonthKey, formatMonthLong, makeMonthKey, MONTH_LABELS_SHORT, parseMonthKey, shiftMonth } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { useFinanceStore } from '@/store/useFinanceStore';
import { IconButton } from '@/components/ui/Button';

type MonthPickerProps = { value: MonthKey; onChange: (month: MonthKey) => void };

/** "‹ November 2026 ›" with a JAN…DEC grid popover, like the planner's month strip. */
export const MonthPicker = ({ value, onChange }: MonthPickerProps) => {
  const [open, setOpen] = useState(false);
  const { year, month } = parseMonthKey(value);
  const [viewYear, setViewYear] = useState(year);
  const months = useFinanceStore((s) => s.data.months);
  const ref = useRef<HTMLDivElement>(null);
  const today = currentMonthKey();

  useEffect(() => setViewYear(year), [year]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <IconButton label="Previous month" onClick={() => onChange(shiftMonth(value, -1))}>
        <ChevronLeft className="size-4" />
      </IconButton>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-9 min-w-40 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold tracking-tight hover:bg-zinc-100 dark:hover:bg-ink-800"
      >
        {formatMonthLong(value)}
        <ChevronDown className={cn('size-3.5 text-zinc-400 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      <IconButton label="Next month" onClick={() => onChange(shiftMonth(value, 1))}>
        <ChevronRight className="size-4" />
      </IconButton>

      {open && (
        <div role="dialog" aria-label="Choose month" className="absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl animate-pop-in dark:border-ink-700 dark:bg-ink-850">
          <div className="mb-2 flex items-center justify-between">
            <IconButton label="Previous year" onClick={() => setViewYear((y) => y - 1)}>
              <ChevronLeft className="size-4" />
            </IconButton>
            <span className="text-sm font-semibold tabular">{viewYear}</span>
            <IconButton label="Next year" onClick={() => setViewYear((y) => y + 1)}>
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MONTH_LABELS_SHORT.map((label, i) => {
              const key = makeMonthKey(viewYear, i + 1);
              const selected = viewYear === year && i + 1 === month;
              const hasData = Boolean(months[key]?.entries.length);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    'relative h-10 rounded-xl text-xs font-semibold uppercase tracking-wide transition-[background-color,color] duration-150',
                    selected
                      ? 'bg-zinc-900 text-white dark:bg-accent-500 dark:text-ink-950'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-ink-800',
                    key === today && !selected && 'ring-1 ring-inset ring-accent-500/60',
                  )}
                >
                  {label}
                  {hasData && <span className={cn('absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full', selected ? 'bg-current' : 'bg-accent-500')} />}
                </button>
              );
            })}
          </div>
          {value !== today && (
            <button type="button" onClick={() => { onChange(today); setOpen(false); }} className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-accent-600 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10">
              Jump to this month
            </button>
          )}
        </div>
      )}
    </div>
  );
};
