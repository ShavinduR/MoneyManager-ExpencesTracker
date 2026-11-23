import { create } from 'zustand';

/** Transient UI state for overlays that live outside any page (help guide, guided tour, device sync). */
type UiState = {
  helpOpen: boolean;
  tourOpen: boolean;
  syncOpen: boolean;
  openSync: () => void;
  closeSync: () => void;
  closeAll: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  /** Opt-in only: never called automatically on load. */
  startTour: () => void;
  endTour: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  helpOpen: false,
  tourOpen: false,
  syncOpen: false,
  openSync: () => set({ syncOpen: true, helpOpen: false }),
  closeSync: () => set({ syncOpen: false }),
  closeAll: () => set({ helpOpen: false, tourOpen: false, syncOpen: false }),
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
  startTour: () => set({ tourOpen: true, helpOpen: false }),
  endTour: () => set({ tourOpen: false }),
}));
