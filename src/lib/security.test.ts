import { describe, expect, it } from 'vitest';
import { looksLikeSecret, maskLast4, toLast4 } from './security';

describe('looksLikeSecret: catches credentials', () => {
  it.each([
    // passwords
    'my password is abc',
    'pw: hunter2',
    'PW hunter2',
    'pw=abc',
    'pass: abc',
    'pass is hunter2',
    'pwd=abc',
    'p@ssword abc',
    'P@ssw0rd',
    'pass word abc',
    'passphrase horse battery',
    'passcode 0000',
    // PINs and codes
    'pin 1234',
    'PIN1234',
    'pin:1234',
    'ATM pin is 4455',
    'mpin 4455',
    'TPIN 9911',
    'otp 554433',
    'OTP:554433',
    'CVV 123',
    'cvv2 123',
    // security questions & memorable info
    'security question: pet',
    'security q: pet name',
    'security answer rex',
    'secret answer: rex',
    "mother's maiden name Perera",
    'memorable word: kandy',
    'access code 7781',
    // usernames / logins
    'Username kasun92',
    'user: kasun',
    'user id 88812',
    'login: kasun92',
    'Login hint: dog',
    'login note see diary',
    'online banking user kasun',
    'customer id 554321',
    // full card / account numbers
    'card 4111111111111111',
    '4111 1111 1111 1111',
    '4111-1111-1111-1111',
    'acct 1234 5678 9012',
  ])('flags %s', (text) => expect(looksLikeSecret(text)).toBe(true));
});

describe('looksLikeSecret: allows ordinary notes', () => {
  it.each([
    'Salary credited on the 25th',
    'Emergency fund only',
    'Branch: Kandy',
    'Pinnacle branch',
    'Spinning class fund',
    'Login-free wallet',
    'Monthly bus pass',
    'Passbook kept at home',
    'Pay in full from next year',
    'Call 077 123 4567 for the branch manager',
    'Opened 2019-04-12',
    'Do not touch unless real emergency',
  ])('allows %s', (text) => expect(looksLikeSecret(text)).toBe(false));
});

describe('card helpers', () => {
  it('keeps only the last 4 digits', () => {
    expect(toLast4('4111 1111 1111 1234')).toBe('1234');
    expect(toLast4('4111-1111-1111-1234')).toBe('1234');
    expect(toLast4('12')).toBe('12');
    expect(maskLast4('1234')).toBe('•••• 1234');
    expect(maskLast4(null)).toBe('—');
  });
});
