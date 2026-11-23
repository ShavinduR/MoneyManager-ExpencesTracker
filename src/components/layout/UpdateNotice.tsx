import { RefreshCw } from 'lucide-react';
import { usePwaUpdate } from './pwaUpdate';

/**
 * Shown when a new version has been downloaded. Reloading is the user's choice, so an open form or a
 * half-typed reflection is never lost to an automatic update. Blurring first flushes autosaved text.
 */
export const UpdateNotice = () => {
  const needRefresh = usePwaUpdate((s) => s.needRefresh);
  const applyUpdate = usePwaUpdate((s) => s.applyUpdate);
  if (!needRefresh || !applyUpdate) return null;

  const reload = (): void => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.setTimeout(() => void applyUpdate(), 150);
  };

  return (
    <div role="status" className="fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 py-2.5 pl-4 pr-2 text-sm text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-900">
        <RefreshCw className="size-4 shrink-0 text-accent-400 dark:text-accent-700" aria-hidden />
        <span>A new version is ready.</span>
        <button
          type="button"
          onClick={reload}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-accent-400 hover:bg-white/10 dark:text-accent-700 dark:hover:bg-zinc-900/10"
        >
          Reload
        </button>
        <button type="button" onClick={() => usePwaUpdate.setState({ needRefresh: false })} className="rounded-lg px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 dark:text-zinc-600 dark:hover:bg-zinc-900/10">
          Later
        </button>
      </div>
    </div>
  );
};
