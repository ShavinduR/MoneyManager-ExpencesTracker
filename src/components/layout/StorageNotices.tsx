import { AlertTriangle, Download, HardDrive, Info, RotateCw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { downloadBackup, downloadJson } from '@/data/backup';
import { toISODate } from '@/lib/dates';
import { cn } from '@/lib/cn';

const Notice = ({ tone, icon, children, actions }: { tone: 'amber' | 'red' | 'blue'; icon: ReactNode; children: ReactNode; actions?: ReactNode }) => (
  <div
    role={tone === 'red' ? 'alert' : 'status'}
    className={cn(
      'flex flex-wrap items-start gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 text-sm',
      tone === 'red' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
      tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
      tone === 'blue' && 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
    )}
  >
    <span className="mt-0.5 shrink-0">{icon}</span>
    <div className="min-w-0 flex-1">{children}</div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const actionClass = 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline';

/** Load problems (C1), save failures (M3) and limited storage (H1), surfaced instead of hidden in the console. */
export const StorageNotices = () => {
  const storageMode = useFinanceStore((s) => s.storageMode);
  const loadIssues = useFinanceStore((s) => s.loadIssues);
  const saveError = useFinanceStore((s) => s.saveError);
  const data = useFinanceStore((s) => s.data);
  const exportRawData = useFinanceStore((s) => s.exportRawData);
  const dismissLoadIssues = useFinanceStore((s) => s.dismissLoadIssues);

  if (!saveError && loadIssues.length === 0 && storageMode === 'indexeddb') return null;

  return (
    <div className="mb-4 space-y-2">
      {saveError && (
        <Notice
          tone="red"
          icon={<AlertTriangle className="size-4" />}
          actions={
            <>
              <button type="button" className={actionClass} onClick={saveError.retry}>
                <RotateCw className="size-3.5" /> Retry
              </button>
              <button type="button" className={actionClass} onClick={() => downloadBackup(data)}>
                <Download className="size-3.5" /> Export backup
              </button>
            </>
          }
        >
          {saveError.message}
        </Notice>
      )}
      {loadIssues.length > 0 && (
        <Notice
          tone="amber"
          icon={<AlertTriangle className="size-4" />}
          actions={
            <>
              <button type="button" className={actionClass} onClick={() => void exportRawData().then((raw) => downloadJson(raw, `mindset-planner-raw-recovery-${toISODate(new Date())}.json`))}>
                <Download className="size-3.5" /> Download raw copy
              </button>
              <button type="button" className={actionClass} onClick={dismissLoadIssues} aria-label="Dismiss">
                <X className="size-3.5" />
              </button>
            </>
          }
        >
          <p className="font-medium">Some saved data couldn’t be read. Everything else loaded normally, and a raw copy was kept.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {loadIssues.slice(0, 4).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
            {loadIssues.length > 4 && <li>…and {loadIssues.length - 4} more</li>}
          </ul>
        </Notice>
      )}
      {storageMode === 'localstorage' && (
        <Notice tone="blue" icon={<Info className="size-4" />}>
          This browser blocked the main database, so the planner is using limited storage. It works, but export a backup regularly.
        </Notice>
      )}
      {storageMode === 'memory' && (
        <Notice
          tone="amber"
          icon={<HardDrive className="size-4" />}
          actions={
            <button type="button" className={actionClass} onClick={() => downloadBackup(data)}>
              <Download className="size-3.5" /> Export backup
            </button>
          }
        >
          This browser isn’t allowing the site to store data (private mode or blocked storage). Changes will be lost when you close the tab. Export a
          backup before leaving.
        </Notice>
      )}
    </div>
  );
};
