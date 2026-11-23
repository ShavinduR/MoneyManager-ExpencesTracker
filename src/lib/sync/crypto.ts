/**
 * End-to-end encryption for device sync (Web Crypto only, no dependencies).
 *
 * - QR pairing: a random 256-bit AES-GCM key travels inside the QR code (strong).
 * - 6-digit code pairing: the key is derived with PBKDF2-SHA-256 from the code plus a random
 *   per-session salt. A 6-digit code has only 10^6 possibilities, so this protects against
 *   passive observers but not against an attacker who can capture ciphertext and brute-force
 *   offline. That is why sessions expire after 5 minutes, accept one connection, verify the key
 *   before anything is sent, and require the sender to approve the transfer.
 * Every ciphertext is bound to its purpose with AES-GCM additional data.
 */

export const PBKDF2_ITERATIONS = 600_000;
const KEY_BYTES = 32;
const IV_BYTES = 12;
export const SALT_BYTES = 16;

const subtle = (): SubtleCrypto => {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is not available in this browser.');
  return globalThis.crypto.subtle;
};

// ---------- base64url ----------

export const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('Invalid base64url');
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
};

export const randomBytes = (length: number): Uint8Array<ArrayBuffer> => globalThis.crypto.getRandomValues(new Uint8Array(length));

const utf8 = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);

// ---------- Pairing code ----------

/** Uniform 6-digit code via rejection sampling (no modulo bias). */
export const generatePairingCode = (): string => {
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  for (;;) {
    const [value] = globalThis.crypto.getRandomValues(new Uint32Array(1));
    if (value !== undefined && value < limit) return String(value % 1_000_000).padStart(6, '0');
  }
};

/** "482913" → "482-913" */
export const formatPairingCode = (code: string): string => `${code.slice(0, 3)}-${code.slice(3)}`;

/** Accepts "482-913", "482 913" or "482913"; returns the 6 digits or null. */
export const normalizePairingCode = (input: string): string | null => {
  const digits = input.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
};

/** The signaling room both devices can compute from the code. */
export const roomIdForCode = async (code: string): Promise<string> => {
  const hash = new Uint8Array(await subtle().digest('SHA-256', utf8(`mindset-finance-planner/sync/v1/room:${code}`)));
  return `mfp-sync-${[...hash.slice(0, 20)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
};

// ---------- Keys ----------

export const generateRawKey = (): Uint8Array<ArrayBuffer> => randomBytes(KEY_BYTES);

export const importAesKey = (raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> => {
  if (raw.length !== KEY_BYTES) throw new Error('Sync key must be 256 bits');
  return subtle().importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

export const deriveKeyFromCode = async (code: string, salt: Uint8Array<ArrayBuffer>, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> => {
  const material = await subtle().importKey('raw', utf8(code), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
};

// ---------- Encrypt / decrypt ----------

export type Envelope = { iv: string; ct: string };

/** Purpose labels bound to every ciphertext (AES-GCM additional data). */
export type CipherPurpose = 'hello' | 'payload';
const aad = (purpose: CipherPurpose): Uint8Array<ArrayBuffer> => utf8(`mindset-finance-planner/sync/v1/${purpose}`);

export const encryptText = async (key: CryptoKey, plaintext: string, purpose: CipherPurpose): Promise<Envelope> => {
  const iv = randomBytes(IV_BYTES);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad(purpose) }, key, utf8(plaintext)));
  return { iv: toBase64Url(iv), ct: toBase64Url(ct) };
};

/** Throws on a wrong key, a wrong purpose, or any tampering (GCM authentication). */
export const decryptText = async (key: CryptoKey, envelope: Envelope, purpose: CipherPurpose): Promise<string> => {
  const iv = fromBase64Url(envelope.iv);
  if (iv.length !== IV_BYTES) throw new Error('Invalid IV');
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: aad(purpose) }, key, fromBase64Url(envelope.ct));
  return new TextDecoder().decode(plain);
};
