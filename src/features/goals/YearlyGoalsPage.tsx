import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Plus, Sparkles, Target, Trophy } from 'lucide-react';
import type { GoalStatus, YearPlan, YearlyGoal } from '@/types/finance';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Textarea } from '@/components/ui/Field';
import { emptyYearPlan, GOAL_SLOTS } from '@/lib/factories';
import { GOAL_STATUS_LABELS, goalProgress, goalStats } from '@/lib/goals';
import { cn } from '@/lib/cn';
import { useAutosaveText } from '@/hooks/useAutosaveText';
import { useFinanceStore } from '@/store/useFinanceStore';
import { GoalFormModal } from './GoalFormModal';

const STATUS_TONE: Record<GoalStatus, BadgeTone> = { 'not-started': 'neutral', 'in-progress': 'blue', achieved: 'green', paused: 'amber' };

const GoalCard = ({ goal, onOpen }: { goal: YearlyGoal; onOpen: () => void }) => {
  const progress = goalProgress(goal);
  const empty = !goal.title.trim();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-start gap-4 rounded-[var(--radius-card)] border p-4 text-left transition-[border-color,box-shadow,background-color] duration-150 sm:p-5',
        empty
          ? 'border-dashed border-zinc-300 hover:border-accent-500 hover:bg-accent-50/40 dark:border-ink-700 dark:hover:bg-accent-500/5'
          : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular',
          goal.status === 'achieved' ? 'bg-accent-500 text-white dark:text-ink-950' : empty ? 'bg-zinc-100 text-zinc-400 dark:bg-ink-850' : 'bg-zinc-900 text-white dark:bg-ink-800',
        )}
      >
        {goal.status === 'achieved' ? <Trophy className="size-4" /> : goal.slot}
      </span>
      <div className="min-w-0 flex-1">
        {empty ? (
          <p className="flex items-center gap-1.5 pt-2 text-sm text-zinc-400 group-hover:text-accent-600 dark:group-hover:text-accent-400">
            <Plus className="size-3.5" /> Set goal {goal.slot}
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className={cn('font-medium leading-snug text-pretty', goal.status === 'achieved' && 'text-zinc-500 line-through decoration-zinc-300 dark:text-zinc-400')}>{goal.title}</p>
              <Badge tone={STATUS_TONE[goal.status]}>{GOAL_STATUS_LABELS[goal.status]}</Badge>
            </div>
            {progress !== null && (
              <div className="mt-3">
                <ProgressBar value={progress} />
                <p className="mt-1.5 flex justify-between text-xs text-zinc-500">
                  <span>
                    <Money value={goal.currentAmount} className="font-medium text-zinc-700 dark:text-zinc-300" />
                    {goal.targetAmount !== null && <> of <Money value={goal.targetAmount} /></>}
                  </span>
                  <span className="tabular">{Math.round(progress * 100)}%</span>
                </p>
              </div>
            )}
            {goal.notes && <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{goal.notes}</p>}
          </>
        )}
      </div>
    </button>
  );
};

type AutosaveAreaProps = { value: string; onCommit: (v: string) => void; placeholder: string; id: string; className?: string; bare?: boolean };

const AutosaveArea = ({ value, onCommit, placeholder, id, className, bare }: AutosaveAreaProps) => {
  const field = useAutosaveText(value, onCommit);
  const props = { id, value: field.text, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => field.onChange(e.target.value), onBlur: field.flush, placeholder, maxLength: 2000 };
  return bare ? <textarea {...props} className={className} /> : <Textarea {...props} className={className} />;
};

const YearView = ({ year, plan }: { year: number; plan: YearPlan }) => {
  const updateYearPlan = useFinanceStore((s) => s.updateYearPlan);
  const [editing, setEditing] = useState<YearlyGoal | null>(null);
  // Older data may miss slots; fill gaps with stable empty goals for this year.
  const filler = useMemo(() => emptyYearPlan(year).goals, [year]);
  const goals = GOAL_SLOTS.flatMap((slot) => {
    const goal = plan.goals.find((g) => g.slot === slot) ?? filler.find((g) => g.slot === slot);
    return goal ? [goal] : [];
  });
  const stats = goalStats(goals);

  const saveGoal = (goal: YearlyGoal): void =>
    updateYearPlan(year, (p) => ({
      ...p,
      goals: goals.map((g) => (g.slot === goal.slot ? goal : (p.goals.find((x) => x.slot === g.slot) ?? g))),
    }));

  return (
    <>
      <Card className="relative mb-4 overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative p-5 sm:p-6">
          <label htmlFor={`commit-${year}`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-400">
            <Sparkles className="size-3.5" /> This year, I will…
          </label>
          <AutosaveArea
            id={`commit-${year}`}
            value={plan.commitment}
            onCommit={(commitment) => updateYearPlan(year, (p) => ({ ...p, commitment }))}
            placeholder="Write your commitment for the year in one or two sentences."
            bare
            className="mt-2 block min-h-16 w-full resize-none rounded-lg bg-transparent text-lg font-medium leading-relaxed tracking-tight text-balance placeholder:text-zinc-400 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span><b className="text-zinc-800 dark:text-zinc-200">{stats.set}</b> of 8 goals set</span>
            <span><b className="text-emerald-600 dark:text-emerald-400">{stats.achieved}</b> achieved</span>
            <span><b className="text-sky-600 dark:text-sky-400">{stats.inProgress}</b> in progress</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {goals.map((goal) => <GoalCard key={goal.id} goal={goal} onOpen={() => setEditing(goal)} />)}
      </div>

      <Card className="mt-4">
        <CardHeader title="My mind map" subtitle="Free-form space for ideas, dreams and connections" icon={<Lightbulb className="size-4" />} />
        <div className="p-4 sm:p-5">
          <AutosaveArea
            id={`mindmap-${year}`}
            value={plan.mindMap}
            onCommit={(mindMap) => updateYearPlan(year, (p) => ({ ...p, mindMap }))}
            placeholder={'Freedom → no debt · emergency fund\nIncome → raise · side project\nHabits → track daily · reflect monthly'}
            className="min-h-40 bg-[radial-gradient(circle,_rgb(161_161_170/0.35)_1px,_transparent_1px)] bg-[length:18px_18px] font-mono text-[13px] leading-7"
          />
        </div>
      </Card>

      {editing && <GoalFormModal open onClose={() => setEditing(null)} goal={editing} year={year} onSave={saveGoal} />}
    </>
  );
};

export const YearlyGoalsPage = () => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const stored = useFinanceStore((s) => s.data.yearPlans[String(year)]);
  const plan = useMemo(() => stored ?? emptyYearPlan(year), [stored, year]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="My yearly financial goals"
        subtitle="Eight goals, one commitment. Revisit them every month."
        actions={
          <div className="flex items-center gap-1">
            <IconButton label="Previous year" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="size-4" /></IconButton>
            <span className="flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold tabular">
              <Target className="size-4 text-accent-500" /> {year}
            </span>
            <IconButton label="Next year" onClick={() => setYear((y) => y + 1)}><ChevronRight className="size-4" /></IconButton>
          </div>
        }
      />
      <YearView key={year} year={year} plan={plan} />
    </div>
  );
};
