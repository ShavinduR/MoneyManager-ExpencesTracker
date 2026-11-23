import { describe, expect, it } from 'vitest';
import type { BankAccount } from '@/types/finance';
import { fromMajor } from './money';
import { accountTotals } from './accounts';

const account = (balance: number): BankAccount => ({
  id: String(balance), name: 'A', institution: 'B', type: 'savings', branch: '', cardLast4: null, currentBalance: fromMajor(balance), notes: '',
});

describe('accountTotals', () => {
  it('splits assets and liabilities', () => {
    expect(accountTotals([account(1000), account(500.5), account(-300)])).toEqual({
      assets: fromMajor(1500.5),
      liabilities: fromMajor(-300),
      net: fromMajor(1200.5),
    });
  });
});
