import { create } from 'zustand';

/** Transient UI state for overlays that live outside any page (help guide, guided tour). */
type UiState = {
  helpOpen: boolean;
  tourOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  /** Opt-in only: never called automatically on load. */
  startTour: () => void;
  endTour: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  helpOpen: false,
  tourOpen: false,
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
  startTour: () => set({ tourOpen: true, helpOpen: false }),
  endTour: () => set({ tourOpen: false }),
}));
