import { cn } from '@/lib/cn';

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  className?: string;
};

export const Segmented = <T extends string>({ value, onChange, options, label, className }: SegmentedProps<T>) => (
  <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-ink-850', className)}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        onClick={() => onChange(option.value)}
        className={cn(
          'rounded-lg px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-150',
          option.value === value
            ? 'bg-white text-zinc-900 shadow-sm dark:bg-ink-700 dark:text-zinc-50'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
