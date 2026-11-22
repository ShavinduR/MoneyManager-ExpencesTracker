import type { Cents, DebtAccount, Id, ISODate } from '@/types/finance';
import { addDays, isISODate, MONTH_LABELS_SHORT, todayISO } from '@/lib/dates';
import { fromMajor } from '@/lib/money';
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

const AMOUNT_PATTERN = /(?:^|\s)(?:rs\.?\s*|lkr\s*)?(\d+(?:\.\d+)?)\s*(k|lakhs?|lk|m|mn)?(?:\/=)?(?=\s|$)/g;

/** Picks the largest number so "2 lunch packets 900" reads as Rs. 900, not Rs. 2. */
const extractAmount = (text: string): { amount: Cents; token: string } | null => {
  let best: { amount: Cents; token: string } | null = null;
  for (const match of text.matchAll(AMOUNT_PATTERN)) {
    if (!match[1]) continue;
    const amount = fromMajor(Number.parseFloat(match[1]) * multiplierFor(match[2]));
    if (!best || amount > best.amount) best = { amount, token: match[0] };
  }
  return best;
};

/** Deterministic, offline parser. "ada lunch 850" → Food & Dining, Rs. 850, today. */
export const parseQuickEntry = (raw: string, context: ParseContext = {}): ParseResult => {
  const today = context.today ?? todayISO();
  let text = normalize(raw);
  if (!text) return { ok: false, reason: 'Type something like "Petrol 1500 today"' };

  const dateResult = extractDate(text, today);
  text = dateResult.rest;

  const amountMatch = extractAmount(text);
  if (!amountMatch) return { ok: false, reason: 'Add an amount, e.g. "lunch 850"' };
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
      .replace(/(\d),(?=\d{3}\b)/g, '$1') // 1,500 → 1500
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

const extractDate = (text: string, today: ISODate): { date: ISODate; rest: string } => {
  const year = Number(today.slice(0, 4));
  const pad = (n: number): string => String(n).padStart(2, '0');
  const tryDate = (y: number, m: number, d: number): ISODate | null => {
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    return isISODate(iso) ? iso : null;
  };

  const iso = /(?:^|\s)(\d{4})-(\d{2})-(\d{2})(?=\s|$)/.exec(text);
  if (iso) {
    const date = tryDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (date) return { date, rest: squash(text.replace(iso[0], ' ')) };
  }

  // Sri Lankan convention: day/month
  // "/" only: "1.2 lakh" must stay an amount, not 1 February.
  const dm = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/.exec(text);
  if (dm) {
    const y = dm[3] ? (dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])) : year;
    const date = tryDate(y, Number(dm[2]), Number(dm[1]));
    if (date) return { date, rest: squash(text.replace(dm[0], ' ')) };
  }

  const monthNames = Object.keys(MONTH_INDEX).join('|');
  const named =
    new RegExp(`(?:^|\\s)(${monthNames})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=\\s|$)`).exec(text) ??
    new RegExp(`(?:^|\\s)(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})[a-z]*(?=\\s|$)`).exec(text);
  if (named?.[1] && named[2]) {
    const [monthToken, dayToken] = /^\d/.test(named[1]) ? [named[2], named[1]] : [named[1], named[2]];
    const month = MONTH_INDEX[monthToken];
    const date = month ? tryDate(year, month, Number(dayToken)) : null;
    if (date) return { date, rest: squash(text.replace(named[0], ' ')) };
  }

  const ordinal = /(?:^|\s)(?:on\s+)?(\d{1,2})(st|nd|rd|th)(?=\s|$)/.exec(text);
  if (ordinal) {
    const date = tryDate(year, Number(today.slice(5, 7)), Number(ordinal[1]));
    if (date) return { date, rest: squash(text.replace(ordinal[0], ' ')) };
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

const matchDebt = (
  text: string,
  debts: readonly Pick<DebtAccount, 'id' | 'creditor' | 'archived'>[],
): { id: Id; creditor: string } | null => {
  for (const debt of debts) {
    if (debt.archived) continue;
    const name = debt.creditor.toLowerCase().trim();
    const firstWord = name.split(/\s+/)[0] ?? '';
    const candidates = [name, firstWord].filter((c) => c.length >= 3);
    if (candidates.some((c) => phraseRegExp(c).test(text))) return { id: debt.id, creditor: debt.creditor };
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
