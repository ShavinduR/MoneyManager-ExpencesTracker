import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Compass, Rocket, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { focusQuickEntry } from '@/components/quick-entry/quickEntryEvents';
import { completedCount, onboardingSteps, shouldShowChecklist, type OnboardingStepId } from '@/lib/onboarding';
import { cn } from '@/lib/cn';
import { currentMonthKey } from '@/lib/dates';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';

type StepCopy = { title: string; hint: string; action: string };

const COPY: Record<OnboardingStepId, StepCopy> = {
  balance: { title: 'Set your starting balance', hint: 'So carry-over begins from the right number.', action: 'Set balance' },
  entry: { title: 'Log your first entry', hint: 'Type it the way you’d text it:', action: 'Open quick-add' },
  goal: { title: 'Add a monthly goal', hint: 'One small, specific goal for this month.', action: 'Add a goal' },
  protect: { title: 'Protect or sync your data', hint: 'Export a backup so this device isn’t your only copy.', action: 'Open backup' },
};

const EXAMPLES = ['ada lunch 850', 'Petrol 1500'] as const;

/**
 * Dismissible "Getting started" card. Steps tick themselves off from live data; the card hides
 * itself once everything is done or when dismissed.
 */
export const GettingStarted = ({ className }: { className?: string }) => {
  const data = useFinanceStore((s) => s.data);
  const flags = useOnboardingStore((s) => s.flags);
  const update = useOnboardingStore((s) => s.update);
  const startTour = useUiStore((s) => s.startTour);
  const navigate = useNavigate();
  const steps = useMemo(() => onboardingSteps(data, flags), [data, flags]);

  if (!shouldShowChecklist(steps, flags)) return null;
  const done = completedCount(steps);

  const act = (id: OnboardingStepId): void => {
    switch (id) {
      case 'balance':
        navigate('/settings#starting-balance');
        return;
      case 'entry':
        focusQuickEntry();
        return;
      case 'goal':
        navigate(`/monthly/${currentMonthKey()}#monthly-goals`);
        return;
      case 'protect':
        navigate('/settings#backup');
        return;
    }
  };

  return (
    <Card role="region" className={cn('overflow-hidden', className)} aria-labelledby="getting-started-title">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400" aria-hidden>
          <Rocket className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="getting-started-title" className="text-[15px] font-semibold tracking-tight">
            Get set up in 4 steps
          </h2>
          <p className="text-xs text-muted">
            {done} of 4 done · each step ticks itself off
          </p>
        </div>
        <button
          type="button"
          onClick={startTour}
          className="hidden items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-700 hover:bg-accent-50 sm:inline-flex dark:text-accent-400 dark:hover:bg-accent-500/10"
        >
          <Compass className="size-3.5" aria-hidden /> 30s tour
        </button>
        <IconButton label="Hide getting started" className="-mr-2 -mt-1" onClick={() => update({ dismissed: true })}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="px-4 pt-3 sm:px-5">
        <ProgressBar value={done / 4} />
      </div>
      <ol className="mt-2 divide-y divide-zinc-100 dark:divide-ink-800">
        {steps.map(({ id, done: complete }, index) => {
          const copy = COPY[id];
          return (
            <li key={id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-semibold tabular',
                  complete ? 'border-accent-500 bg-accent-500 text-white dark:text-ink-950' : 'border-zinc-500 text-muted dark:border-zinc-500',
                )}
                aria-hidden
              >
                {complete ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', complete && 'text-muted line-through decoration-zinc-400')}>
                  {copy.title}
                  <span className="sr-only">{complete ? ' (done)' : ' (to do)'}</span>
                </p>
                {!complete && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span>{copy.hint}</span>
                    {id === 'entry' &&
                      EXAMPLES.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => focusQuickEntry(example)}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] text-zinc-700 transition-[border-color,background-color] hover:border-accent-500 hover:bg-accent-50 dark:border-ink-700 dark:bg-ink-850 dark:text-zinc-300 dark:hover:bg-accent-500/10"
                          aria-label={`Try “${example}” in quick-add`}
                        >
                          {example}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              {!complete && (
                <button
                  type="button"
                  onClick={() => act(id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-700 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
                >
                  {copy.action}
                  <ArrowRight className="size-3" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
};
