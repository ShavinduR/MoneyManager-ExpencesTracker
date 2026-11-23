import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CornerDownLeft, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { parseQuickEntry, type ParseResult, type QuickEntryDraft } from '@/lib/quickEntry/parser';
import { parseWithGemini, resolveGeminiKey } from '@/lib/quickEntry/llmParser';
import { getGeminiKey, getGeminiModel } from '@/lib/localPrefs';
import { formatMonthLong, monthKeyOf } from '@/lib/dates';
import { removeEntry } from '@/lib/monthOps';
import { useFinanceStore } from '@/store/useFinanceStore';
import { toast } from '@/components/ui/toast';
import { useFormatMoney } from '@/components/ui/Money';
import { ConfirmationPill } from './ConfirmationPill';

const EXAMPLES = ['Petrol 1500 today', 'Salary 85000', 'ada lunch 850', 'electricity bill 4200', 'iye kema 1200', 'save 10000 emergency'];

type QuickEntryBarProps = { className?: string; autoFocusShortcut?: boolean };

/** Natural-language quick add. Parses offline as you type; Enter confirms the pill. */
export const QuickEntryBar = ({ className, autoFocusShortcut = false }: QuickEntryBarProps) => {
  const [text, setText] = useState('');
  const [aiResult, setAiResult] = useState<ParseResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [override, setOverride] = useState<QuickEntryDraft | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debts = useFinanceStore((s) => s.data.debts);
  const llmEnabled = useFinanceStore((s) => s.data.profile.llmEnabled);
  const addFromDraft = useFinanceStore((s) => s.addFromDraft);
  const updateMonth = useFinanceStore((s) => s.updateMonth);
  const format = useFormatMoney();
  const [exampleIndex, setExampleIndex] = useState(0);

  const ruleResult = useMemo(() => (text.trim() ? parseQuickEntry(text, { debts }) : null), [text, debts]);
  const result = aiResult ?? ruleResult;
  const draft = override ?? (result?.ok ? result.draft : null);
  const apiKey = llmEnabled ? resolveGeminiKey(getGeminiKey()) : null;

  useEffect(() => {
    if (focused || text) return;
    const timer = window.setInterval(() => setExampleIndex((i) => (i + 1) % EXAMPLES.length), 3200);
    return () => window.clearInterval(timer);
  }, [focused, text]);

  useEffect(() => {
    if (!autoFocusShortcut) return;
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      // Never steal keys while the user is typing: Ctrl+K deletes to end of line in macOS text fields (M4).
      if (typing) return;
      if (event.key === '/' || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [autoFocusShortcut]);

  const reset = (): void => {
    setText('');
    setAiResult(null);
    setOverride(null);
  };

  const save = (toSave: QuickEntryDraft): void => {
    const entry = addFromDraft(toSave);
    const month = monthKeyOf(toSave.date);
    reset();
    toast.success(`Added ${entry.description} · ${format(entry.amount)} to ${formatMonthLong(month)}`, {
      label: 'Undo',
      run: () => updateMonth(month, (r) => removeEntry(r, entry.id)),
    });
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (draft) save(draft);
  };

  const runAi = async (): Promise<void> => {
    if (!apiKey || !text.trim()) return;
    setAiLoading(true);
    setOverride(null);
    const r = await parseWithGemini(text, { apiKey, model: getGeminiModel(), debts });
    setAiLoading(false);
    if (r.ok) setAiResult(r);
    else toast.error(r.reason);
  };

  const showPanel = text.trim().length > 0;

  return (
    <div className={cn('relative w-full', className)}>
      <form onSubmit={onSubmit} role="search" aria-label="Quick add transaction">
        <div
          className={cn(
            'flex h-11 items-center gap-2 rounded-2xl border bg-white pl-3.5 pr-1.5 transition-[border-color,box-shadow] duration-150 dark:bg-ink-850',
            focused ? 'border-accent-500 ring-4 ring-accent-500/15' : 'border-zinc-200 dark:border-ink-700',
          )}
        >
          <Sparkles className="size-4 shrink-0 text-accent-500" aria-hidden />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setAiResult(null);
              setOverride(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                reset();
                inputRef.current?.blur();
              }
            }}
            placeholder={`Quick add — try “${EXAMPLES[exampleIndex] ?? ''}”`}
            aria-label="Quick add: describe a transaction, e.g. Petrol 1500 today"
            className="h-full min-w-0 flex-1 bg-transparent text-sm placeholder:text-subtle focus:outline-none"
            autoComplete="off"
            enterKeyHint="done"
          />
          {text && (
            <button type="button" onClick={reset} className="rounded-lg p-1.5 text-subtle hover:text-zinc-700 dark:hover:text-zinc-200" aria-label="Clear">
              <X className="size-4" />
            </button>
          )}
          {!text && (
            <kbd className="mr-1 hidden rounded-md border border-zinc-200 px-1.5 py-0.5 font-sans text-[10px] text-subtle lg:block dark:border-ink-700">/</kbd>
          )}
          {apiKey && text && (
            <button
              type="button"
              onClick={() => void runAi()}
              disabled={aiLoading}
              className="flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-60 dark:text-violet-400 dark:hover:bg-violet-500/10"
              title="Parse with AI (Gemini)"
            >
              {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
              <span className="hidden sm:inline">AI</span>
            </button>
          )}
          <button
            type="submit"
            disabled={!draft}
            className="flex size-8 items-center justify-center rounded-xl bg-zinc-900 text-white transition-[background-color,opacity,transform] active:scale-95 disabled:opacity-30 dark:bg-accent-500 dark:text-ink-950"
            aria-label="Add transaction"
          >
            <CornerDownLeft className="size-4" />
          </button>
        </div>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-30 mt-2">
          {draft ? (
            <ConfirmationPill draft={draft} onChange={setOverride} onConfirm={() => save(draft)} />
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-muted shadow-lg animate-pop-in dark:border-ink-700 dark:bg-ink-850">
              {result && !result.ok ? result.reason : 'Keep typing…'}
              {apiKey && <span className="ml-1">Or tap <b className="text-violet-600 dark:text-violet-400">AI</b> to parse it.</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
