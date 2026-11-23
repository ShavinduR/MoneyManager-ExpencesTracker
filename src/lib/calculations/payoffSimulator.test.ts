import { describe, expect, it } from 'vitest';
import { fromMajor } from '@/lib/money';
import { comparePayoff, requiredMonthlyPayment, simulatePayoff } from './payoffSimulator';

const base = { startMonth: '2026-11' };

describe('simulatePayoff', () => {
  it('handles 0% interest without dividing by zero', () => {
    const r = simulatePayoff({ ...base, balance: fromMajor(100000), aprPercent: 0, monthlyPayment: fromMajor(30000) });
    expect(r.kind).toBe('paid-off');
    if (r.kind !== 'paid-off') return;
    expect(r.months).toBe(4); // 30k, 30k, 30k, 10k
    expect(r.totalInterest).toBe(0);
    expect(r.totalPaid).toBe(fromMajor(100000));
    expect(r.payoffMonth).toBe('2027-03');
    expect(r.schedule.at(-1)?.balance).toBe(0);
  });

  it('reports never when the payment does not cover monthly interest', () => {
    // 1,000,000 at 36% APR → 30,000 interest in month one
    const r = simulatePayoff({ ...base, balance: fromMajor(1_000_000), aprPercent: 36, monthlyPayment: fromMajor(25000) });
    expect(r).toEqual({ kind: 'never', reason: 'payment-below-interest', firstMonthInterest: fromMajor(30000) });
  });

  it('treats payment exactly equal to interest as never', () => {
    const r = simulatePayoff({ ...base, balance: fromMajor(1_000_000), aprPercent: 36, monthlyPayment: fromMajor(30000) });
    expect(r.kind).toBe('never');
  });

  it('caps absurdly long payoffs', () => {
    // 1,000 months at 0% exceeds the 50-year cap
    const r = simulatePayoff({ ...base, balance: fromMajor(1_000_000), aprPercent: 0, monthlyPayment: fromMajor(1000) });
    expect(r).toMatchObject({ kind: 'never', reason: 'too-long' });
  });

  it('amortizes an interest-bearing loan with cent-rounded interest', () => {
    // 12% APR = 1%/month; 100,000 paid at 10,000/month
    const r = simulatePayoff({ ...base, balance: fromMajor(100000), aprPercent: 12, monthlyPayment: fromMajor(10000) });
    if (r.kind !== 'paid-off') throw new Error(r.kind);
    expect(r.months).toBe(11);
    expect(r.schedule[1]?.interest).toBe(fromMajor(1000));
    expect(r.totalPaid).toBe(fromMajor(100000) + r.totalInterest);
    expect(Number.isInteger(r.totalInterest)).toBe(true);
  });

  it('returns already-paid for zero balance', () => {
    expect(simulatePayoff({ ...base, balance: fromMajor(0), aprPercent: 10, monthlyPayment: fromMajor(100) }).kind).toBe('already-paid');
  });
});

describe('comparePayoff', () => {
  it('extra payment saves interest and months', () => {
    const c = comparePayoff({ ...base, balance: fromMajor(185000), aprPercent: 28, monthlyPayment: fromMajor(9250), extraPayment: fromMajor(10000) });
    expect(c.interestSaved).toBeGreaterThan(0);
    expect(c.monthsSaved).toBeGreaterThan(0);
  });

  it('extra payment can rescue a never-ending debt', () => {
    const c = comparePayoff({ ...base, balance: fromMajor(1_000_000), aprPercent: 36, monthlyPayment: fromMajor(25000), extraPayment: fromMajor(20000) });
    expect(c.baseline.kind).toBe('never');
    expect(c.accelerated.kind).toBe('paid-off');
    expect(c.interestSaved).toBeNull();
  });

  it('0% debts save no interest but still save months', () => {
    const c = comparePayoff({ ...base, balance: fromMajor(120000), aprPercent: 0, monthlyPayment: fromMajor(10000), extraPayment: fromMajor(10000) });
    expect(c.interestSaved).toBe(0);
    expect(c.monthsSaved).toBe(6);
  });
});

describe('requiredMonthlyPayment', () => {
  it('0% splits the balance evenly (rounded up)', () => {
    expect(requiredMonthlyPayment(fromMajor(100000), 0, 3)).toBe(3333334);
  });

  it('finds the payment that clears an interest-bearing loan on time', () => {
    const p = requiredMonthlyPayment(fromMajor(1_200_000), 14.5, 36);
    expect(p).not.toBeNull();
    if (p === null) return;
    const r = simulatePayoff({ balance: fromMajor(1_200_000), aprPercent: 14.5, monthlyPayment: p, startMonth: '2026-01' });
    expect(r.kind === 'paid-off' && r.months <= 36).toBe(true);
  });

  it('returns null for non-positive horizons', () => {
    expect(requiredMonthlyPayment(fromMajor(1000), 10, 0)).toBeNull();
  });
});
