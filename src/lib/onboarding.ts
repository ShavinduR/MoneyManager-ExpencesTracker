import type { FinanceData } from '@/types/finance';

/**
 * "Getting started" checklist. Steps complete themselves from live data (and one device-only
 * flag), so the card never asks the user to tick anything by hand.
 */
export const ONBOARDING_STEPS = ['balance', 'entry', 'goal', 'protect'] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

/** Device-only flags (lib/localPrefs): never synced or exported. */
export type OnboardingFlags = {
  dismissed: boolean;
  /** Visited Settings → backup/sync, or exported a backup. */
  protectVisited: boolean;
};

export const DEFAULT_ONBOARDING_FLAGS: OnboardingFlags = { dismissed: false, protectVisited: false };

export type OnboardingStep = { id: OnboardingStepId; done: boolean };

const months = (data: FinanceData) => Object.values(data.months);

export const isStepDone = (id: OnboardingStepId, data: FinanceData, flags: OnboardingFlags): boolean => {
  switch (id) {
    case 'balance':
      return data.profile.initialBalance !== 0 || months(data).some((m) => m.openingBalanceOverride !== null);
    case 'entry':
      return months(data).some((m) => m.entries.length > 0 || m.otherBills.length > 0);
    case 'goal':
      return months(data).some((m) => m.goals.some((g) => g.text.trim().length > 0));
    case 'protect':
      return flags.protectVisited;
  }
};

export const onboardingSteps = (data: FinanceData, flags: OnboardingFlags): OnboardingStep[] =>
  ONBOARDING_STEPS.map((id) => ({ id, done: isStepDone(id, data, flags) }));

/** Hidden once every step is done or when dismissed. */
export const shouldShowChecklist = (steps: readonly OnboardingStep[], flags: OnboardingFlags): boolean =>
  !flags.dismissed && steps.some((s) => !s.done);

export const completedCount = (steps: readonly OnboardingStep[]): number => steps.filter((s) => s.done).length;
