import { useEffect, useState } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { mirrorTheme } from '@/lib/localPrefs';

const systemPrefersDark = (): boolean => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Applies the `dark` class from profile.theme, following the OS when set to "system". */
export const useApplyTheme = (): void => {
  const theme = useFinanceStore((s) => s.data.profile.theme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && systemDark);
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0f14' : '#fafafa');
    mirrorTheme(theme);
  }, [theme, systemDark]);
};

export const useIsDark = (): boolean => {
  const theme = useFinanceStore((s) => s.data.profile.theme);
  return theme === 'dark' || (theme === 'system' && systemPrefersDark());
};
