import { describe, expect, it } from 'vitest';
import { looksLikeSecret, maskLast4, toLast4 } from './security';

describe('security helpers', () => {
  it.each(['my password is abc', 'PIN 1234', 'login: kasun92', 'OTP to phone', 'card 4111111111111111', 'security question: pet'])(
    'flags %s',
    (text) => expect(looksLikeSecret(text)).toBe(true),
  );

  it.each(['Salary credited on the 25th', 'Emergency fund only', 'Branch: Kandy', 'Pay in full from next year'])(
    'allows %s',
    (text) => expect(looksLikeSecret(text)).toBe(false),
  );

  it('keeps only the last 4 digits', () => {
    expect(toLast4('4111 1111 1111 1234')).toBe('1234');
    expect(toLast4('12')).toBe('12');
    expect(maskLast4('1234')).toBe('•••• 1234');
    expect(maskLast4(null)).toBe('—');
  });
});
