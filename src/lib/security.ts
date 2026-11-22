/**
 * Security-by-design helpers for the Bank Accounts module.
 * The app never stores credentials; these guards also catch them being typed into free-text fields.
 */

const SECRET_PATTERNS: readonly RegExp[] = [
  /\b(pass(word|wd|code)?|pwd|pin|otp|cvv|cvc|security (code|question|answer)|secret|login|username|user ?id)\b/i,
  /\b(mother'?s maiden|memorable word|access code)\b/i,
  /\b\d{12,19}\b/, // looks like a full card / account number
];

/** True when free text looks like it contains a credential or a full card/account number. */
export const looksLikeSecret = (text: string): boolean => SECRET_PATTERNS.some((p) => p.test(text));

/** Keeps digits only and the LAST 4 of them: "4111 1111 1111 1234" → "1234". */
export const toLast4 = (input: string): string => input.replace(/\D/g, '').slice(-4);

export const maskLast4 = (last4: string | null): string => (last4 ? `•••• ${last4}` : '—');
