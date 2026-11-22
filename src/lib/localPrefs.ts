import type { ThemePreference } from '@/types/finance';

/**
 * Device-only preferences kept OUT of FinanceData, so they are never included in JSON exports.
 * The Gemini key in particular must not leave this browser in a backup file.
 */
const GEMINI_KEY = 'mfp-gemini-key';
const THEME_KEY = 'mfp-theme';
const SIDEBAR_KEY = 'mfp-sidebar-collapsed';

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

/** Mirrors profile.theme so index.html can apply it before React loads (no flash). */
export const mirrorTheme = (theme: ThemePreference): void => safeSet(THEME_KEY, theme);

export const getSidebarCollapsed = (): boolean => safeGet(SIDEBAR_KEY) === '1';
export const setSidebarCollapsed = (collapsed: boolean): void => safeSet(SIDEBAR_KEY, collapsed ? '1' : '0');
