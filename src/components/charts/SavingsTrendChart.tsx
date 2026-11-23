import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { YearSummary } from '@/lib/calculations/yearSummary';
import { formatAxis } from '@/lib/money';
import { useCurrency } from '@/store/selectors';
import { AXIS_TICK, legendFormatter, SERIES, useChartTheme, Y_AXIS_WIDTH } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';

/** Monthly savings (line) over cumulative savings (area). Empty months break the line instead of dropping to 0. */
export const SavingsTrendChart = ({ summary }: { summary: YearSummary }) => {
  const theme = useChartTheme();
  const currency = useCurrency();
  const data = summary.rows.map((r, i) => ({
    label: r.label,
    monthly: r.summary?.totalSavings ?? null,
    cumulative: summary.cumulativeSavings[i] ?? null,
    balance: r.summary?.balanceForward ?? null,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.savings} stopOpacity={0.28} />
            <stop offset="100%" stopColor={SERIES.savings} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: theme.axis }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={4} />
        <YAxis tickFormatter={formatAxis} tick={{ ...AXIS_TICK, fill: theme.axis }} axisLine={false} tickLine={false} width={Y_AXIS_WIDTH} />
        <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} currency={currency} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={legendFormatter(theme.legend)} />
        <Area type="monotone" dataKey="cumulative" name="Saved so far" stroke={SERIES.savings} strokeWidth={2} fill="url(#savingsFill)" connectNulls />
        <Line type="monotone" dataKey="monthly" name="Saved this month" stroke={SERIES.income} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
