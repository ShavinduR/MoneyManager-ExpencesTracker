import { describe, expect, it } from 'vitest';
import { fromMajor } from '@/lib/money';
import { parseQuickEntry } from './parser';

const today = '2026-11-22';
const parse = (text: string) => {
  const r = parseQuickEntry(text, { today, debts: [{ id: 'd1', creditor: 'HNB Personal Loan', archived: false }] });
  if (!r.ok) throw new Error(r.reason);
  return r.draft;
};

describe('parseQuickEntry', () => {
  it('Petrol 1500 today', () => {
    const d = parse('Petrol 1500 today');
    expect(d.target).toEqual({ kind: 'fixed', category: 'fuel' });
    expect(d.amount).toBe(fromMajor(1500));
    expect(d.date).toBe(today);
    expect(d.description).toBe('Petrol');
  });

  it('Salary 85000 → income', () => {
    const d = parse('Salary 85,000');
    expect(d.target).toEqual({ kind: 'income', category: 'salary' });
    expect(d.amount).toBe(fromMajor(85000));
  });

  it('Singlish: ada lunch 850', () => {
    const d = parse('ada lunch 850');
    expect(d.target).toEqual({ kind: 'fixed', category: 'food' });
    expect(d.description).toBe('Lunch');
    expect(d.date).toBe(today);
  });

  it('iye kema 1200 → yesterday food', () => {
    const d = parse('iye kema 1200');
    expect(d.date).toBe('2026-11-21');
    expect(d.target.category).toBe('food');
  });

  it('electricity bill 4200 → utilities, longest term wins', () => {
    const d = parse('electricity bill 4200');
    expect(d.target).toEqual({ kind: 'fixed', category: 'utilities' });
    expect(d.description).toBe('Electricity Bill');
  });

  it('padiya 1.2 lakh → salary 120000', () => {
    const d = parse('padiya 1.2 lakh');
    expect(d.target.kind).toBe('income');
    expect(d.amount).toBe(fromMajor(120000));
  });

  it('matches a debt account by creditor name', () => {
    const d = parse('hnb 25000 on 5th');
    expect(d.target.kind).toBe('debt');
    expect(d.debtId).toBe('d1');
    expect(d.description).toBe('HNB Personal Loan');
    expect(d.date).toBe('2026-11-05');
  });

  it('day/month dates and Rs. prefix', () => {
    const d = parse('dialog reload Rs. 499 15/11');
    expect(d.target.category).toBe('phone-internet');
    expect(d.amount).toBe(fromMajor(499));
    expect(d.date).toBe('2026-11-15');
  });

  it('Sinhala script keyword', () => {
    expect(parse('පඩිය 90000').target.kind).toBe('income');
  });

  it('save 10000 → savings', () => {
    expect(parse('save 10000 emergency').target).toEqual({ kind: 'savings', category: 'emergency-fund' });
  });

  it('unknown words default to other expense with medium confidence', () => {
    const d = parse('random thing 300');
    expect(d.target).toEqual({ kind: 'fixed', category: 'other' });
    expect(d.confidence).toBe('medium');
  });

  it('fails without an amount', () => {
    expect(parseQuickEntry('lunch', { today }).ok).toBe(false);
  });

  it('picks the largest number', () => {
    expect(parse('2 lunch packets 900').amount).toBe(fromMajor(900));
  });

  // ---- Audit M5 / C1 regressions ----
  const run = (text: string, debts = [{ id: 'd1', creditor: 'HNB Personal Loan', archived: false }]) =>
    parseQuickEntry(text, { today, debts });

  it.each<[string, number]>([
    ['lunch 850/-', 850],
    ['lunch 850/=', 850],
    ['petrol 1500rs', 1500],
    ['petrol 1500 rs', 1500],
    ['Rs1500 petrol', 1500],
    ['petrol 1500 LKR', 1500],
    ['Rs. 1,50,000 padiya', 150000],
    ['padiya 2.5 lakh', 250000],
    ['1.5k petrol', 1500],
  ])('reads Sri Lankan amount format %s', (text, major) => {
    const r = run(text);
    expect(r.ok && r.draft.amount).toBe(fromMajor(major));
  });

  it.each(['phone 0771234567', 'call 077 123 4567', 'dialog +94 77 123 4567'])('never treats a phone number as an amount: %s', (text) => {
    const r = run(text);
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/phone number/) });
  });

  it('keeps the real amount next to a phone number', () => {
    const r = run('dialog reload 500 for 0771234567');
    expect(r.ok && r.draft.amount).toBe(fromMajor(500));
    expect(r.ok && r.draft.target.category).toBe('phone-internet');
  });

  it.each(['lunch 850 31/02', 'lunch 850 13/13', 'salary 85000 2025-02-30', 'rent 45000 feb 30', 'bus 200 on 31st'])(
    'reports an invalid date instead of silently using today: %s',
    (text) => {
      // Today is 2026-11-23 and November has 30 days, so "31st" is invalid too.
      const r = run(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/isn’t a valid date/);
    },
  );

  it('rejects amounts above the limit (C1) instead of storing an unsafe number', () => {
    expect(run('lunch 99999999999999999')).toEqual({ ok: false, reason: expect.stringMatching(/too large/) });
  });

  it('ignores negative signs and codes with leading zeros as amounts', () => {
    expect(run('lunch -500').ok).toBe(false);
    expect(run('ref 0045 lunch').ok).toBe(false);
  });

  it('generic creditor names no longer hijack ordinary expenses', () => {
    const debts = [
      { id: 'car', creditor: 'Car', archived: false },
      { id: 'bank', creditor: 'Bank Loan', archived: false },
    ];
    const service = run('car service 5000', debts);
    expect(service.ok && service.draft.debtId).toBeNull();
    const interest = run('bank interest 500', debts);
    expect(interest.ok && interest.draft.debtId).toBeNull();
    const loan = run('car loan 25000', debts);
    expect(loan.ok && loan.draft.debtId).toBe('car');
    const bare = run('car 25000', debts);
    expect(bare.ok && bare.draft.debtId).toBe('car');
    const named = run('bank loan payment 30000', debts);
    expect(named.ok && named.draft.debtId).toBe('bank');
  });

  it('distinctive creditor words still link payments', () => {
    const r = run('hnb 25000');
    expect(r.ok && r.draft.debtId).toBe('d1');
    const personalCare = run('personal care 2000');
    expect(personalCare.ok && personalCare.draft.debtId).toBeNull();
  });
});
