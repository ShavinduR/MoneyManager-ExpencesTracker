import { describe, expect, it } from 'vitest';
import { cents, formatAxis, formatMoney, fromMajor, isWithinLimit, MAX_CENTS, parseMoney, parseSignedMoney, sumCents } from './money';

describe('money', () => {
  it('avoids floating point drift by summing integer cents', () => {
    expect(sumCents([fromMajor(0.1), fromMajor(0.2)])).toBe(30);
  });

  it.each([
    ['1,500', 150000],
    ['Rs. 1500.50', 150050],
    ['85000/=', 8500000],
    ['1.5k', 150000],
    ['2 lakh', 20000000],
    ['', null],
    ['abc', null],
    ['-50', null],
  ])('parseMoney(%s) → %s', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it('formats LKR with Rs. prefix and hides .00 on whole amounts', () => {
    expect(formatMoney(fromMajor(85000), 'LKR')).toBe('Rs. 85,000');
    expect(formatMoney(cents(150050), 'LKR')).toBe('Rs. 1,500.50');
    expect(formatMoney(fromMajor(-250), 'LKR')).toBe('−Rs. 250');
    expect(formatMoney(fromMajor(10), 'USD', { signed: true, decimals: 'always' })).toBe('+$10.00');
  });

  it('parseSignedMoney accepts negatives', () => {
    expect(parseSignedMoney('-65,000')).toBe(fromMajor(-65000));
    expect(parseSignedMoney('−1.5k')).toBe(fromMajor(-1500));
    expect(parseSignedMoney('250')).toBe(fromMajor(250));
    expect(parseSignedMoney('-')).toBe(null);
  });

  it.each([
    [0, '0'],
    [fromMajor(850), '850'],
    [fromMajor(50000), '50k'],
    [fromMajor(1500), '1.5k'],
    [fromMajor(1_200_000), '1.2M'],
    [fromMajor(1_250_000), '1.25M'],
    [fromMajor(-65000), '−65k'],
    [fromMajor(2_000_000_000), '2B'],
  ])('formatAxis(%s) → %s', (value, expected) => {
    expect(formatAxis(value)).toBe(expected);
  });

  it('caps amounts at Rs. 1 trillion so cents stay exact (C1)', () => {
    expect(Number.isSafeInteger(MAX_CENTS)).toBe(true);
    expect(parseMoney('1000000000000')).toBe(MAX_CENTS);
    expect(parseMoney('1000000000000.01')).toBeNull();
    expect(parseMoney('99999999999999999')).toBeNull();
    expect(parseSignedMoney('-99999999999999999')).toBeNull();
    expect(isWithinLimit(1e19)).toBe(false);
    expect(isWithinLimit(-MAX_CENTS)).toBe(true);
  });

  it('accepts the Sri Lankan "/-" suffix', () => {
    expect(parseMoney('850/-')).toBe(fromMajor(850));
    expect(parseMoney('1,50,000')).toBe(fromMajor(150000));
  });
});
