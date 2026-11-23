import { create } from 'zustand';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'info' | 'error';
type Toast = { id: number; message: string; tone: ToastTone; action?: { label: string; run: () => void } };

type ToastState = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { ...toast, id }] });
    window.setTimeout(() => get().dismiss(id), toast.action ? 6000 : 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message: string, action?: Toast['action']) => useToasts.getState().push({ message, tone: 'success', action }),
  info: (message: string) => useToasts.getState().push({ message, tone: 'info' }),
  error: (message: string) => useToasts.getState().push({ message, tone: 'error' }),
};

const ICONS = { success: CheckCircle2, info: Info, error: TriangleAlert } as const;

export const Toaster = () => {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-zinc-900 py-2.5 pl-3.5 pr-2 text-sm text-white shadow-xl animate-pop-in dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Icon className={cn('size-4 shrink-0', t.tone === 'error' ? 'text-red-400 dark:text-red-600' : 'text-accent-400 dark:text-accent-700')} />
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action ? (
              <button
                type="button"
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-accent-400 hover:bg-white/10 dark:text-accent-700 dark:hover:bg-zinc-900/10"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : (
              <span className="w-1" />
            )}
          </div>
        );
      })}
    </div>
  );
};
