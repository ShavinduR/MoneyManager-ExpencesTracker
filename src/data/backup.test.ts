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

  // ---- Audit M2 / L13 / H3 regressions: every probe that used to be ACCEPTED ----
  type Doc = {
    months: Record<string, { month: string; entries: Record<string, unknown>[]; otherBills: Record<string, unknown>[] }>;
    debts: Record<string, unknown>[];
    bankAccounts: Record<string, unknown>[];
    profile: Record<string, unknown>;
  };
  const edit = (f: (d: Doc) => void): string => tamper((doc) => f(doc.data as Doc));
  const firstMonth = (d: Doc) => {
    const m = Object.values(d.months)[0];
    if (!m) throw new Error('fixture');
    return m;
  };

  it.each<[string, (d: Doc) => void, RegExp]>([
    ['negative entry amount', (d) => { const e = firstMonth(d).entries[0]; if (e) e.amount = -500000; }, /negative/],
    ['negative bill amountDue', (d) => { const b = firstMonth(d).otherBills[0]; if (b) b.amountDue = -100; }, /negative/],
    ['negative debt startingBalance', (d) => { const x = d.debts[0]; if (x) x.startingBalance = -1; }, /negative/],
    ['amount above the 1-trillion limit', (d) => { const e = firstMonth(d).entries[0]; if (e) e.amount = 1e15; }, /too large/],
    ['month key ≠ record.month', (d) => { firstMonth(d).month = '2019-01'; }, /record says it is 2019-01/],
    ['entry dated in another month', (d) => { const e = firstMonth(d).entries[0]; if (e) e.date = '2010-01-01'; }, /dated 2010-01-01/],
    ['bill due in another month', (d) => { const b = firstMonth(d).otherBills[0]; if (b) b.dueDate = '2010-01-01'; }, /due 2010-01-01/],
    ['orphan debtId', (d) => { const e = firstMonth(d).entries.find((x) => x.kind === 'debt'); if (e) e.debtId = 'ghost'; }, /debt that isn’t in the file/],
    ['duplicate entry ids', (d) => { const [a, b] = firstMonth(d).entries; if (a && b) b.id = a.id; }, /duplicate id/],
    ['debt accountRef with letters (L13)', (d) => { const x = d.debts[0]; if (x) x.accountRef = 'ab'; }, /last 4 digits/],
    ['debt with an extra "password" field', (d) => { const x = d.debts[0]; if (x) x.password = 'x'; }, /Unrecognized key/],
    ['profile with a smuggled API key', (d) => { d.profile.geminiKey = 'AIzaXXXX'; }, /Unrecognized key/],
    ['bank notes containing a password (H3)', (d) => { const a = d.bankAccounts[0]; if (a) a.notes = 'password is hunter2, pin 1234'; }, /looks like a password/],
    ['bank institution containing a PIN (H3)', (d) => { const a = d.bankAccounts[0]; if (a) a.institution = 'HNB PIN1234'; }, /looks like a password/],
    ['oversized description string', (d) => { const e = firstMonth(d).entries[0]; if (e) e.description = 'x'.repeat(10_000); }, /Too big|too big|<=200/i],
  ])('rejects %s', (_name, mutate, message) => {
    const r = parseBackupText(edit(mutate));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(message);
  });

  it('rejects files over 5 MB before parsing', () => {
    const r = parseBackupText(' '.repeat(5 * 1024 * 1024 + 1));
    expect(r).toEqual({ ok: false, error: 'File is too large to be a backup (limit 5 MB).' });
  });

  it('HTML in text is accepted as plain data (React renders it as text, never markup)', () => {
    const r = parseBackupText(edit((d) => { const e = firstMonth(d).entries[0]; if (e) e.description = '<img src=x onerror=alert(1)>'; }));
    expect(r.ok).toBe(true);
  });
});
