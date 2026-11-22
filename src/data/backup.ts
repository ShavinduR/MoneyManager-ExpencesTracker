import type { BackupEnvelope, FinanceData } from '@/types/finance';
import { parseBackup, parseFinanceData } from './schema';

export const createBackup = (data: FinanceData): BackupEnvelope => ({
  app: 'mindset-finance-planner',
  exportedAt: new Date().toISOString(),
  data,
});

export const downloadBackup = (data: FinanceData): void => {
  const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindset-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Accepts either a backup envelope or a bare FinanceData document. */
export const readBackupFile = async (file: File): Promise<{ ok: true; data: FinanceData } | { ok: false; error: string }> => {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  const envelope = parseBackup(json);
  if (envelope.ok) return { ok: true, data: envelope.value.data };
  const bare = parseFinanceData(json);
  return bare.ok ? { ok: true, data: bare.value } : { ok: false, error: `Backup is invalid — ${envelope.error}` };
};
