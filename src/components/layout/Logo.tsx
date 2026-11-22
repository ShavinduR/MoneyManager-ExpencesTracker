import { cn } from '@/lib/cn';

export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={cn('size-8', className)} aria-hidden>
    <rect width="64" height="64" rx="16" className="fill-zinc-900 dark:fill-accent-500" />
    <path d="M16 44V30m10 14V22m10 22V32m10 12V18" className="stroke-accent-400 dark:stroke-ink-950" strokeWidth="5.5" strokeLinecap="round" fill="none" />
  </svg>
);
