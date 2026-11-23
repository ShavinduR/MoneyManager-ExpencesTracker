import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PayoffResult } from '@/lib/calculations/payoffSimulator';
import { formatAxis } from '@/lib/money';
import { formatMonthLong, MONTH_LABELS_SHORT, parseMonthKey } from '@/lib/dates';
import { useCurrency } from '@/store/selectors';
import { AXIS_TICK, SERIES, useChartTheme, Y_AXIS_WIDTH } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';

const shortMonth = (key: string): string => {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_LABELS_SHORT[month - 1] ?? ''} ’${String(year).slice(2)}`;
};

type Props = { baseline: PayoffResult; accelerated: PayoffResult };

/** Declining balance: minimum payment vs. with extra payment. Series are aligned by month index. */
export const DebtBalanceChart = ({ baseline, accelerated }: Props) => {
  const theme = useChartTheme();
  const currency = useCurrency();
  const base = baseline.kind === 'paid-off' ? baseline.schedule : [];
  const fast = accelerated.kind === 'paid-off' ? accelerated.schedule : [];
  const longest = base.length >= fast.length ? base : fast;
  const data = longest.map((point, i) => ({
    month: point.month,
    minimum: base[i]?.balance ?? (base.length ? 0 : null),
    extra: fast[i]?.balance ?? (fast.length ? 0 : null),
  }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="extraFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.accelerated} stopOpacity={0.25} />
            <stop offset="100%" stopColor={SERIES.accelerated} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ ...AXIS_TICK, fill: theme.axis }} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis tickFormatter={formatAxis} tick={{ ...AXIS_TICK, fill: theme.axis }} axisLine={false} tickLine={false} width={Y_AXIS_WIDTH} />
        <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} currency={currency} labelFormatter={formatMonthLong} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {base.length > 0 && <Area type="monotone" dataKey="minimum" name="Minimum only" stroke={SERIES.baseline} strokeDasharray="4 4" strokeWidth={2} fill="none" />}
        {fast.length > 0 && <Area type="monotone" dataKey="extra" name="With extra" stroke={SERIES.accelerated} strokeWidth={2} fill="url(#extraFill)" />}
      </AreaChart>
    </ResponsiveContainer>
  );
};
