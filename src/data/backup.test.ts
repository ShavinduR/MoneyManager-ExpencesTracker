import { describe, expect, it } from 'vitest';
import { createDemoData } from '@/lib/demoData';
import { backupStats, parseBackupText, serializeBackup } from './backup';

const demo = createDemoData(new Date('2026-11-22T10:00:00'));

describe('backup round trip', () => {
  it('export → import returns identical data', () => {
    const result = parseBackupText(serializeBackup(demo, new Date('2026-11-23T00:00:00Z')));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(demo);
    expect(result.exportedAt).toBe('2026-11-23T00:00:00.000Z');
  });

  it('accepts a bare data document', () => {
    const result = parseBackupText(JSON.stringify(demo));
    expect(result.ok).toBe(true);
  });

  it('counts what is inside a backup', () => {
    expect(backupStats(demo)).toMatchObject({ months: 6, debts: 2, accounts: 4, goals: 4 });
  });
});

describe('backup rejection', () => {
  const tamper = (mutate: (doc: Record<string, unknown>) => void): string => {
    const doc = JSON.parse(serializeBackup(demo));
    mutate(doc);
    return JSON.stringify(doc);
  };

  it('rejects malformed JSON', () => {
    expect(parseBackupText('{nope')).toEqual({ ok: false, error: 'File is not valid JSON.' });
  });

  it('rejects files from other apps', () => {
    expect(parseBackupText(JSON.stringify({ app: 'something-else', data: demo })).ok).toBe(false);
  });

  it('rejects backups from a newer schema version', () => {
    const r = parseBackupText(tamper((d) => { (d.data as Record<string, unknown>).schemaVersion = 99; }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/newer version/);
  });

  it('rejects a bank account carrying a password field (security by design)', () => {
    const r = parseBackupText(tamper((d) => {
      const accounts = (d.data as { bankAccounts: Record<string, unknown>[] }).bankAccounts;
      if (accounts[0]) accounts[0].password = 'hunter2';
    }));
    expect(r.ok).toBe(false);
  });

  it('rejects a full card number in cardLast4', () => {
    const r = parseBackupText(tamper((d) => {
      const accounts = (d.data as { bankAccounts: Record<string, unknown>[] }).bankAccounts;
      if (accounts[0]) accounts[0].cardLast4 = '4111111111111111';
    }));
    expect(r.ok).toBe(false);
  });

  it('rejects floating-point amounts (money must be integer cents)', () => {
    const r = parseBackupText(tamper((d) => {
      const months = (d.data as { months: Record<string, { entries: { amount: number }[] }> }).months;
      const first = Object.values(months)[0]?.entries[0];
      if (first) first.amount = 1500.5;
    }));
    expect(r.ok).toBe(false);
  });
});
