import { useMemo } from 'react';
import type { DebtAccount } from '@/types/finance';
import { debtPaymentHistory, debtProgress, type DebtPaymentRow, type DebtProgress } from '@/lib/calculations/debt';
import { useFinanceStore } from '@/store/useFinanceStore';

export const useDebtProgress = (debt: DebtAccount): { history: DebtPaymentRow[]; progress: DebtProgress } => {
  const months = useFinanceStore((s) => s.data.months);
  return useMemo(() => {
    const history = debtPaymentHistory(debt, months);
    return { history, progress: debtProgress(debt, history) };
  }, [debt, months]);
};
