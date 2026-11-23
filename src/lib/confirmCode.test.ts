import { describe, expect, it } from 'vitest';
import { generateConfirmCode, matchesConfirmCode } from './confirmCode';

describe('confirm code', () => {
  it('is always 4 digits and never a repeated digit', () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateConfirmCode();
      expect(code).toMatch(/^\d{4}$/);
      expect(code).not.toMatch(/^(\d)\1{3}$/);
    }
  });

  it('pads small values and skips repeated digits and biased values', () => {
    const values = [0xffff_ffff, 1111, 42];
    expect(generateConfirmCode(() => values.shift() ?? 0)).toBe('0042');
  });

  it('matches only the exact digits', () => {
    expect(matchesConfirmCode('4829', '4829')).toBe(true);
    expect(matchesConfirmCode(' 48 29 ', '4829')).toBe(true);
    expect(matchesConfirmCode('482', '4829')).toBe(false);
    expect(matchesConfirmCode('48290', '4829')).toBe(false);
    expect(matchesConfirmCode('', '4829')).toBe(false);
  });
});
