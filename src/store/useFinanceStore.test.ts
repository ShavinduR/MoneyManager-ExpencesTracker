import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { createDemoData } from '@/lib/demoData';
import { emptyData, emptyMonth } from '@/lib/factories';
import { hasContent, useFinanceStore } from './useFinanceStore';

const flush = () => new Promise((r) => setTimeout(r, 30));

describe('hasContent', () => {
  it('is false for a fresh profile and true once anything exists', () => {
    expect(hasContent(emptyData())).toBe(false);
    expect(hasContent({ ...emptyData(), months: { '2026-11': emptyMonth('2026-11') } })).toBe(true);
  });
});

describe('store hydration (C1 end-to-end)', () => {
  it('a fresh device starts empty and writes nothing until the user acts', async () => {
    await useFinanceStore.getState().hydrate();
    const db = await openDB('mindset-finance-planner', 2);
    expect(await db.count('kv')).toBe(0);
    db.close();
    expect(useFinanceStore.getState().status).toBe('ready');
    expect(useFinanceStore.getState().hasData).toBe(false);
  });

  it('corrupt stored data is salvaged, reported and never wiped', async () => {
    const store = useFinanceStore.getState();
    await store.replaceAll(createDemoData(new Date('2026-11-22T10:00:00')));
    // Same path as the audit repro: an oversized quick-add amount is stored...
    const db = await openDB('mindset-finance-planner', 2);
    const nov = await db.get('months', '2026-11');
    await db.put('months', { ...nov, entries: [...nov.entries, { ...nov.entries[0], id: 'huge', amount: 1e19 }] });
    db.close();
    // ...and the app reloads.
    await useFinanceStore.getState().hydrate();
    const state = useFinanceStore.getState();
    expect(state.status).toBe('ready');
    expect(Object.keys(state.data.months)).toHaveLength(6);
    expect(state.loadIssues.length).toBeGreaterThan(0);
    const after = await openDB('mindset-finance-planner', 2);
    expect(await after.count('months')).toBe(6);
    after.close();
  });

  it('save failures are surfaced with a retry instead of being swallowed (M3)', async () => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function failingPut() {
      throw new DOMException('full', 'QuotaExceededError');
    };
    useFinanceStore.getState().updateProfile({ name: 'Will fail' });
    await flush();
    const error = useFinanceStore.getState().saveError;
    expect(error?.message).toMatch(/out of storage space/);
    IDBObjectStore.prototype.put = original;
    error?.retry();
    await flush();
    expect(useFinanceStore.getState().saveError).toBeNull();
  });
});
