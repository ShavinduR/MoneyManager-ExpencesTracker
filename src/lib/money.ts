import type { Cents, CurrencyCode } from '@/types/finance';

/** The single place where plain numbers become `Cents`. Rounds to an integer. */
export const cents = (value: number): Cents => Math.round(value) as Cents;

export const ZERO: Cents = cents(0);

/** 1500.5 (major units) → 150050 cents */
export const fromMajor = (major: number): Cents => cents(major * 100);

export const toMajor = (value: Cents): number => value / 100;

export const sumCents = (values: readonly Cents[]): Cents => cents(values.reduce<number>((acc, v) => acc + v, 0));

export const addCents = (a: Cents, b: Cents): Cents => cents(a + b);

export const subCents = (a: Cents, b: Cents): Cents => cents(a - b);

export const maxCents = (a: Cents, b: Cents): Cents => (a > b ? a : b);

/**
 * Parse user input like "1,500", "Rs. 1500.50", "85000/=", "1.5k", "2 lakh".
 * Returns null for empty or invalid input. Negative values are rejected.
 */
export const parseMoney = (input: string): Cents | null => {
  const normalized = input
    .toLowerCase()
    .replace(/rs\.?|lkr|\/=|,/g, '')
    .replace(/[$€£₹]/g, '')
    .trim();
  const match = /^(\d+(?:\.\d+)?)\s*(k|m|lakh|lakhs|lk)?$/.exec(normalized);
  if (!match?.[1]) return null;
  const base = Number.parseFloat(match[1]);
  if (!Number.isFinite(base)) return null;
  const multiplier = unitMultiplier(match[2]);
  return fromMajor(base * multiplier);
};

const unitMultiplier = (unit: string | undefined): number => {
  switch (unit) {
    case 'k':
      return 1_000;
    case 'm':
      return 1_000_000;
    case 'lakh':
    case 'lakhs':
    case 'lk':
      return 100_000;
    default:
      return 1;
  }
};

export type FormatOptions = {
  /** 'auto' hides ".00" on whole amounts. */
  decimals?: 'auto' | 'always';
  /** Prefix positive values with "+". */
  signed?: boolean;
  /** 1.2M / 85K style for charts. */
  compact?: boolean;
};

const CURRENCY_PREFIX: Record<CurrencyCode, string> = {
  LKR: 'Rs. ',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
};

const LOCALE: Record<CurrencyCode, string> = {
  LKR: 'en-LK',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  INR: 'en-IN',
  AUD: 'en-AU',
};

export const currencySymbol = (currency: CurrencyCode): string => CURRENCY_PREFIX[currency].trim();

export const formatMoney = (value: Cents, currency: CurrencyCode, options: FormatOptions = {}): string => {
  const { decimals = 'auto', signed = false, compact = false } = options;
  const major = Math.abs(value) / 100;
  const isWhole = Math.abs(value) % 100 === 0;
  const fractionDigits = compact ? (major >= 1000 ? 1 : 0) : decimals === 'always' || !isWhole ? 2 : 0;
  const number = new Intl.NumberFormat(LOCALE[currency], {
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(major);
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  return `${sign}${CURRENCY_PREFIX[currency]}${number}`;
};

/** Plain editable string for inputs: 150050 → "1500.50", 150000 → "1500" */
export const toInputString = (value: Cents): string => {
  const major = value / 100;
  return value % 100 === 0 ? String(major) : major.toFixed(2);
};
