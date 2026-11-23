import { useState } from 'react';
import { Download, LifeBuoy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useFinanceStore } from '@/store/useFinanceStore';
import { downloadJson } from '@/data/backup';
import { toISODate } from '@/lib/dates';

/**
 * Shown when stored data exists but can't be read (e.g. it was written by a newer app version).
 * Nothing is written in this state: the user can download the raw data, then decide.
 */
export const RecoveryScreen = () => {
  const reason = useFinanceStore((s) => s.unreadableReason);
  const exportRawData = useFinanceStore((s) => s.exportRawData);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const [downloaded, setDownloaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async (): Promise<void> => {
    try {
      downloadJson(await exportRawData(), `mindset-planner-raw-recovery-${toISODate(new Date())}.json`);
      setDownloaded(true);
    } catch {
      setError('Couldn’t read storage to export it. Try another browser profile or contact support.');
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-ink-700 dark:bg-ink-900">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <LifeBuoy className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Your saved data needs attention</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          The planner found data on this device but couldn’t read it, so nothing has been changed or deleted. Download a copy first, then update the
          app or start over.
        </p>
        {reason && <p className="mt-3 rounded-xl bg-zinc-50 p-3 font-mono text-xs text-zinc-600 dark:bg-ink-850 dark:text-zinc-400">{reason}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="primary" icon={<Download className="size-4" />} onClick={() => void download()}>
            Download raw data
          </Button>
          {confirming ? (
            <Button
              variant="danger"
              icon={<RotateCcw className="size-4" />}
              onClick={() => void resetAll().then(() => window.location.reload()).catch(() => setError('Reset failed. Your data is unchanged.'))}
            >
              Yes, delete it and start over
            </Button>
          ) : (
            <Button icon={<RotateCcw className="size-4" />} disabled={!downloaded} onClick={() => setConfirming(true)} title={downloaded ? undefined : 'Download a copy first'}>
              Start over
            </Button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      </div>
    </main>
  );
};
