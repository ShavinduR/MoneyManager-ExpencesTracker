import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarDays, Database, Flag, Keyboard, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { upcomingBills } from '@/lib/calculations/upcomingBills';
import { todayISO } from '@/lib/dates';
import { DueBadge } from '@/features/monthly/DueBadge';
import { subCents } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useMonthView } from '@/hooks/useMonthView';
import { currentMonthKey, formatDateShort, formatMonthLong, MONTH_LABELS_LONG, parseMonthKey } from '@/lib/dates';
import { CATEGORY_COLORS, EXPENSE_LABELS, categoryLabel, isExpenseCategory } from '@/lib/categories';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/toast';
import { SummaryStrip } from '@/features/monthly/SummaryStrip';
import { ModuleTiles } from './ModuleTiles';
import { cn } from '@/lib/cn';

const greeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const Welcome = () => {
  const loadDemo = useFinanceStore((s) => s.loadDemo);
  return (
    <div className="animate-fade-up">
      <Card className="overflow-hidden">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent-500/10 blur-3xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-400">Clarity over your money, one month at a time.</p>
          <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Your 4-year finance planner, now automatic.</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-pretty text-zinc-600 dark:text-zinc-400">
            Track income, savings, debt and bills month by month. Totals, carry-over balances and yearly summaries calculate themselves. Your data stays on this device and works offline.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button
              variant="primary"
              icon={<Database className="size-4" />}
              onClick={() => {
                void loadDemo()
                  .then(() => toast.success('Sample data loaded: 6 months, 2 debts, 4 goals'))
                  .catch(() => toast.error('Couldn’t save sample data on this device.'));
              }}
            >
              Load sample data
            </Button>
            <Link to={`/monthly/${currentMonthKey()}`}>
              <Button icon={<CalendarDays className="size-4" />}>Start fresh this month</Button>
            </Link>
          </div>
        </div>
        <div className="grid gap-px border-t border-zinc-100 bg-zinc-100 sm:grid-cols-3 dark:border-ink-800 dark:bg-ink-800">
          {[
            { icon: Sparkles, title: 'Quick add', text: 'Type “ada lunch 850” or “Salary 85000”. English & Singlish.' },
            { icon: TrendingUp, title: 'Automatic overview', text: 'Balance forward, biggest spending area and carry-over, calculated for you.' },
            { icon: Flag, title: 'Mindset', text: 'Monthly goals and “This month taught me…” reflections.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-white p-5 dark:bg-ink-900">
              <Icon className="size-4 text-accent-500" />
              <p className="mt-2 text-sm font-medium">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export const DashboardPage = () => {
  const hasData = useFinanceStore((s) => s.hasData);
  const months = useFinanceStore((s) => s.data.months);
  const name = useFinanceStore((s) => s.data.profile.name);
  const month = currentMonthKey();
  const { record, summary } = useMonthView(month);

  if (!hasData) return <Welcome />;

  const recent = [...record.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const categories = Object.entries(summary.byCategory)
    .flatMap(([category, amount]) => (amount ? [{ category, amount }] : []))
    .sort((a, b) => b.amount - a.amount);
  const maxCategory = categories[0]?.amount ?? 1;
  const goals = record.goals.filter((g) => g.text.trim());
  const goalsDone = goals.filter((g) => g.done).length;
  const { month: monthNumber } = parseMonthKey(month);
  const dueBills = upcomingBills(months, todayISO());

  return (
    <div className="animate-fade-up space-y-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greeting()}{name ? `, ${name.split(' ')[0]}` : ''}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{MONTH_LABELS_LONG[monthNumber - 1]} at a glance</h1>
        </div>
        <Link to={`/monthly/${month}`}>
          <Button size="sm" icon={<CalendarDays className="size-3.5" />}>
            Open {formatMonthLong(month)} <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      <SummaryStrip summary={summary} />
      <ModuleTiles />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Where the money went" subtitle="Expenses by category this month" icon={<TrendingDown className="size-4" />} />
          {categories.length === 0 ? (
            <EmptyState compact icon={<TrendingDown className="size-4" />} title="No expenses yet" description="Expenses you add this month will be ranked here." />
          ) : (
            <ul className="space-y-3 p-4 sm:p-5">
              {categories.slice(0, 7).map(({ category, amount }) => {
                const label = isExpenseCategory(category) ? EXPENSE_LABELS[category] : category;
                const color = isExpenseCategory(category) ? CATEGORY_COLORS[category] : '#94a3b8';
                return (
                  <li key={category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                        {label}
                        {category === summary.biggestCategory && <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Biggest</span>}
                      </span>
                      <Money value={amount} className="text-sm font-medium" />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-ink-800">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(amount / maxCategory) * 100}%`, backgroundColor: color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {dueBills.length > 0 && (
            <Card>
              <CardHeader title="Bills needing attention" subtitle="Overdue or due within 7 days" icon={<BellRing className="size-4" />} />
              <ul className="divide-y divide-zinc-100 py-1 dark:divide-ink-800">
                {dueBills.slice(0, 4).map((b) => (
                  <li key={b.id}>
                    <Link to={`/monthly/${b.month}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50 sm:px-5 dark:hover:bg-ink-850">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.name}</p>
                        <div className="mt-0.5"><DueBadge dueDate={b.dueDate} paid={b.paid} /></div>
                      </div>
                      <Money value={subCents(b.amountDue, b.amountPaid)} className="text-sm font-medium" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title="Monthly goals" subtitle={goals.length ? `${goalsDone} of ${goals.length} done` : 'Set up to 5 goals'} icon={<Flag className="size-4" />} />
            <div className="p-4 sm:p-5">
              {goals.length ? (
                <>
                  <ProgressBar value={goalsDone / goals.length} />
                  <ul className="mt-3 space-y-1.5">
                    {goals.slice(0, 5).map((g) => (
                      <li key={g.id} className={cn('truncate text-sm', g.done ? 'text-subtle line-through' : 'text-zinc-700 dark:text-zinc-300')}>
                        {g.text}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Link to={`/monthly/${month}`} className="text-sm text-accent-700 hover:underline dark:text-accent-400">Add this month’s goals →</Link>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent activity" icon={<Keyboard className="size-4" />} subtitle="Press / anywhere to quick-add" />
            {recent.length === 0 ? (
              <EmptyState compact icon={<Sparkles className="size-4" />} title="Nothing logged yet" description="Use the quick-add bar above." />
            ) : (
              <ul className="divide-y divide-zinc-100 py-1 dark:divide-ink-800">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.description}</p>
                      <p className="text-xs text-muted">{formatDateShort(e.date)} · {categoryLabel(e.kind, e.category)}</p>
                    </div>
                    <Money value={e.amount} signed={e.kind === 'income'} tone={e.kind === 'income' ? 'positive' : 'none'} className="text-sm font-medium" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
