import type { FinanceData } from '@/types/finance';
import { MAX_IMPORT_BYTES, parseBackupText, serializeBackup, type BackupParseResult } from './backup';

/**
 * What travels between devices: exactly a JSON backup of FinanceData. Device-only preferences
 * (Gemini key, theme mirror, sidebar, onboarding flags, guide language) live in localStorage via
 * lib/localPrefs and are not part of FinanceData, so they can never be included.
 */
export const buildSyncPayload = (data: FinanceData, now?: Date): string => serializeBackup(data, now);

/** Same pipeline as JSON import: 5 MB cap → JSON → migrations → strict zod (MAX_CENTS, secret guard, integrity). */
export const parseSyncPayload = (text: string): BackupParseResult => parseBackupText(text);

export const MAX_SYNC_PAYLOAD_BYTES = MAX_IMPORT_BYTES;

/** Upper bound on the base64url ciphertext a receiver will accept (payload + 16-byte GCM tag). */
export const MAX_SYNC_CIPHERTEXT_CHARS = Math.ceil(((MAX_SYNC_PAYLOAD_BYTES + 16) * 4) / 3) + 4;
