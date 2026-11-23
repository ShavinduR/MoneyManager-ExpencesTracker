import { create } from 'zustand';
import type { OnboardingFlags } from '@/lib/onboarding';
import { clearOnboardingFlags, getOnboardingFlags, setOnboardingFlags } from '@/lib/localPrefs';
import { DEFAULT_ONBOARDING_FLAGS } from '@/lib/onboarding';

const FLAG_KEYS = ['dismissed', 'protectVisited'] as const satisfies readonly (keyof OnboardingFlags)[];

type OnboardingState = {
  flags: OnboardingFlags;
  update: (patch: Partial<OnboardingFlags>) => void;
  reset: () => void;
};

/** Reactive wrapper around the device-only onboarding flags in lib/localPrefs. */
export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  flags: typeof window === 'undefined' ? { ...DEFAULT_ONBOARDING_FLAGS } : getOnboardingFlags(),
  update: (patch) => {
    const flags = { ...get().flags, ...patch };
    // Skip redundant writes (e.g. visiting Settings repeatedly).
    const current = get().flags;
    if (FLAG_KEYS.every((key) => flags[key] === current[key])) return;
    setOnboardingFlags(flags);
    set({ flags });
  },
  reset: () => {
    clearOnboardingFlags();
    set({ flags: { ...DEFAULT_ONBOARDING_FLAGS } });
  },
}));
