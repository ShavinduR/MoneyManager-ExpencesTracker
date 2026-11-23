import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useApplyTheme } from '@/hooks/useTheme';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MonthlyPage, MonthlyRedirect } from '@/features/monthly/MonthlyPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { MorePage } from '@/features/settings/MorePage';
import { BankAccountsPage } from '@/features/accounts/BankAccountsPage';
import { RecoveryScreen } from '@/features/recovery/RecoveryScreen';
import { YearlyGoalsPage } from '@/features/goals/YearlyGoalsPage';

// Chart-heavy routes are split out so Recharts is not part of the initial bundle.
const DebtsPage = lazy(() => import('@/features/debts/DebtsPage'));
const DebtDetailPage = lazy(() => import('@/features/debts/DebtDetailPage'));
const YearSummaryPage = lazy(() => import('@/features/summary/YearSummaryPage'));

const RouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-subtle">
    <Loader2 className="size-5 animate-spin" aria-label="Loading" />
  </div>
);

const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={<RouteFallback />}>{children}</Suspense>;

export const App = () => {
  const status = useFinanceStore((s) => s.status);
  const hydrate = useFinanceStore((s) => s.hydrate);
  useApplyTheme();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-subtle">
        <Loader2 className="size-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (status === 'unreadable') return <RecoveryScreen />;

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="monthly" element={<MonthlyRedirect />} />
          <Route path="monthly/:month" element={<MonthlyPage />} />
          <Route path="debts" element={<Lazy><DebtsPage /></Lazy>} />
          <Route path="debts/:debtId" element={<Lazy><DebtDetailPage /></Lazy>} />
          <Route path="goals" element={<YearlyGoalsPage />} />
          <Route path="summary" element={<Lazy><YearSummaryPage /></Lazy>} />
          <Route path="accounts" element={<BankAccountsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
