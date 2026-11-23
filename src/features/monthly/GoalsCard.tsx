import { useEffect, useState } from 'react';
import { Flag, Plus, X } from 'lucide-react';
import type { MonthGoal, MonthKey } from '@/types/finance';
import { Card, CardHeader } from '@/components/ui/Card';
import { CheckCircle } from '@/components/ui/CheckCircle';
import { IconButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { addGoal, removeGoal, updateGoal } from '@/lib/monthOps';
import { emptyGoal, MIN_MONTH_GOALS } from '@/lib/factories';
import { cn } from '@/lib/cn';
import { useFinanceStore } from '@/store/useFinanceStore';

/** Commits text on blur so we don't write to IndexedDB on every keystroke. */
const GoalRow = ({ goal, index, month, removable, autofocusTarget }: { goal: MonthGoal; index: number; month: MonthKey; removable: boolean; autofocusTarget: boolean }) => {
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const [text, setText] = useState(goal.text);
  useEffect(() => setText(goal.text), [goal.text]);

  const commit = (): void => {
    if (text !== goal.text) updateMonth(month, (r) => updateGoal(r, goal.id, { text }));
  };

  return (
    <li className="group flex items-center gap-3 px-4 py-1.5 sm:px-5">
      <CheckCircle
        checked={goal.done}
        onChange={() => updateMonth(month, (r) => updateGoal(r, goal.id, { done: !goal.done, text }))}
        label={`Mark goal ${index + 1} ${goal.done ? 'not done' : 'done'}`}
      />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder={`Goal ${index + 1}`}
        data-autofocus={autofocusTarget || undefined}
        aria-label={`Goal ${index + 1}`}
        maxLength={120}
        className={cn(
          'h-9 min-w-0 flex-1 border-b border-dashed border-transparent bg-transparent text-sm placeholder:text-subtle hover:border-zinc-200 focus:border-accent-500 focus:outline-none dark:placeholder:text-subtle dark:hover:border-ink-700',
          goal.done && 'text-subtle line-through decoration-zinc-300',
        )}
      />
      {removable && (
        <IconButton label={`Remove goal ${index + 1}`} tone="danger" className="size-7 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100" onClick={() => updateMonth(month, (r) => removeGoal(r, goal.id))}>
          <X className="size-3.5" />
        </IconButton>
      )}
    </li>
  );
};

export const GoalsCard = ({ month, goals }: { month: MonthKey; goals: MonthGoal[] }) => {
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const padded = goals.length >= MIN_MONTH_GOALS ? goals : [...goals, ...Array.from({ length: MIN_MONTH_GOALS - goals.length }, emptyGoal)];
  const filled = padded.filter((g) => g.text.trim());
  const firstEmptyId = padded.find((g) => !g.text.trim())?.id;
  const done = filled.filter((g) => g.done).length;

  return (
    <Card className="flex flex-col" id="monthly-goals">
      <CardHeader
        title="This month’s goals"
        subtitle={filled.length ? `${done} of ${filled.length} complete` : 'Small, specific, doable'}
        icon={<Flag className="size-4" />}
        action={
          <IconButton label="Add goal" onClick={() => updateMonth(month, (r) => addGoal({ ...r, goals: padded }, emptyGoal()))}>
            <Plus className="size-4" />
          </IconButton>
        }
      />
      {filled.length > 0 && (
        <div className="px-4 pt-3 sm:px-5">
          <ProgressBar value={done / filled.length} />
        </div>
      )}
      <ul className="py-2">
        {padded.map((goal, index) => (
          <GoalRow key={goal.id} goal={goal} index={index} month={month} removable={padded.length > MIN_MONTH_GOALS} autofocusTarget={goal.id === firstEmptyId} />
        ))}
      </ul>
    </Card>
  );
};
