import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Centered dialog on desktop, bottom sheet on mobile. Esc / backdrop closes; focus moves inside on open. */
export const Modal = ({ open, onClose, title, description, children, footer }: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const firstField = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
    firstField?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] animate-[fade-up_150ms_ease-out]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-zinc-200 bg-white shadow-2xl animate-pop-in sm:max-w-lg sm:rounded-3xl dark:border-ink-700 dark:bg-ink-900"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-zinc-200 sm:hidden dark:bg-ink-700" />
        <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:pt-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} data-close className="-mr-2 -mt-1">
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3 safe-bottom dark:border-ink-800">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};
