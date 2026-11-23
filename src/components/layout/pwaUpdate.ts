import { create } from 'zustand';

type PwaUpdateState = {
  needRefresh: boolean;
  /** Set by main.tsx once the service worker is registered. */
  applyUpdate: (() => Promise<void>) | null;
};

/** A new app version waits here until the user chooses to reload (L11). */
export const usePwaUpdate = create<PwaUpdateState>(() => ({ needRefresh: false, applyUpdate: null }));
