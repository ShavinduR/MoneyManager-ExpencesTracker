import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useApplyTheme } from '@/hooks/useTheme';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MonthlyPage, MonthlyRedirect } from '@/features/monthly/MonthlyPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { MorePage } from '@/features/settings/MorePage';
import { ComingSoon } from '@/features/placeholder/ComingSoon';

export const App = () => {
  const status = useFinanceStore((s) => s.status);
  const hydrate = useFinanceStore((s) => s.hydrate);
  useApplyTheme();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-400">
        <Loader2 className="size-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (status === 'error') {
    return <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-red-600">Couldn’t open local storage. Check that this browser allows site data.</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="monthly" element={<MonthlyRedirect />} />
          <Route path="monthly/:month" element={<MonthlyPage />} />
          <Route path="debts" element={<ComingSoon title="Debt tracker" phase={3} description="Multiple debt accounts, payment history and a payoff simulator." />} />
          <Route path="goals" element={<ComingSoon title="Yearly goals" phase={3} description="8 yearly goal cards with progress and your “This year, I will…” commitment." />} />
          <Route path="summary" element={<ComingSoon title="Summary of the year" phase={3} description="12-month matrix, category breakdown and charts." />} />
          <Route path="accounts" element={<ComingSoon title="Bank accounts" phase={2} description="Security-first account overview: no passwords or hints, ever." />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
