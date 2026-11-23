import type { Cents, MonthKey } from '@/types/finance';
import { cents, isWithinLimit, ZERO } from '@/lib/money';
import { shiftMonth } from '@/lib/dates';

/** Safety cap: 50 years. Anything longer is treated as "never" for a personal debt. */
export const MAX_MONTHS = 600;

export type SchedulePoint = { index: number; month: MonthKey; balance: Cents; interest: Cents; principal: Cents };

export type PayoffResult =
  | { kind: 'already-paid' }
  | {
      kind: 'paid-off';
      months: number;
      payoffMonth: MonthKey;
      totalInterest: Cents;
      totalPaid: Cents;
      /** Balance at the END of each month, starting with month 0 = today's balance. */
      schedule: SchedulePoint[];
    }
  | {
      kind: 'never';
      /** `invalid-input`: a non-finite or out-of-range rate/balance/payment (defence in depth, L5). */
      reason: 'payment-below-interest' | 'too-long' | 'invalid-input';
      /** Interest charged in the first month: the payment must exceed this to make progress. */
      firstMonthInterest: Cents;
    };

export type PayoffInput = {
  balance: Cents;
  /** Annual percentage rate, e.g. 18.5. 0 is valid (interest-free installments). */
  aprPercent: number;
  monthlyPayment: Cents;
  startMonth: MonthKey;
};

/**
 * Month-by-month amortization. Interest is rounded to the cent every month, like a lender posts it.
 * 0% APR is handled naturally (interest is always 0), so there is no division by a zero rate.
 */
export const simulatePayoff = ({ balance, aprPercent, monthlyPayment, startMonth }: PayoffInput): PayoffResult => {
  const validInput =
    Number.isFinite(aprPercent) && aprPercent >= 0 && aprPercent <= 100 && isWithinLimit(balance) && isWithinLimit(monthlyPayment);
  if (!validInput) return { kind: 'never', reason: 'invalid-input', firstMonthInterest: ZERO };
  if (balance <= 0) return { kind: 'already-paid' };
  const monthlyRate = aprPercent / 100 / 12;
  const interestFor = (b: number): number => Math.round(b * monthlyRate);

  const firstMonthInterest = cents(interestFor(balance));
  if (monthlyPayment <= 0 || monthlyPayment <= firstMonthInterest) {
    return { kind: 'never', reason: 'payment-below-interest', firstMonthInterest };
  }

  const schedule: SchedulePoint[] = [{ index: 0, month: startMonth, balance, interest: ZERO, principal: ZERO }];
  let remaining: number = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  let index = 0;

  while (remaining > 0) {
    index += 1;
    if (index > MAX_MONTHS) return { kind: 'never', reason: 'too-long', firstMonthInterest };
    const interest = interestFor(remaining);
    const owed = remaining + interest;
    const payment = Math.min(monthlyPayment, owed);
    remaining = owed - payment;
    totalInterest += interest;
    totalPaid += payment;
    schedule.push({
      index,
      month: shiftMonth(startMonth, index),
      balance: cents(remaining),
      interest: cents(interest),
      principal: cents(payment - interest),
    });
  }

  return {
    kind: 'paid-off',
    months: index,
    payoffMonth: shiftMonth(startMonth, index),
    totalInterest: cents(totalInterest),
    totalPaid: cents(totalPaid),
    schedule,
  };
};

export type PayoffComparison = {
  baseline: PayoffResult;
  accelerated: PayoffResult;
  /** Only meaningful when both plans pay off. */
  interestSaved: Cents | null;
  monthsSaved: number | null;
};

/** Minimum payment vs. minimum + extra. */
export const comparePayoff = (input: PayoffInput & { extraPayment: Cents }): PayoffComparison => {
  const baseline = simulatePayoff(input);
  const accelerated = simulatePayoff({ ...input, monthlyPayment: cents(input.monthlyPayment + input.extraPayment) });
  const bothPaid = baseline.kind === 'paid-off' && accelerated.kind === 'paid-off';
  return {
    baseline,
    accelerated,
    interestSaved: bothPaid ? cents(baseline.totalInterest - accelerated.totalInterest) : null,
    monthsSaved: bothPaid ? baseline.months - accelerated.months : null,
  };
};

/**
 * Smallest monthly payment (rounded up to the cent) that clears `balance` within `months`.
 * Uses the annuity formula, with the 0% case handled separately; verified against the simulator.
 */
export const requiredMonthlyPayment = (balance: Cents, aprPercent: number, months: number): Cents | null => {
  if (months <= 0 || !Number.isFinite(aprPercent) || aprPercent < 0 || !isWithinLimit(balance)) return null;
  if (balance <= 0) return ZERO;
  const r = aprPercent / 100 / 12;
  const raw = r === 0 ? balance / months : (r * balance) / (1 - (1 + r) ** -months);
  let payment = Math.ceil(raw);
  // Per-month cent rounding can push the term one month over; nudge up until it fits.
  for (let i = 0; i < 1000; i += 1) {
    const result = simulatePayoff({ balance, aprPercent, monthlyPayment: cents(payment), startMonth: '2000-01' });
    if (result.kind === 'paid-off' && result.months <= months) return cents(payment);
    payment += Math.max(1, Math.ceil(payment * 0.0005));
  }
  return null;
};
