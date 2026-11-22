import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EmptyStateProps = { icon: ReactNode; title: string; description?: string; action?: ReactNode; className?: string; compact?: boolean };

export const EmptyState = ({ icon, title, description, action, className, compact }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12', className)}>
    <span className="flex size-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-ink-800 dark:text-zinc-400">{icon}</span>
    <div className="space-y-1">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mx-auto max-w-xs text-xs text-pretty text-zinc-500 dark:text-zinc-400">{description}</p>}
    </div>
    {action}
  </div>
);
