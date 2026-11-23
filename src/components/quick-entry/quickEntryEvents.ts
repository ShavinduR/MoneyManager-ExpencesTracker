/** Lets other parts of the app focus (and optionally pre-fill) the header quick-add bar. */
export const QUICK_ENTRY_EVENT = 'mfp:quick-entry';

export type QuickEntryRequest = { text?: string };

export const focusQuickEntry = (text?: string): void => {
  window.dispatchEvent(new CustomEvent<QuickEntryRequest>(QUICK_ENTRY_EVENT, { detail: { text } }));
};

export const isQuickEntryRequest = (event: Event): event is CustomEvent<QuickEntryRequest> =>
  event instanceof CustomEvent && typeof event.detail === 'object' && event.detail !== null;
