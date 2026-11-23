import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
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

/**
 * Native `<dialog>` opened with `showModal()`: the browser traps focus inside it and makes the rest of
 * the page inert (audit H4). Centered on desktop, bottom sheet on mobile. Escape or a backdrop click
 * closes; focus returns to whatever opened it.
 */
export const Modal = ({ open, onClose, title, description, children, footer }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Keep the latest onClose without re-running the open effect on every parent render (L9).
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previouslyFocused = document.activeElement;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialog.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();

    const onCancel = (event: Event): void => {
      // Escape: let React state drive closing so parent state stays in sync.
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      document.body.style.overflow = '';
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-inherit backdrop:bg-zinc-950/40 backdrop:backdrop-blur-[2px]"
    >
      <div
        className="flex h-full w-full items-end justify-center sm:items-center sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onCloseRef.current();
        }}
      >
        <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl animate-pop-in sm:max-w-lg sm:rounded-3xl dark:border-ink-700 dark:bg-ink-900 dark:text-zinc-100">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-zinc-200 sm:hidden dark:bg-ink-700" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:pt-5">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
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
      </div>
    </dialog>
  );
};
