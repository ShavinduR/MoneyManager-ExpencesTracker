import type { Cents, DebtAccount, Id, ISODate } from '@/types/finance';
import { addDays, isISODate, MONTH_LABELS_SHORT, todayISO } from '@/lib/dates';
import { fromMajor, isWithinLimit } from '@/lib/money';
import { FILLER_WORDS, LEXICON, RELATIVE_DATE_TERMS, type EntryTarget } from './lexicon';

export type ParseConfidence = 'high' | 'medium';

export type QuickEntryDraft = {
  target: EntryTarget;
  amount: Cents;
  date: ISODate;
  description: string;
  debtId: Id | null;
  confidence: ParseConfidence;
  /** The keyword that decided the category, for the confirmation pill. */
  matchedTerm: string | null;
  source: 'rules' | 'ai';
};

export type ParseResult = { ok: true; draft: QuickEntryDraft } | { ok: false; reason: string };

export type ParseContext = {
  today?: ISODate;
  debts?: readonly Pick<DebtAccount, 'id' | 'creditor' | 'archived'>[];
};

/**
 * An amount token: optional "Rs"/"LKR" prefix, digits, optional unit (k / lakh / m) and optional Sri Lankan
 * suffixes "/-", "/=", "rs", "LKR", "rupees" ("850/-", "1500rs", "Rs1500", "85000/=").
 */
const AMOUNT_PATTERN =
  /(?:^|\s)(?:rs\.?\s*|lkr\s*)?(\d+(?:\.\d+)?)\s*(k|lakhs?|lk|m|mn)?\s*(?:\/[-=]|rs\.?|lkr|rupees?)?(?=\s|$)/g;

/**
 * Sri Lankan phone numbers ("0771234567", "077 123 4567", "+94 77 123 4567") are not amounts (M5).
 * Any number starting with 0 and 9+ digits long is treated the same way (account/reference numbers).
 */
const PHONE_PATTERN = /(?:^|\s)(?:\+94|0094|0)(?:[\s-]?\d){8,10}(?=\s|$)/g;

type AmountResult = { kind: 'ok'; amount: Cents; token: string } | { kind: 'none' } | { kind: 'too-large' };

/** Picks the largest number so "2 lunch packets 900" reads as Rs. 900, not Rs. 2. */
const extractAmount = (text: string): AmountResult => {
  let best: { amount: Cents; token: string } | null = null;
  let tooLarge = false;
  for (const match of text.matchAll(AMOUNT_PATTERN)) {
    const digits = match[1];
    if (!digits) continue;
    // Codes with a leading zero ("0045", "007") are references, not money.
    if (/^0\d{2,}$/.test(digits)) continue;
    const amount = fromMajor(Number.parseFloat(digits) * multiplierFor(match[2]));
    if (!isWithinLimit(amount)) {
      tooLarge = true;
      continue;
    }
    if (!best || amount > best.amount) best = { amount, token: match[0] };
  }
  if (best) return { kind: 'ok', ...best };
  return tooLarge ? { kind: 'too-large' } : { kind: 'none' };
};

/** Deterministic, offline parser. "ada lunch 850" → Food & Dining, Rs. 850, today. */
export const parseQuickEntry = (raw: string, context: ParseContext = {}): ParseResult => {
  const today = context.today ?? todayISO();
  let text = normalize(raw);
  if (!text) return { ok: false, reason: 'Type something like "Petrol 1500 today"' };

  const dateResult = extractDate(text, today);
  if ('error' in dateResult) return { ok: false, reason: dateResult.error };
  text = dateResult.rest;

  const withoutPhones = squash(text.replace(PHONE_PATTERN, ' '));
  const strippedPhone = withoutPhones !== text;
  text = withoutPhones;

  const amountMatch = extractAmount(text);
  if (amountMatch.kind === 'too-large') return { ok: false, reason: 'That amount is too large. The maximum is 1,000,000,000,000.' };
  if (amountMatch.kind === 'none') {
    return {
      ok: false,
      reason: strippedPhone ? 'That looks like a phone number, not an amount. Add the amount, e.g. "dialog reload 500"' : 'Add an amount, e.g. "lunch 850"',
    };
  }
  const { amount } = amountMatch;
  if (amount <= 0) return { ok: false, reason: 'Amount must be greater than zero' };
  text = squash(text.replace(amountMatch.token, ' '));

  const debtMatch = matchDebt(text, context.debts ?? []);
  const termMatch = matchLexicon(text);

  const target: EntryTarget = debtMatch ? { kind: 'debt', category: 'debt' } : (termMatch?.target ?? { kind: 'fixed', category: 'other' });
  const matchedTerm = debtMatch?.creditor ?? termMatch?.term ?? null;

  return {
    ok: true,
    draft: {
      target,
      amount,
      date: dateResult.date,
      description: buildDescription(text, matchedTerm, debtMatch?.creditor ?? null),
      debtId: debtMatch?.id ?? null,
      confidence: matchedTerm ? 'high' : 'medium',
      matchedTerm,
      source: 'rules',
    },
  };
};

const normalize = (raw: string): string =>
  squash(
    raw
      .toLowerCase()
      .replace(/(\d),(?=\d)/g, '$1') // 1,500 and lakh-style 1,50,000 → plain digits
      .replace(/[“”"']/g, ' ')
      .replace(/[!?;]/g, ' '),
  );

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

const multiplierFor = (unit: string | undefined): number => {
  if (!unit) return 1;
  if (unit === 'k') return 1_000;
  if (unit === 'm' || unit === 'mn') return 1_000_000;
  return 100_000; // lakh, lakhs, lk
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word match that also works for Sinhala script (where \b is unreliable). */
const phraseRegExp = (term: string): RegExp => new RegExp(`(^|\\s)${escapeRegExp(term)}(?=\\s|$)`);

const MONTH_INDEX: Record<string, number> = Object.fromEntries(
  MONTH_LABELS_SHORT.map((label, index) => [label.toLowerCase(), index + 1]),
);

type DateResult = { date: ISODate; rest: string } | { error: string };

const invalidDate = (token: string): DateResult => ({ error: `"${token.trim()}" isn’t a valid date. Use e.g. 15/11, nov 15 or 2026-11-15` });

/** A date-looking token that isn't a real date is an error, never silently "today" (M5). */
const extractDate = (text: string, today: ISODate): DateResult => {
  const year = Number(today.slice(0, 4));
  const pad = (n: number): string => String(n).padStart(2, '0');
  const tryDate = (y: number, m: number, d: number): ISODate | null => {
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    return isISODate(iso) ? iso : null;
  };

  const iso = /(?:^|\s)(\d{4})-(\d{1,2})-(\d{1,2})(?=\s|$)/.exec(text);
  if (iso) {
    const date = tryDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return date ? { date, rest: squash(text.replace(iso[0], ' ')) } : invalidDate(iso[0]);
  }

  // Sri Lankan convention: day/month. "/" only: "1.2 lakh" must stay an amount, not 1 February.
  const dm = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/.exec(text);
  if (dm) {
    const y = dm[3] ? (dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])) : year;
    const date = tryDate(y, Number(dm[2]), Number(dm[1]));
    return date ? { date, rest: squash(text.replace(dm[0], ' ')) } : invalidDate(dm[0]);
  }

  const monthNames = Object.keys(MONTH_INDEX).join('|');
  const named =
    new RegExp(`(?:^|\\s)(${monthNames})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=\\s|$)`).exec(text) ??
    new RegExp(`(?:^|\\s)(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})[a-z]*(?=\\s|$)`).exec(text);
  if (named?.[1] && named[2]) {
    const [monthToken, dayToken] = /^\d/.test(named[1]) ? [named[2], named[1]] : [named[1], named[2]];
    const month = MONTH_INDEX[monthToken];
    const date = month ? tryDate(year, month, Number(dayToken)) : null;
    return date ? { date, rest: squash(text.replace(named[0], ' ')) } : invalidDate(named[0]);
  }

  const ordinal = /(?:^|\s)(?:on\s+)?(\d{1,2})(st|nd|rd|th)(?=\s|$)/.exec(text);
  if (ordinal) {
    const date = tryDate(year, Number(today.slice(5, 7)), Number(ordinal[1]));
    return date ? { date, rest: squash(text.replace(ordinal[0], ' ')) } : invalidDate(ordinal[0]);
  }

  const relative = RELATIVE_DATE_TERMS.flatMap(({ terms, offset }) => terms.map((term) => ({ term, offset })))
    .sort((a, b) => b.term.length - a.term.length)
    .find(({ term }) => phraseRegExp(term).test(text));
  if (relative) {
    return { date: addDays(today, relative.offset), rest: squash(text.replace(phraseRegExp(relative.term), ' ')) };
  }

  return { date: today, rest: text };
};

const SORTED_TERMS = LEXICON.flatMap(({ target, terms }) => terms.map((term) => ({ term, target }))).sort(
  (a, b) => b.term.length - a.term.length,
);

const matchLexicon = (text: string): { term: string; target: EntryTarget } | null =>
  SORTED_TERMS.find(({ term }) => phraseRegExp(term).test(text)) ?? null;

/** Words too common to identify a creditor on their own ("car service" is not a payment to a debt named "Car"). */
const GENERIC_CREDITOR_WORDS: ReadonlySet<string> = new Set([
  'bank', 'loan', 'loans', 'card', 'credit', 'personal', 'home', 'house', 'car', 'vehicle', 'bike', 'lease', 'leasing',
  'account', 'finance', 'plc', 'ltd', 'the', 'my', 'mortgage', 'installment', 'payment', 'phone', 'mobile',
]);

const DEBT_CONTEXT_TERMS: readonly string[] = [
  ...(LEXICON.find((g) => g.target.kind === 'debt')?.terms ?? []),
  'payment', 'repayment', 'pay', 'paid', 'due',
];

/**
 * Links a payment to a debt account (M5). A distinctive word in the creditor's name ("HNB", "Sampath")
 * is enough. A name made only of generic words ("Car", "Bank Loan") must match in full AND appear with
 * a debt word ("car loan 25000") or on its own ("car 25000").
 */
const matchDebt = (
  text: string,
  debts: readonly Pick<DebtAccount, 'id' | 'creditor' | 'archived'>[],
): { id: Id; creditor: string } | null => {
  const hasDebtContext = DEBT_CONTEXT_TERMS.some((t) => phraseRegExp(t).test(text));
  for (const debt of debts) {
    if (debt.archived) continue;
    const name = squash(debt.creditor.toLowerCase());
    const words = name.split(' ').filter(Boolean);
    const distinctive = words.filter((w) => w.length >= 3 && !GENERIC_CREDITOR_WORDS.has(w));
    if (distinctive.some((w) => phraseRegExp(w).test(text))) return { id: debt.id, creditor: debt.creditor };
    if (name.length >= 3 && phraseRegExp(name).test(text)) {
      const rest = squash(text.replace(phraseRegExp(name), ' '))
        .split(' ')
        .filter((w) => w && !FILLER_WORDS.has(w));
      if (hasDebtContext || rest.length === 0) return { id: debt.id, creditor: debt.creditor };
    }
  }
  return null;
};

const titleCase = (s: string): string =>
  s
    .split(' ')
    .map((w) => (/^[a-z]/.test(w) ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ');

const buildDescription = (text: string, matchedTerm: string | null, creditor: string | null): string => {
  if (creditor) return creditor;
  const words = text.split(' ').filter((w) => w && !FILLER_WORDS.has(w));
  const description = squash(words.join(' '));
  if (description) return titleCase(description);
  return matchedTerm ? titleCase(matchedTerm) : 'Quick entry';
};
