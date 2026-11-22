import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownLeft, CreditCard, PiggyBank, Receipt } from 'lucide-react';
import type { EntryKind, MonthlyEntry } from '@/types/finance';
import { currentMonthKey, formatMonthLong, isMonthKey } from '@/lib/dates';
import { PageHeader } from '@/components/layout/AppShell';
import { MonthPicker } from '@/components/layout/MonthPicker';
import { useMonthView } from '@/hooks/useMonthView';
import { EntrySection } from './EntrySection';
import { GoalsCard } from './GoalsCard';
import { OpeningBalanceCard } from './OpeningBalanceCard';
import { SummaryStrip } from './SummaryStrip';

export const MonthlyRedirect = () => <Navigate to={`/monthly/${currentMonthKey()}`} replace />;

export const MonthlyPage = () => {
  const { month = '' } = useParams();
  if (!isMonthKey(month)) return <MonthlyRedirect />;
  return <MonthlyWorkspace month={month} />;
};

const MonthlyWorkspace = ({ month }: { month: string }) => {
  const navigate = useNavigate();
  const { record, summary, previousMonth } = useMonthView(month);

  const byKind = useMemo(() => {
    const groups: Record<EntryKind, MonthlyEntry[]> = { income: [], savings: [], debt: [], fixed: [] };
    for (const entry of record.entries) groups[entry.kind].push(entry);
    return groups;
  }, [record.entries]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Monthly tracker"
        subtitle={`Plan and track ${formatMonthLong(month)}. Totals and carry-over update automatically.`}
        actions={<MonthPicker value={month} onChange={(m) => navigate(`/monthly/${m}`)} />}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <OpeningBalanceCard month={month} summary={summary} previousMonth={previousMonth} />
        <SummaryStrip summary={summary} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <EntrySection kind="income" month={month} title="Income" subtitle="Salary, freelance, other income" icon={<ArrowDownLeft className="size-4" />} emptyHint="Add your salary or try typing “Salary 85000” in the quick-add bar." entries={byKind.income} />
        <GoalsCard month={month} goals={record.goals} />
        <EntrySection kind="savings" month={month} title="Savings" subtitle="Pay yourself first" icon={<PiggyBank className="size-4" />} emptyHint="Money moved to savings is subtracted from your balance forward." entries={byKind.savings} />
        <EntrySection kind="debt" month={month} title="Debt payments" subtitle="Loans, leasing, credit cards" icon={<CreditCard className="size-4" />} emptyHint="Link a payment to a debt account to track your payoff progress." entries={byKind.debt} />
        <EntrySection kind="fixed" month={month} title="Expenses & regular bills" subtitle="Rent, utilities, groceries, fuel…" icon={<Receipt className="size-4" />} emptyHint="Try “electricity bill 4200” or “ada lunch 850” in the quick-add bar." entries={byKind.fixed} className="lg:col-span-2" />
      </div>
    </div>
  );
};
