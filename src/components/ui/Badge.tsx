import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'violet';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-ink-800 dark:text-zinc-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
};

export const Badge = ({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', TONES[tone], className)}>
    {children}
  </span>
);
