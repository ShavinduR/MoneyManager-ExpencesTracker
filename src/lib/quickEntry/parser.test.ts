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
});
