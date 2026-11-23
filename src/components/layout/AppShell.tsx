import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { getSidebarCollapsed, setSidebarCollapsed } from '@/lib/localPrefs';
import { QuickEntryBar } from '@/components/quick-entry/QuickEntryBar';
import { Toaster } from '@/components/ui/toast';
import { StorageNotices } from './StorageNotices';
import { UpdateNotice } from './UpdateNotice';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { LogoMark } from './Logo';
import { CircleHelp, WifiOff } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useHashFocus } from '@/hooks/useHashFocus';
import { OverlayBoundary } from './OverlayBoundary';
import { resettableLazy } from './resettableLazy';

// Guide and tour are opt-in, so they load only when opened (kept out of the entry chunk).
const helpModal = resettableLazy(() => import('@/features/onboarding/HelpModal'));
const guidedTour = resettableLazy(() => import('@/features/onboarding/GuidedTour'));
// Device sync pulls in WebRTC (PeerJS) and QR libraries: only loaded when the sync dialog opens.
const syncModal = resettableLazy(() => import('@/features/sync/SyncModal'));
const OVERLAYS = [helpModal, guidedTour, syncModal] as const;
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const online = useOnlineStatus();
  const helpOpen = useUiStore((s) => s.helpOpen);
  const tourOpen = useUiStore((s) => s.tourOpen);
  const syncOpen = useUiStore((s) => s.syncOpen);
  const openHelp = useUiStore((s) => s.openHelp);
  const closeOverlays = useUiStore((s) => s.closeAll);
  const HelpModal = helpModal.get();
  const GuidedTour = guidedTour.get();
  const SyncModal = syncModal.get();
  useHashFocus();
  const toggle = (): void => {
    setCollapsed((c) => {
      setSidebarCollapsed(!c);
      return !c;
    });
  };

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/80">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 md:h-16 md:py-0">
            <LogoMark className="size-7 shrink-0 md:hidden" />
            <QuickEntryBar className="min-w-0 flex-1 md:max-w-xl" autoFocusShortcut />
            <div className="ml-auto flex items-center gap-1">
              {!online && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-400" title="You’re offline. Everything still works and saves locally.">
                  <WifiOff className="size-3" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}
              <IconButton label="How it works" onClick={openHelp} aria-haspopup="dialog">
                <CircleHelp className="size-[18px]" />
              </IconButton>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto focus:outline-none w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8">
          <StorageNotices />
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toaster />
      <UpdateNotice />
      <OverlayBoundary
        onError={() => {
          OVERLAYS.forEach((overlay) => overlay.reset());
          closeOverlays();
        }}
      >
        <Suspense fallback={null}>
          {helpOpen && <HelpModal />}
          {tourOpen && <GuidedTour />}
          {syncOpen && <SyncModal />}
        </Suspense>
      </OverlayBoundary>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) => (
  <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted dark:text-zinc-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
