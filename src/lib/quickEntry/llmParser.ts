import { z } from 'zod';
import type { DebtAccount, ISODate } from '@/types/finance';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES } from '@/types/finance';
import { isISODate, todayISO } from '@/lib/dates';
import { fromMajor } from '@/lib/money';
import type { EntryTarget } from './lexicon';
import type { ParseResult } from './parser';

const endpointFor = (model: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

/** The LLM's reply is untrusted: validate every field before it becomes a draft. */
const llmReplySchema = z.object({
  kind: z.enum(['income', 'savings', 'debt', 'fixed']),
  category: z.string(),
  amount: z.number().positive().max(1_000_000_000),
  date: z.string().refine(isISODate, 'date must be YYYY-MM-DD'),
  description: z.string().min(1).max(80),
  creditor: z.string().nullable().optional(),
});

const geminiResponseSchema = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }) }))
    .min(1),
});

const toTarget = (kind: z.infer<typeof llmReplySchema>['kind'], category: string): EntryTarget | null => {
  switch (kind) {
    case 'income': {
      const c = INCOME_CATEGORIES.find((x) => x === category);
      return c ? { kind, category: c } : { kind, category: 'other-income' };
    }
    case 'savings': {
      const c = SAVINGS_CATEGORIES.find((x) => x === category);
      return c ? { kind, category: c } : { kind, category: 'other-savings' };
    }
    case 'debt':
      return { kind, category: 'debt' };
    case 'fixed': {
      const c = EXPENSE_CATEGORIES.find((x) => x === category && x !== 'debt');
      return c ? { kind, category: c } : { kind, category: 'other' };
    }
  }
};

export const resolveGeminiKey = (storedKey: string | null): string | null => {
  const fromEnv: unknown = import.meta.env.VITE_GEMINI_API_KEY;
  if (storedKey && storedKey.trim()) return storedKey.trim();
  return typeof fromEnv === 'string' && fromEnv.trim() ? fromEnv.trim() : null;
};

export type LlmParseOptions = {
  apiKey: string;
  /** e.g. "gemini-2.5-flash"; configurable in Settings because Google retires model versions. */
  model: string;
  today?: ISODate;
  debts?: readonly Pick<DebtAccount, 'id' | 'creditor' | 'archived'>[];
  signal?: AbortSignal;
};

/** Optional AI parsing for free-form text. Never saves anything: the result goes to the confirmation pill. */
export const parseWithGemini = async (text: string, options: LlmParseOptions): Promise<ParseResult> => {
  const today = options.today ?? todayISO();
  const debts = (options.debts ?? []).filter((d) => !d.archived);
  const prompt = [
    'You convert one personal-finance note (English, Sinhala or Singlish, Sri Lankan context, currency LKR) into JSON.',
    `Today is ${today}. Resolve relative dates (ada=today, iye=yesterday, heta=tomorrow).`,
    'kind: income | savings | debt | fixed (fixed = any expense or bill).',
    `income categories: ${INCOME_CATEGORIES.join(', ')}`,
    `savings categories: ${SAVINGS_CATEGORIES.join(', ')}`,
    `expense categories: ${EXPENSE_CATEGORIES.filter((c) => c !== 'debt').join(', ')}`,
    debts.length ? `Known debt creditors: ${debts.map((d) => d.creditor).join(', ')}. Set "creditor" if one is meant.` : '',
    'amount is in major units (rupees), a number. description is a short title-cased label.',
    'Reply with JSON only: {"kind","category","amount","date","description","creditor"}.',
    `Note: ${text}`,
  ]
    .filter(Boolean)
    .join('\n');

  let response: Response;
  try {
    response = await fetch(endpointFor(options.model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
      signal: options.signal,
    });
  } catch {
    return { ok: false, reason: 'AI parse unavailable (offline?). The offline parser still works.' };
  }
  if (response.status === 404) {
    return { ok: false, reason: `Model “${options.model}” wasn’t found. Choose a current Gemini model in Settings.` };
  }
  if (!response.ok) return { ok: false, reason: `AI parse failed (${response.status}). Check your API key in Settings.` };

  const envelope = geminiResponseSchema.safeParse(await response.json());
  const replyText = envelope.success ? envelope.data.candidates[0]?.content.parts[0]?.text : undefined;
  if (!replyText) return { ok: false, reason: 'AI returned an empty answer.' };

  let json: unknown;
  try {
    json = JSON.parse(replyText);
  } catch {
    return { ok: false, reason: 'AI returned malformed JSON.' };
  }
  const reply = llmReplySchema.safeParse(json);
  if (!reply.success) return { ok: false, reason: 'AI answer did not pass validation.' };

  const target = toTarget(reply.data.kind, reply.data.category);
  if (!target) return { ok: false, reason: 'AI picked an unknown category.' };
  const creditor = reply.data.creditor?.toLowerCase();
  const debt = creditor ? debts.find((d) => d.creditor.toLowerCase() === creditor) : undefined;

  return {
    ok: true,
    draft: {
      target: debt ? { kind: 'debt', category: 'debt' } : target,
      amount: fromMajor(reply.data.amount),
      date: reply.data.date,
      description: reply.data.description,
      debtId: debt?.id ?? null,
      confidence: 'high',
      matchedTerm: null,
      source: 'ai',
    },
  };
};
