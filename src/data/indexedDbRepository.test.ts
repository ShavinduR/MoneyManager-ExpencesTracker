import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { createDemoData } from '@/lib/demoData';
import { emptyMonth } from '@/lib/factories';
import { IndexedDbRepository } from './indexedDbRepository';

const DB = 'mindset-finance-planner';

/** Writes raw (possibly invalid) records straight into IndexedDB, bypassing the app. */
const putRaw = async (store: 'months' | 'kv', value: unknown): Promise<void> => {
  const db = await openDB(DB, 2);
  await db.put(store, value);
  db.close();
};
const countRaw = async (store: 'months' | 'recovery'): Promise<number> => {
  const db = await openDB(DB, 2);
  const n = await db.count(store);
  db.close();
  return n;
};

describe('IndexedDbRepository', () => {
  const demo = createDemoData(new Date('2026-11-22T10:00:00'));

  it('reports empty storage as empty, without writing anything', async () => {
    const repo = new IndexedDbRepository();
    await repo.clear();
    expect(await repo.load()).toEqual({ kind: 'empty' });
    expect(await countRaw('months')).toBe(0);
  });

  it('persists and reloads the full document', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    expect(await repo.load()).toEqual({ kind: 'loaded', data: demo, issues: [] });
  });

  it('saves individual months and profile', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    await repo.saveMonth({ ...emptyMonth('2027-01'), notes: 'New year' });
    await repo.saveProfile({ ...demo.profile, name: 'Changed' });
    const loaded = await repo.load();
    if (loaded.kind !== 'loaded') throw new Error(loaded.kind);
    expect(loaded.data.months['2027-01']?.notes).toBe('New year');
    expect(loaded.data.profile.name).toBe('Changed');
  });

  it('C1 regression: one invalid entry no longer wipes the database', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    const nov = demo.months['2026-11'];
    if (!nov) throw new Error('fixture');
    // The exact value from the audit: 99999999999999999 rupees → unsafe integer cents.
    const bad = { ...nov, entries: [...nov.entries, { ...nov.entries[0], id: 'bad', amount: 1e19 }] };
    await putRaw('months', bad);

    const loaded = await repo.load();
    if (loaded.kind !== 'loaded') throw new Error(loaded.kind);
    expect(Object.keys(loaded.data.months)).toHaveLength(6);
    expect(loaded.data.months['2026-11']?.entries).toHaveLength(nov.entries.length);
    expect(loaded.issues.join(' ')).toMatch(/November 2026: 1 entry couldn’t be read/);
    // Nothing was deleted, and a raw recovery copy was kept.
    expect(await countRaw('months')).toBe(6);
    expect(await countRaw('recovery')).toBeGreaterThan(0);
    const raw = JSON.stringify(await repo.exportRaw());
    expect(raw).toContain('"id":"bad"');
  });

  it('data written by a newer app version is reported unreadable and left untouched', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    await putRaw('kv', { key: 'schemaVersion', value: 99 });
    const loaded = await repo.load();
    expect(loaded).toMatchObject({ kind: 'unreadable' });
    expect(await countRaw('months')).toBe(6);
  });

  it('clear() leaves nothing to load', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    await repo.clear();
    expect(await repo.load()).toEqual({ kind: 'empty' });
  });
});
