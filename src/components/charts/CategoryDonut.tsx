import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryRow } from '@/lib/calculations/yearSummary';
import { CATEGORY_COLORS, EXPENSE_LABELS } from '@/lib/categories';
import { formatAxis, sumCents } from '@/lib/money';
import { useCurrency } from '@/store/selectors';
import { Money } from '@/components/ui/Money';
import { ChartTooltip } from './ChartTooltip';

const TOP = 6;

export const CategoryDonut = ({ rows }: { rows: CategoryRow[] }) => {
  const currency = useCurrency();
  const top = rows.slice(0, TOP);
  const rest = rows.slice(TOP);
  const otherTotal = sumCents(rest.map((r) => r.total));
  const data = [
    ...top.map((r) => ({ name: EXPENSE_LABELS[r.category], value: r.total, color: CATEGORY_COLORS[r.category] })),
    ...(otherTotal > 0 ? [{ name: `${rest.length} more`, value: otherTotal, color: '#a1a1aa' }] : []),
  ];
  const total = sumCents(rows.map((r) => r.total));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={1.5} stroke="none" animationDuration={500}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted">Total</span>
          <span className="text-lg font-semibold tracking-tight tabular">{formatAxis(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted tabular">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
              <Money value={d.value} compact className="w-16 text-right text-xs font-medium" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
