import type { ThemePreference } from '@/types/finance';
import { DEFAULT_ONBOARDING_FLAGS, type OnboardingFlags } from './onboarding';
import { GUIDE_LANGUAGES, type GuideLanguage } from './guideLanguage';

/**
 * Device-only preferences kept OUT of FinanceData, so they are never included in JSON exports.
 * The Gemini key in particular must not leave this browser in a backup file.
 */
const GEMINI_KEY = 'mfp-gemini-key';
const GEMINI_MODEL_KEY = 'mfp-gemini-model';
const THEME_KEY = 'mfp-theme';
const SIDEBAR_KEY = 'mfp-sidebar-collapsed';
const ONBOARDING_KEY = 'mfp-onboarding';
const GUIDE_LANG_KEY = 'mfp-guide-lang';

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode); preference just won't persist */
  }
};

export const getGeminiKey = (): string | null => safeGet(GEMINI_KEY);
export const setGeminiKey = (key: string | null): void => safeSet(GEMINI_KEY, key && key.trim() ? key.trim() : null);

/**
 * Gemini model id (L14). Google retires model versions, so this is a device setting rather than a
 * hard-coded constant: if the default stops working, users can switch without an app update.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const isValidModelId = (value: string): boolean => /^[a-z0-9][a-z0-9.-]{2,63}$/.test(value);
export const getGeminiModel = (): string => {
  const stored = safeGet(GEMINI_MODEL_KEY);
  return stored && isValidModelId(stored) ? stored : DEFAULT_GEMINI_MODEL;
};
export const setGeminiModel = (model: string): void =>
  safeSet(GEMINI_MODEL_KEY, model.trim() && model.trim() !== DEFAULT_GEMINI_MODEL ? model.trim() : null);

/** Mirrors profile.theme so index.html can apply it before React loads (no flash). */
export const mirrorTheme = (theme: ThemePreference): void => safeSet(THEME_KEY, theme);

export const getSidebarCollapsed = (): boolean => safeGet(SIDEBAR_KEY) === '1';
export const setSidebarCollapsed = (collapsed: boolean): void => safeSet(SIDEBAR_KEY, collapsed ? '1' : '0');

/** Onboarding checklist flags: device-only, never part of FinanceData, backups or sync payloads. */
export const getOnboardingFlags = (): OnboardingFlags => {
  const raw = safeGet(ONBOARDING_KEY);
  if (!raw) return { ...DEFAULT_ONBOARDING_FLAGS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_ONBOARDING_FLAGS };
    const flag = (key: keyof OnboardingFlags): boolean => key in parsed && Reflect.get(parsed, key) === true;
    return { dismissed: flag('dismissed'), protectVisited: flag('protectVisited'), sampleLoaded: flag('sampleLoaded') };
  } catch {
    return { ...DEFAULT_ONBOARDING_FLAGS };
  }
};

export const setOnboardingFlags = (flags: OnboardingFlags): void => safeSet(ONBOARDING_KEY, JSON.stringify(flags));

export const clearOnboardingFlags = (): void => safeSet(ONBOARDING_KEY, null);

/** Last language chosen in the "How it works" guide (device-only). */
export const getGuideLanguage = (): GuideLanguage => GUIDE_LANGUAGES.find((l) => l === safeGet(GUIDE_LANG_KEY)) ?? 'en';
export const setGuideLanguage = (lang: GuideLanguage): void => safeSet(GUIDE_LANG_KEY, lang);
