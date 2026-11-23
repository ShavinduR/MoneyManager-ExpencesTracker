import { describe, expect, it } from 'vitest';
import {
  decryptText,
  deriveKeyFromCode,
  encryptText,
  formatPairingCode,
  fromBase64Url,
  generatePairingCode,
  generateRawKey,
  importAesKey,
  normalizePairingCode,
  randomBytes,
  roomIdForCode,
  toBase64Url,
} from './crypto';

const FAST = 1_000; // PBKDF2 iterations for tests only; the app uses 600k.

describe('sync crypto', () => {
  it('AES-GCM round-trips text with a random 256-bit key (QR pairing)', async () => {
    const key = await importAesKey(generateRawKey());
    const plaintext = JSON.stringify({ hello: 'ලංකාව', amount: 1_250_00 });
    const envelope = await encryptText(key, plaintext, 'payload');
    expect(envelope.ct).not.toContain('hello');
    expect(await decryptText(key, envelope, 'payload')).toBe(plaintext);
  });

  it('uses a fresh IV for every message', async () => {
    const key = await importAesKey(generateRawKey());
    const a = await encryptText(key, 'same', 'payload');
    const b = await encryptText(key, 'same', 'payload');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('rejects a wrong key', async () => {
    const envelope = await encryptText(await importAesKey(generateRawKey()), 'secret', 'payload');
    await expect(decryptText(await importAesKey(generateRawKey()), envelope, 'payload')).rejects.toThrow();
  });

  it('PBKDF2 code keys: same code + salt decrypts; wrong code or salt is rejected', async () => {
    const salt = randomBytes(16);
    const right = await deriveKeyFromCode('482913', salt, FAST);
    const envelope = await encryptText(right, 'payload', 'payload');
    expect(await decryptText(await deriveKeyFromCode('482913', salt, FAST), envelope, 'payload')).toBe('payload');
    await expect(decryptText(await deriveKeyFromCode('482914', salt, FAST), envelope, 'payload')).rejects.toThrow();
    await expect(decryptText(await deriveKeyFromCode('482913', randomBytes(16), FAST), envelope, 'payload')).rejects.toThrow();
  });

  it('detects tampering with the ciphertext or IV', async () => {
    const key = await importAesKey(generateRawKey());
    const envelope = await encryptText(key, 'the original backup', 'payload');
    const bytes = fromBase64Url(envelope.ct);
    bytes[3] = (bytes[3] ?? 0) ^ 0x01;
    await expect(decryptText(key, { ...envelope, ct: toBase64Url(bytes) }, 'payload')).rejects.toThrow();
    const iv = fromBase64Url(envelope.iv);
    iv[0] = (iv[0] ?? 0) ^ 0x01;
    await expect(decryptText(key, { ...envelope, iv: toBase64Url(iv) }, 'payload')).rejects.toThrow();
  });

  it('binds ciphertext to its purpose (a proof cannot be replayed as a payload)', async () => {
    const key = await importAesKey(generateRawKey());
    const proof = await encryptText(key, 'proof:abc', 'hello');
    await expect(decryptText(key, proof, 'payload')).rejects.toThrow();
  });

  it('pairing codes are 6 digits; formatting and normalising round-trip', () => {
    for (let i = 0; i < 200; i += 1) expect(generatePairingCode()).toMatch(/^\d{6}$/);
    expect(formatPairingCode('048213')).toBe('048-213');
    expect(normalizePairingCode('048-213')).toBe('048213');
    expect(normalizePairingCode(' 048 213 ')).toBe('048213');
    expect(normalizePairingCode('48213')).toBeNull();
    expect(normalizePairingCode('48a213')).toBeNull();
  });

  it('room ids are deterministic per code and do not reveal it', async () => {
    const room = await roomIdForCode('482913');
    expect(room).toBe(await roomIdForCode('482913'));
    expect(room).not.toBe(await roomIdForCode('482914'));
    expect(room).not.toContain('482913');
    expect(room).toMatch(/^mfp-sync-[0-9a-f]{40}$/);
  });

  it('base64url round-trips and rejects foreign characters', () => {
    const bytes = randomBytes(33);
    expect([...fromBase64Url(toBase64Url(bytes))]).toEqual([...bytes]);
    expect(() => fromBase64Url('abc+/=')).toThrow();
  });
});
