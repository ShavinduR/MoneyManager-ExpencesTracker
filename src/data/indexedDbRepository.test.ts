import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDemoData } from '@/lib/demoData';
import { emptyMonth } from '@/lib/factories';
import { IndexedDbRepository } from './indexedDbRepository';

describe('IndexedDbRepository', () => {
  const demo = createDemoData(new Date('2026-11-22T10:00:00'));

  it('persists and reloads the full document', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    expect(await repo.load()).toEqual(demo);
  });

  it('saves individual months and profile', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    await repo.saveMonth({ ...emptyMonth('2027-01'), notes: 'New year' });
    await repo.saveProfile({ ...demo.profile, name: 'Changed' });
    const loaded = await repo.load();
    expect(loaded?.months['2027-01']?.notes).toBe('New year');
    expect(loaded?.profile.name).toBe('Changed');
  });

  it('clear() leaves nothing to load', async () => {
    const repo = new IndexedDbRepository();
    await repo.replaceAll(demo);
    await repo.clear();
    expect(await repo.load()).toBeNull();
  });
});
