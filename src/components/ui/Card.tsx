import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-[var(--radius-card)] border border-zinc-200/80 bg-white dark:border-ink-800 dark:bg-ink-900',
      className,
    )}
    {...rest}
  />
);

type CardHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const CardHeader = ({ title, subtitle, icon, action, className }: CardHeaderProps) => (
  <div className={cn('flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5', className)}>
    <div className="flex min-w-0 items-center gap-3">
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-ink-800 dark:text-zinc-300">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="truncate text-xs text-muted dark:text-zinc-400">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);
