import { Check, Lightbulb, NotebookPen } from 'lucide-react';
import type { MonthKey } from '@/types/finance';
import { Card, CardHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import { useAutosaveText, type SaveState } from '@/hooks/useAutosaveText';
import { useFinanceStore } from '@/store/useFinanceStore';
import { cn } from '@/lib/cn';

const PROMPTS = [
  'What surprised me about my spending?',
  'One habit that saved me money',
  'What I’ll do differently next month',
  'A money win I’m proud of',
];

const SaveIndicator = ({ state }: { state: SaveState }) => (
  <span className={cn('flex items-center gap-1 text-[11px] transition-opacity duration-200', state === 'idle' ? 'opacity-0' : 'opacity-100', state === 'saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400')} aria-live="polite">
    {state === 'saved' && <Check className="size-3" />}
    {state === 'dirty' ? 'Saving…' : state === 'saved' ? 'Saved' : ''}
  </span>
);

type Props = { month: MonthKey; notes: string; reflection: string };

export const ReflectionPanel = ({ month, notes, reflection }: Props) => {
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const notesField = useAutosaveText(notes, (text) => updateMonth(month, (r) => ({ ...r, notes: text })));
  const reflectionField = useAutosaveText(reflection, (text) => updateMonth(month, (r) => ({ ...r, reflection: text })));

  const insertPrompt = (prompt: string): void => {
    const prefix = reflectionField.text.trim() ? `${reflectionField.text.trimEnd()}\n\n` : '';
    reflectionField.onChange(`${prefix}${prompt} `);
  };

  return (
    <Card className="flex flex-col lg:col-span-2">
      <CardHeader title="Mindset & reflection" subtitle="Saved automatically as you write" icon={<NotebookPen className="size-4" />} />
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-5">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor={`notes-${month}`} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Notes</label>
            <SaveIndicator state={notesField.state} />
          </div>
          <Textarea id={`notes-${month}`} value={notesField.text} onChange={(e) => notesField.onChange(e.target.value)} onBlur={notesField.flush} placeholder="Reminders, upcoming expenses, things to check…" className="min-h-40 flex-1" maxLength={2000} />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-3">
          <div className="flex items-center justify-between">
            <label htmlFor={`reflection-${month}`} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">This month taught me…</label>
            <SaveIndicator state={reflectionField.state} />
          </div>
          <Textarea
            id={`reflection-${month}`}
            value={reflectionField.text}
            onChange={(e) => reflectionField.onChange(e.target.value)}
            onBlur={reflectionField.flush}
            placeholder="Write freely. What did money teach you this month?"
            className="min-h-40 flex-1 font-[450] leading-7"
            maxLength={4000}
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Lightbulb className="size-3.5 text-amber-500" aria-hidden />
            {PROMPTS.map((p) => (
              <button key={p} type="button" onClick={() => insertPrompt(p)} className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 transition-[background-color,border-color] hover:border-accent-500 hover:bg-accent-50 dark:border-ink-700 dark:text-zinc-400 dark:hover:bg-accent-500/10">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
