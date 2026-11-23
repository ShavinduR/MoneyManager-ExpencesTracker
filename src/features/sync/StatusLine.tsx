import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StatusTone = 'busy' | 'ok' | 'error' | 'idle';

/** Live status line, announced politely to screen readers. */
export const StatusLine = ({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) => (
  <p
    role="status"
    className={cn(
      'flex items-start justify-center gap-2 text-center text-sm',
      tone === 'error' ? 'text-red-700 dark:text-red-400' : tone === 'ok' ? 'text-accent-700 dark:text-accent-400' : 'text-muted',
      className,
    )}
  >
    {tone === 'busy' && <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />}
    {tone === 'ok' && <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
    {tone === 'error' && <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
    <span>{children}</span>
  </p>
);
