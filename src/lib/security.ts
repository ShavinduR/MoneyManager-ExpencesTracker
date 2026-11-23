/**
 * Security-by-design helpers for the Bank Accounts module.
 * The app never stores credentials; these guards catch them being typed or imported into free-text fields.
 *
 * Patterns use letter-boundaries `(?<![a-z])…(?![a-z])` instead of `\b` so that "PIN1234" or "pw:abc"
 * are still caught, while ordinary words ("Pinnacle", "spinning", "Login-free") are not.
 */

/** A letter-bounded term: not preceded or followed by another letter. */
const term = (source: string): RegExp => new RegExp(`(?<![a-z])(?:${source})(?![a-z])`, 'i');

const SECRET_PATTERNS: readonly RegExp[] = [
  // Passwords: explicit words, obfuscations (p@ssw0rd, pass word) and short forms followed by a value.
  term('passwords?|passwd|passcode|passphrase|pwd|pw'),
  /p[a@4][s$5]{2}[\s._-]?w[o0]r?d/i,
  /(?<![a-z])(?:pw|pass)\s*(?:[:=#]|is\b)/i,
  // PINs, one-time codes and card security codes (also "PIN1234", "mpin", "tpin").
  term('[mt]?pin|otp|cvv2?|cvc|cvn'),
  // Security questions / hints / memorable information.
  /security\s*(?:q(?:uestion)?|answer|code|hint|word)\b/i,
  term('secret|memorable\\s+(?:word|info(?:rmation)?)|mother\'?s\\s+maiden|access\\s+code'),
  // Usernames and login details given as values ("username kasun", "user: x", "login hint: dog").
  term('username|user\\s*id|customer\\s*id'),
  /(?<![a-z])(?:user|login)\s*(?:name|id|note|hint)?\s*[:=]/i,
  /(?<![a-z])login\s+(?:note|hint|details?|id)(?![a-z])/i,
  /online\s+banking\s+(?:user|login|id|password)/i,
  // A full card / account number: 12–19 digits, optionally grouped with spaces or dashes.
  /(?<!\d)(?:\d[ -]?){11,18}\d(?!\d)/,
];

/** True when free text looks like it contains a credential or a full card/account number. */
export const looksLikeSecret = (text: string): boolean => SECRET_PATTERNS.some((p) => p.test(text));

/** Keeps digits only and the LAST 4 of them: "4111 1111 1111 1234" → "1234". */
export const toLast4 = (input: string): string => input.replace(/\D/g, '').slice(-4);

export const maskLast4 = (last4: string | null): string => (last4 ? `•••• ${last4}` : '—');
