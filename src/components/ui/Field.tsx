import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-[border-color,box-shadow] duration-150 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-850 dark:text-zinc-100 dark:placeholder:text-zinc-500';

type FieldProps = { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode; className?: string };

export const Field = ({ label, hint, error, children, className }: FieldProps) => {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} {...rest} />
));
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...rest }, ref) => (
  <select ref={ref} className={cn(inputClass, 'appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest} />
));
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} className={cn(inputClass, 'min-h-24 resize-y leading-relaxed', className)} {...rest} />,
);
Textarea.displayName = 'Textarea';
