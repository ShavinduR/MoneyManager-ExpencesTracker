import { z } from 'zod';

/**
 * Wire protocol for device sync. Every message from the other device is untrusted and parsed with
 * zod before use (CLAUDE.md: trust boundaries use zod).
 *
 *   sender (host)                         receiver (joiner)
 *   ─────────────                         ────────────────
 *   ◀── connect (signalling room) ──────
 *   welcome {salt} ─────────────────────▶
 *   ◀────────────────── hello {method, proof}   proof = AES-GCM("proof:<salt>") with the pairing key
 *   accepted ───────────────────────────▶       key verified; sender is asked "Send your data?"
 *   meta {iv, chunks, length} ──────────▶
 *   chunk {i, data} × n ────────────────▶
 *   ◀──────────────────────────── ack {ok}      receiver decrypted + validated (or rejected)
 */

export const PROTOCOL_VERSION = 1;
/**
 * Characters of base64url ciphertext per DataChannel message. PeerJS's JSON channel refuses
 * messages of 16,300 bytes or more, so this leaves room for the JSON wrapper.
 */
export const CHUNK_CHARS = 12_000;

const b64url = z.string().regex(/^[A-Za-z0-9_-]+$/).max(200);
const envelope = z.object({ iv: b64url, ct: b64url }).strict();

export const pairingMethodSchema = z.enum(['code', 'qr']);
export type PairingMethod = z.infer<typeof pairingMethodSchema>;

export const hostMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('welcome'), v: z.literal(PROTOCOL_VERSION), salt: b64url }).strict(),
  z.object({ t: z.literal('accepted') }).strict(),
  z.object({ t: z.literal('meta'), iv: b64url, chunks: z.number().int().min(1).max(10_000), length: z.number().int().min(1) }).strict(),
  z.object({ t: z.literal('chunk'), i: z.number().int().min(0), data: z.string().regex(/^[A-Za-z0-9_-]+$/).max(CHUNK_CHARS) }).strict(),
  z.object({ t: z.literal('declined') }).strict(),
  z.object({ t: z.literal('bad-key') }).strict(),
  z.object({ t: z.literal('busy') }).strict(),
]);
export type HostMessage = z.infer<typeof hostMessageSchema>;

export const joinMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('hello'), v: z.literal(PROTOCOL_VERSION), method: pairingMethodSchema, proof: envelope }).strict(),
  z.object({ t: z.literal('ack'), ok: z.boolean() }).strict(),
]);
export type JoinMessage = z.infer<typeof joinMessageSchema>;

export const parseHostMessage = (value: unknown): HostMessage | null => {
  const parsed = hostMessageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
export const parseJoinMessage = (value: unknown): JoinMessage | null => {
  const parsed = joinMessageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const proofText = (salt: string): string => `proof:${salt}`;

/** Split a ciphertext string into DataChannel-sized chunks. */
export const chunkText = (text: string, size = CHUNK_CHARS): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks.length ? chunks : [''];
};

// ---------- QR code contents ----------

const QR_PREFIX = 'mfp-sync';
const QR_PATTERN = /^mfp-sync:1:(\d{6}):([A-Za-z0-9_-]{43})$/;

export type QrPairing = { code: string; key: string };

/** "mfp-sync:1:<6-digit code>:<256-bit key, base64url>" */
export const buildQrText = ({ code, key }: QrPairing): string => `${QR_PREFIX}:${PROTOCOL_VERSION}:${code}:${key}`;

export const parseQrText = (text: string): QrPairing | null => {
  const match = QR_PATTERN.exec(text.trim());
  const code = match?.[1];
  const key = match?.[2];
  return code && key ? { code, key } : null;
};
