import { Moon, Sun } from 'lucide-react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useIsDark } from '@/hooks/useTheme';
import { IconButton } from '@/components/ui/Button';

export const ThemeToggle = () => {
  const isDark = useIsDark();
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  return (
    <IconButton label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => updateProfile({ theme: isDark ? 'light' : 'dark' })}>
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </IconButton>
  );
};
