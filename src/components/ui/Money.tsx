import type { Cents } from '@/types/finance';
import { formatMoney, type FormatOptions } from '@/lib/money';
import { useCurrency } from '@/store/selectors';
import { cn } from '@/lib/cn';

/** Font-size ladder for `fit`: long amounts step down so they never overflow a card (audit H6). */
const FIT_LADDER = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'] as const;
const FIT_START = { '3xl': 0, '2xl': 1, xl: 2, lg: 3 } as const;
export type FitSize = keyof typeof FIT_START;

export const fitClass = (text: string, size: FitSize): string => {
  const steps = Math.max(0, Math.ceil((text.length - 12) / 3));
  return FIT_LADDER[Math.min(FIT_START[size] + steps, FIT_LADDER.length - 1)] ?? 'text-sm';
};

type MoneyProps = FormatOptions & {
  value: Cents;
  /** Largest font size; steps down automatically for long amounts like Rs. 12,500,000.55. */
  fit?: FitSize;
  /** Color by sign: green for positive, red for negative. */
  tone?: 'auto' | 'none' | 'positive' | 'negative' | 'muted';
  className?: string;
};

export const Money = ({ value, tone = 'none', className, fit, ...format }: MoneyProps) => {
  const currency = useCurrency();
  const text = formatMoney(value, currency, format);
  const resolved = tone === 'auto' ? (value < 0 ? 'negative' : value > 0 ? 'positive' : 'muted') : tone;
  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        fit && fitClass(text, fit),
        resolved === 'positive' && 'text-emerald-700 dark:text-emerald-400',
        resolved === 'negative' && 'text-red-600 dark:text-red-400',
        resolved === 'muted' && 'text-muted dark:text-zinc-400',
        className,
      )}
    >
      {text}
    </span>
  );
};

export const useFormatMoney = () => {
  const currency = useCurrency();
  return (value: Cents, options?: FormatOptions) => formatMoney(value, currency, options);
};
