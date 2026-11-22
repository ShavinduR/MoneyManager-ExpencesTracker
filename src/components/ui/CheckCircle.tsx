import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

type CheckCircleProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
};

/** The paper planner's "○" column, as an accessible toggle. */
export const CheckCircle = ({ checked, onChange, label, className }: CheckCircleProps) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    title={label}
    onClick={onChange}
    className={cn(
      'relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-150 active:scale-90',
      'before:absolute before:-inset-2.5 before:content-[""]',
      checked
        ? 'border-accent-500 bg-accent-500 text-white dark:text-ink-950'
        : 'border-zinc-300 hover:border-accent-500 dark:border-zinc-600',
      className,
    )}
  >
    <Check className={cn('size-3 transition-[opacity,transform] duration-150', checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} strokeWidth={3} />
  </button>
);
