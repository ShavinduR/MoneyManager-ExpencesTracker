import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { getSidebarCollapsed, setSidebarCollapsed } from '@/lib/localPrefs';
import { QuickEntryBar } from '@/components/quick-entry/QuickEntryBar';
import { Toaster } from '@/components/ui/toast';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { LogoMark } from './Logo';

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const toggle = (): void => {
    setCollapsed((c) => {
      setSidebarCollapsed(!c);
      return !c;
    });
  };

  return (
    <div className="flex min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/80">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 md:h-16 md:py-0">
            <LogoMark className="size-7 md:hidden" />
            <QuickEntryBar className="md:max-w-xl" autoFocusShortcut />
            <div className="ml-auto flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
