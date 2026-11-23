/**
 * Short random codes the user must type to confirm an irreversible action (e.g. deleting all data).
 * Not a secret: it only proves a deliberate action, so an accidental tap can't wipe anything.
 */
export const CONFIRM_CODE_LENGTH = 4;

/** Uniform 4-digit code, never all the same digit (e.g. "1111" is too easy to type by accident). */
export const generateConfirmCode = (random: () => number = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0): string => {
  for (;;) {
    const value = random();
    if (value >= Math.floor(0x1_0000_0000 / 10_000) * 10_000) continue; // rejection sampling: no modulo bias
    const code = String(value % 10_000).padStart(CONFIRM_CODE_LENGTH, '0');
    if (!/^(\d)\1+$/.test(code)) return code;
  }
};

/** Ignores spaces and anything that isn't a digit, so "4 8 2 9" matches "4829". */
export const matchesConfirmCode = (input: string, code: string): boolean => input.replace(/\D/g, '') === code;
