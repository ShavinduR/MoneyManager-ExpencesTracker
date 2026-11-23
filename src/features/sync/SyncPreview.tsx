import { useState } from 'react';
import { Download, RefreshCcw, TriangleAlert } from 'lucide-react';
import type { FinanceData } from '@/types/finance';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { backupStats, downloadBackup, type BackupStats } from '@/data/backup';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useOnboardingStore } from '@/store/onboardingStore';

const ROWS: readonly [keyof BackupStats, string][] = [
  ['months', 'Months'],
  ['entries', 'Entries'],
  ['bills', 'Other bills'],
  ['debts', 'Debts'],
  ['accounts', 'Bank accounts'],
  ['goals', 'Yearly goals'],
];

/**
 * Sync Preview Card: received data is never applied silently. The user sees what arrived next to
 * what this device has, and must choose "Apply & Replace Local Data".
 */
export const SyncPreview = ({ incoming, sentAt, onCancel, onApplied }: { incoming: FinanceData; sentAt: string | null; onCancel: () => void; onApplied: () => void }) => {
  const local = useFinanceStore((s) => s.data);
  const replaceAll = useFinanceStore((s) => s.replaceAll);
  const markProtected = useOnboardingStore((s) => s.update);
  const [applying, setApplying] = useState(false);
  const next = backupStats(incoming);
  const now = backupStats(local);
  const from = incoming.profile.name.trim();

  const apply = (): void => {
    setApplying(true);
    // Theme is a per-device choice: keep this device's.
    void replaceAll({ ...incoming, profile: { ...incoming.profile, theme: local.profile.theme } })
      .then(() => {
        markProtected({ protectVisited: true });
        toast.success('Synced from your other device');
        onApplied();
      })
      .catch(() => {
        setApplying(false);
        toast.error('Couldn’t save the synced data. Nothing on this device was changed.');
      });
  };

  return (
    <section aria-labelledby="sync-preview-title" className="space-y-4">
      <div>
        <h3 id="sync-preview-title" className="text-sm font-semibold">
          Sync preview
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          Verified and decrypted{from ? ` · from ${from}` : ''}
          {sentAt ? ` · sent ${new Date(sentAt).toLocaleString()}` : ''}
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-ink-700">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-muted dark:bg-ink-850">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Data
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Incoming
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                This device
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-ink-800">
            {ROWS.map(([key, label]) => (
              <tr key={key}>
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  {label}
                </th>
                <td className="px-3 py-1.5 text-right font-semibold tabular">{next[key]}</td>
                <td className="px-3 py-1.5 text-right text-muted tabular">{now[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span>Applying replaces everything on this device with the incoming data. Your theme, Gemini key and other device settings stay as they are.</span>
      </p>
      <button
        type="button"
        onClick={() => downloadBackup(local)}
        className="inline-flex items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-accent-700 underline-offset-2 hover:underline dark:text-accent-400"
      >
        <Download className="size-3.5" aria-hidden /> Download a backup of this device first
      </button>
      <div className="flex flex-wrap justify-end gap-2">
        <Button className="max-sm:w-full" onClick={onCancel} disabled={applying}>
          Cancel
        </Button>
        <Button className="max-sm:w-full" variant="danger" icon={<RefreshCcw className="size-4" />} onClick={apply} disabled={applying}>
          Apply & Replace Local Data
        </Button>
      </div>
    </section>
  );
};
