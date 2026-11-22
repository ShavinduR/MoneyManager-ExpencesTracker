import type { AccountType, BankAccount, Cents } from '@/types/finance';
import { ACCOUNT_TYPES } from '@/types/finance';
import { sumCents } from './money';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  savings: 'Savings',
  current: 'Current',
  credit: 'Credit card',
  wallet: 'Wallet',
};

export const isAccountType = (value: string): value is AccountType => ACCOUNT_TYPES.some((t) => t === value);

export type AccountTotals = { assets: Cents; liabilities: Cents; net: Cents };

/** Positive balances are assets; negative balances (e.g. credit card owed) are liabilities. */
export const accountTotals = (accounts: readonly BankAccount[]): AccountTotals => {
  const assets = sumCents(accounts.filter((a) => a.currentBalance > 0).map((a) => a.currentBalance));
  const liabilities = sumCents(accounts.filter((a) => a.currentBalance < 0).map((a) => a.currentBalance));
  return { assets, liabilities, net: sumCents([assets, liabilities]) };
};
