import type { BackupEnvelope, FinanceData } from '@/types/finance';
import { parseImport } from './schema';

export const BACKUP_APP_ID = 'mindset-finance-planner';

/** Real backups are well under 1 MB; anything far larger is refused before it is read into memory. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const createBackup = (data: FinanceData, now: Date = new Date()): BackupEnvelope => ({
  app: BACKUP_APP_ID,
  exportedAt: now.toISOString(),
  data,
});

export const serializeBackup = (data: FinanceData, now?: Date): string => JSON.stringify(createBackup(data, now), null, 2);

export type BackupParseResult = { ok: true; data: FinanceData; exportedAt: string | null } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Pure: JSON text → validated FinanceData. Accepts a backup envelope or a bare data document,
 * migrates older schema versions, then validates with zod (unknown bank-account keys such as
 * "password" are rejected by the strict schema).
 */
export const parseBackupText = (text: string): BackupParseResult => {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'File is too large to be a backup (limit 5 MB).' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (!isRecord(json)) return { ok: false, error: 'Backup must be a JSON object.' };
  if ('app' in json && json.app !== BACKUP_APP_ID) return { ok: false, error: 'This file is not a Mindset Finance Planner backup.' };
  const payload = 'data' in json ? json.data : json;
  const exportedAt = typeof json.exportedAt === 'string' ? json.exportedAt : null;

  const parsed = parseImport(payload);
  return parsed.ok ? { ok: true, data: parsed.value, exportedAt } : { ok: false, error: `Backup is invalid: ${parsed.error}` };
};

export type BackupStats = { months: number; entries: number; bills: number; debts: number; accounts: number; goals: number };

export const backupStats = (data: FinanceData): BackupStats => ({
  months: Object.keys(data.months).length,
  entries: Object.values(data.months).reduce((n, m) => n + m.entries.length, 0),
  bills: Object.values(data.months).reduce((n, m) => n + m.otherBills.length, 0),
  debts: data.debts.length,
  accounts: data.bankAccounts.length,
  goals: Object.values(data.yearPlans).reduce((n, p) => n + p.goals.filter((g) => g.title.trim()).length, 0),
});

export const backupFileName = (now: Date = new Date()): string => `mindset-planner-backup-${now.toISOString().slice(0, 10)}.json`;

/** Browser-only: triggers a download of the backup file. */
export const downloadBackup = (data: FinanceData): void => downloadJson(createBackup(data), backupFileName());

export const readBackupFile = async (file: File): Promise<BackupParseResult> =>
  file.size > MAX_IMPORT_BYTES
    ? { ok: false, error: `File is too large to be a backup (${(file.size / 1024 / 1024).toFixed(1)} MB; limit 5 MB).` }
    : parseBackupText(await file.text());

/** Browser-only: downloads whatever is in storage, unvalidated, so nothing is ever unrecoverable. */
export const downloadJson = (value: unknown, fileName: string): void => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
