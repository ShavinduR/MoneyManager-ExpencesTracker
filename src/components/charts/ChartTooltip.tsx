import type { CurrencyCode } from '@/types/finance';
import { cents, formatMoney } from '@/lib/money';

type TooltipEntry = { name?: unknown; value?: unknown; color?: string; fill?: string; dataKey?: unknown };

type Props = {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  currency: CurrencyCode;
  labelFormatter?: (label: string) => string;
};

/** Values in chart data are integer cents; format them as full currency in the tooltip. */
export const ChartTooltip = ({ active, payload, label, currency, labelFormatter }: Props) => {
  if (!active || !payload || payload.length === 0) return null;
  const title = String(label ?? '');
  return (
    <div className="min-w-36 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-ink-700 dark:bg-ink-850/95">
      {title && <p className="mb-1.5 font-semibold">{labelFormatter ? labelFormatter(title) : title}</p>}
      <ul className="space-y-1">
        {payload.map((item) => (
          <li key={String(item.dataKey ?? item.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color ?? item.fill }} />
              {String(item.name ?? '')}
            </span>
            <span className="font-medium tabular">{typeof item.value === 'number' ? formatMoney(cents(item.value), currency) : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
