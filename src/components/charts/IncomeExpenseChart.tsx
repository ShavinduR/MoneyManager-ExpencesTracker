import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { YearMonthRow } from '@/lib/calculations/yearSummary';
import { formatAxis } from '@/lib/money';
import { useCurrency } from '@/store/selectors';
import { AXIS_TICK, SERIES, useChartTheme, Y_AXIS_WIDTH } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';

export const IncomeExpenseChart = ({ rows }: { rows: YearMonthRow[] }) => {
  const theme = useChartTheme();
  const currency = useCurrency();
  const data = rows.map((r) => ({
    label: r.label,
    income: r.summary?.totalIncome ?? 0,
    expenses: r.summary?.totalExpenses ?? 0,
    savings: r.summary?.totalSavings ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: theme.axis }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={4} />
        <YAxis tickFormatter={formatAxis} tick={{ ...AXIS_TICK, fill: theme.axis }} axisLine={false} tickLine={false} width={Y_AXIS_WIDTH} />
        <Tooltip cursor={{ fill: theme.cursor }} content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} currency={currency} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="income" name="Income" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="expenses" name="Expenses" fill={SERIES.expenses} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="savings" name="Savings" fill={SERIES.savings} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
};
