import type { Cents } from '@/types/finance';
import { formatMoney, type FormatOptions } from '@/lib/money';
import { useCurrency } from '@/store/selectors';
import { cn } from '@/lib/cn';

type MoneyProps = FormatOptions & {
  value: Cents;
  /** Color by sign: green for positive, red for negative. */
  tone?: 'auto' | 'none' | 'positive' | 'negative' | 'muted';
  className?: string;
};

export const Money = ({ value, tone = 'none', className, ...format }: MoneyProps) => {
  const currency = useCurrency();
  const resolved = tone === 'auto' ? (value < 0 ? 'negative' : value > 0 ? 'positive' : 'muted') : tone;
  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        resolved === 'positive' && 'text-emerald-600 dark:text-emerald-400',
        resolved === 'negative' && 'text-red-600 dark:text-red-400',
        resolved === 'muted' && 'text-zinc-500 dark:text-zinc-400',
        className,
      )}
    >
      {formatMoney(value, currency, format)}
    </span>
  );
};

export const useFormatMoney = () => {
  const currency = useCurrency();
  return (value: Cents, options?: FormatOptions) => formatMoney(value, currency, options);
};
