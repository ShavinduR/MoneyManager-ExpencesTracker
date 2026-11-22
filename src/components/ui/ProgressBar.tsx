import { cn } from '@/lib/cn';

export const ProgressBar = ({ value, className, tone = 'accent' }: { value: number; className?: string; tone?: 'accent' | 'amber' | 'red' }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-ink-800', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          tone === 'accent' && 'bg-accent-500',
          tone === 'amber' && 'bg-amber-500',
          tone === 'red' && 'bg-red-500',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
