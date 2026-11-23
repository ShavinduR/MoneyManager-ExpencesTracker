import { describe, expect, it } from 'vitest';
import { buildQrText, chunkText, parseHostMessage, parseJoinMessage, parseQrText } from './protocol';

const KEY = 'A'.repeat(43);

describe('sync protocol', () => {
  it('QR text round-trips and rejects anything else', () => {
    expect(parseQrText(buildQrText({ code: '123456', key: KEY }))).toEqual({ code: '123456', key: KEY });
    expect(parseQrText('https://evil.example/123456')).toBeNull();
    expect(parseQrText(`mfp-sync:2:123456:${KEY}`)).toBeNull();
    expect(parseQrText(`mfp-sync:1:12345:${KEY}`)).toBeNull();
    expect(parseQrText(`mfp-sync:1:123456:${KEY}=`)).toBeNull();
  });

  it('parses only well-formed messages (strict, no extra keys)', () => {
    expect(parseHostMessage({ t: 'welcome', v: 1, salt: 'abc' })).toEqual({ t: 'welcome', v: 1, salt: 'abc' });
    expect(parseHostMessage({ t: 'welcome', v: 1, salt: 'abc', extra: true })).toBeNull();
    expect(parseHostMessage({ t: 'chunk', i: 0, data: 'not base64!' })).toBeNull();
    expect(parseHostMessage({ t: 'meta', iv: 'a', chunks: 0, length: 1 })).toBeNull();
    expect(parseHostMessage('{"t":"accepted"}')).toBeNull();
    expect(parseJoinMessage({ t: 'hello', v: 1, method: 'code', proof: { iv: 'a', ct: 'b' } })).not.toBeNull();
    expect(parseJoinMessage({ t: 'hello', v: 1, method: 'password', proof: { iv: 'a', ct: 'b' } })).toBeNull();
  });

  it('chunks text and reassembles it exactly', () => {
    const text = 'x'.repeat(70_001);
    const chunks = chunkText(text, 32_000);
    expect(chunks.map((c) => c.length)).toEqual([32_000, 32_000, 6_001]);
    expect(chunks.join('')).toBe(text);
  });
});
