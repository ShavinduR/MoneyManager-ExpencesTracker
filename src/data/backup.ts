import type { BackupEnvelope, FinanceData } from '@/types/finance';
import { parseAndMigrate } from './schema';

export const BACKUP_APP_ID = 'mindset-finance-planner';

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

  const parsed = parseAndMigrate(payload);
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
export const downloadBackup = (data: FinanceData): void => {
  const blob = new Blob([serializeBackup(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName();
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const readBackupFile = async (file: File): Promise<BackupParseResult> => parseBackupText(await file.text());
