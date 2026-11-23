import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, PieChart, TrendingUp, Table2 } from 'lucide-react';
import type { Cents } from '@/types/finance';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money, useFormatMoney } from '@/components/ui/Money';
import { formatAxis } from '@/lib/money';
import { Segmented } from '@/components/ui/Segmented';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { SavingsTrendChart } from '@/components/charts/SavingsTrendChart';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { summarizeYear, type YearRange } from '@/lib/calculations/yearSummary';
import { CATEGORY_COLORS, EXPENSE_LABELS } from '@/lib/categories';
import { currentMonthKey, makeMonthKey } from '@/lib/dates';
import { useMonthSummaries, useCurrency } from '@/store/selectors';
import { cn } from '@/lib/cn';
import { Link } from 'react-router-dom';

const RANGES: readonly { value: YearRange; label: string }[] = [
  { value: 'full', label: 'Full year' },
  { value: 'h1', label: 'Jan–Jun' },
  { value: 'h2', label: 'Jul–Dec' },
];

/** Full-year matrices show compact values ("265k") so 12 months fit; the exact amount is in the tooltip. */
const Cell = ({ value, compact }: { value: Cents | null; compact: boolean }) => {
  const format = useFormatMoney();
  return (
    <td className="whitespace-nowrap px-2.5 py-2.5 text-right text-[13px] tabular">
      {value === null ? (
        <span className="text-subtle">—</span>
      ) : compact ? (
        <span title={format(value)}>{formatAxis(value)}</span>
      ) : (
        <Money value={value} />
      )}
    </td>
  );
};

/** Matrix with a sticky first column so it scrolls horizontally on phones without losing row labels. */
const Matrix = ({ head, children }: { head: string[]; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  // On narrow screens, start scrolled to the most recent months + Total.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [head.length]);
  return (
  <div ref={ref} className="overflow-x-auto">
    <table className="w-full min-w-max text-sm">
      <thead>
        <tr className="border-y border-zinc-100 text-[11px] uppercase tracking-wider text-subtle dark:border-ink-800">
          {head.map((h, i) => (
            <th key={h} className={cn('px-3 py-2 font-medium', i === 0 ? 'sticky left-0 z-10 bg-white pl-4 text-left sm:pl-5 dark:bg-ink-900' : 'text-right', i === head.length - 1 && 'bg-zinc-50 dark:bg-ink-850')}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-ink-800">{children}</tbody>
    </table>
  </div>
  );
};

const RowLabel = ({ children }: { children: ReactNode }) => (
  <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white py-2.5 pl-4 pr-3 text-left text-[13px] font-medium sm:pl-5 dark:bg-ink-900">
    {children}
  </th>
);

export const YearSummaryPage = () => {
  const summaries = useMonthSummaries();
  const currency = useCurrency();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [range, setRange] = useState<YearRange>('full');
  const summary = useMemo(() => summarizeYear(summaries, year, range), [summaries, year, range]);
  const head = ['Month', ...summary.rows.map((r) => r.label), 'Total'];
  const today = currentMonthKey();
  const compact = range === 'full';

  const kpis: { label: string; value: Cents | null; tone?: 'auto' }[] = [
    { label: 'Total income', value: summary.totals.income },
    { label: 'Total expenses', value: summary.totals.expenses },
    { label: 'Total savings', value: summary.totals.savings },
    { label: 'Net (after savings)', value: summary.totals.net, tone: 'auto' },
  ];

  return (
    <div className="animate-fade-up space-y-4">
      <PageHeader
        title="Summary of the year"
        subtitle={`All 12 months, aggregated automatically. Amounts in ${currency}.`}
        actions={
          <>
            <Segmented label="Range" value={range} onChange={setRange} options={RANGES} />
            <div className="flex items-center">
              <IconButton label="Previous year" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="size-4" /></IconButton>
              <span className="w-12 text-center text-sm font-semibold tabular">{year}</span>
              <IconButton label="Next year" onClick={() => setYear((y) => y + 1)}><ChevronRight className="size-4" /></IconButton>
            </div>
          </>
        }
      />

      {summary.recordedMonths === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="size-4" />}
            title={`No months recorded for ${RANGES.find((r) => r.value === range)?.label.toLowerCase()} ${year}`}
            description="Add income and expenses on the Monthly page and this summary fills itself in."
            action={<Link to={`/monthly/${today}`} className="text-sm font-medium text-accent-700 hover:underline dark:text-accent-400">Open this month →</Link>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
            {kpis.map((k) => (
              <Card key={k.label} className="p-4">
                <p className="text-xs font-medium text-muted">{k.label}</p>
                {k.value !== null && <Money value={k.value} tone={k.tone ?? 'none'} signed={k.tone === 'auto'} fit="xl" className="mt-1 block font-semibold tracking-tight" />}
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader title="Income vs. expenses" subtitle={`${summary.recordedMonths} month${summary.recordedMonths > 1 ? 's' : ''} recorded`} icon={<BarChart3 className="size-4" />} />
            <div className="px-2 pb-4 pt-4 sm:px-4">
              <IncomeExpenseChart rows={summary.rows} />
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Card>
              <CardHeader title="Savings trend" subtitle="Monthly savings and the running total" icon={<TrendingUp className="size-4" />} />
              <div className="px-2 pb-4 pt-4 sm:px-4">
                <SavingsTrendChart summary={summary} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Where it went" subtitle="Expenses by category" icon={<PieChart className="size-4" />} />
              <div className="p-4 sm:p-5">
                {summary.categoryMatrix.length ? <CategoryDonut rows={summary.categoryMatrix} /> : <p className="text-sm text-muted">No expenses in this range.</p>}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Monthly matrix" subtitle={compact ? 'Compact amounts: hover for exact values · Jan–Jun / Jul–Dec show full amounts' : 'The planner’s summary table'} icon={<Table2 className="size-4" />} />
            <div className="mt-3">
              <Matrix head={head}>
                {(
                  [
                    { label: 'Total income', pick: (i: number) => summary.rows[i]?.summary?.totalIncome ?? null, total: summary.totals.income },
                    { label: 'Total expenses', pick: (i: number) => summary.rows[i]?.summary?.totalExpenses ?? null, total: summary.totals.expenses },
                    { label: 'Balance', pick: (i: number) => summary.rows[i]?.summary?.balanceForward ?? null, total: summary.closingBalance },
                    { label: 'Savings', pick: (i: number) => summary.rows[i]?.summary?.totalSavings ?? null, total: summary.totals.savings },
                  ] as const
                ).map((row) => (
                  <tr key={row.label} className="hover:bg-zinc-50/60 dark:hover:bg-ink-850/40">
                    <RowLabel>{row.label}</RowLabel>
                    {summary.rows.map((r, i) => (
                      <Cell key={r.month} value={row.pick(i)} compact={compact} />
                    ))}
                    <td className="whitespace-nowrap bg-zinc-50 px-3 py-2.5 text-right text-[13px] font-semibold dark:bg-ink-850">
                      {row.total === null ? '—' : <Money value={row.total} />}
                    </td>
                  </tr>
                ))}
              </Matrix>
            </div>
          </Card>

          <Card>
            <CardHeader title="Monthly expenses summary" subtitle="Category by month, largest first" icon={<Table2 className="size-4" />} />
            <div className="mt-3">
              {summary.categoryMatrix.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted">No expenses recorded in this range.</p>
              ) : (
                <Matrix head={['Category', ...summary.rows.map((r) => r.label), 'Total']}>
                  {summary.categoryMatrix.map((row) => (
                    <tr key={row.category} className="hover:bg-zinc-50/60 dark:hover:bg-ink-850/40">
                      <RowLabel>
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[row.category] }} />
                          {EXPENSE_LABELS[row.category]}
                        </span>
                      </RowLabel>
                      {row.values.map((v, i) => (
                        <Cell key={summary.rows[i]?.month ?? makeMonthKey(year, i + 1)} value={v} compact={compact} />
                      ))}
                      <td className="whitespace-nowrap bg-zinc-50 px-3 py-2.5 text-right text-[13px] font-semibold dark:bg-ink-850">
                        <Money value={row.total} />
                      </td>
                    </tr>
                  ))}
                </Matrix>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default YearSummaryPage;
