import { useEffect, useState, type FormEvent } from 'react';
import { Download } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Field';
import { toast } from '@/components/ui/toast';
import { backupStats, downloadBackup } from '@/data/backup';
import { generateConfirmCode, matchesConfirmCode } from '@/lib/confirmCode';
import { useFinanceStore } from '@/store/useFinanceStore';

/**
 * "Delete everything" needs a fresh random 4-digit code typed back, so a stray tap or a curious
 * person with the unlocked phone can't wipe the planner in one click.
 */
export const ResetDataDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const data = useFinanceStore((s) => s.data);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const [code, setCode] = useState(generateConfirmCode);
  const [typed, setTyped] = useState('');
  const stats = backupStats(data);
  const confirmed = matchesConfirmCode(typed, code);

  // New code every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setCode(generateConfirmCode());
    setTyped('');
  }, [open]);

  const reset = (): void => {
    void resetAll()
      .then(() => toast.success('All data cleared'))
      .catch(() => toast.error('Reset failed. Your data is unchanged.'));
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!confirmed) return;
    reset();
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete all data on this device?"
      description="This can’t be undone."
      confirmLabel="Delete everything"
      tone="danger"
      confirmDisabled={!confirmed}
      onClose={onClose}
      onConfirm={reset}
    >
      <form onSubmit={submit} className="space-y-4 text-sm" noValidate>
        <p className="text-muted">
          This removes {stats.months} months, {stats.entries} entries, {stats.debts} debts, {stats.accounts} bank accounts and all goals and reflections from this
          device. Other devices and backup files aren’t affected.
        </p>
        <button
          type="button"
          onClick={() => {
            downloadBackup(data);
            toast.success('Backup downloaded');
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-accent-700 underline-offset-2 hover:underline dark:text-accent-400"
        >
          <Download className="size-3.5" aria-hidden /> Download a backup first
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/30 dark:bg-red-500/10">
          <label htmlFor="reset-confirm-code" className="block text-xs font-medium text-red-800 dark:text-red-200">
            To confirm, type <span className="font-mono text-base font-semibold tracking-[0.2em] tabular" aria-hidden>
              {code}
            </span>
            <span className="sr-only">{code.split('').join(' ')}</span>
          </label>
          <Input
            id="reset-confirm-code"
            data-autofocus
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0000"
            aria-describedby="reset-confirm-hint"
            className="mx-auto mt-2 max-w-32 text-center font-mono text-xl tracking-[0.2em] tabular"
          />
          <p id="reset-confirm-hint" className="mt-2 text-xs text-red-800 dark:text-red-200" aria-live="polite">
            {confirmed ? 'Code matches. “Delete everything” is now enabled.' : 'The delete button unlocks when the code matches.'}
          </p>
        </div>
      </form>
    </ConfirmDialog>
  );
};
