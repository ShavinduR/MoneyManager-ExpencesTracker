import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoData } from '@/lib/demoData';
import { ResilientRepository } from './index';

/** Minimal in-memory localStorage for node. */
const fakeLocalStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
};

describe('ResilientRepository (H1: storage fallback instead of a blank screen)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('falls back to localStorage when indexedDB.open throws synchronously', async () => {
    vi.stubGlobal('indexedDB', { open: () => { throw new DOMException('blocked', 'SecurityError'); } });
    vi.stubGlobal('localStorage', fakeLocalStorage());
    const repo = new ResilientRepository();
    expect(await repo.load()).toEqual({ kind: 'empty' });
    expect(repo.mode).toBe('localstorage');
    const demo = createDemoData(new Date('2026-11-22T10:00:00'));
    await repo.replaceAll(demo);
    const again = new ResilientRepository();
    expect(await again.load()).toEqual({ kind: 'loaded', data: demo, issues: [] });
  });

  it('falls back to memory when no storage is allowed at all', async () => {
    vi.stubGlobal('indexedDB', { open: () => { throw new DOMException('blocked', 'SecurityError'); } });
    vi.stubGlobal('localStorage', { setItem: () => { throw new DOMException('denied', 'SecurityError'); } });
    const repo = new ResilientRepository();
    expect(await repo.load()).toEqual({ kind: 'empty' });
    expect(repo.mode).toBe('memory');
    await repo.saveProfile(createDemoData().profile);
    expect((await repo.load()).kind).toBe('loaded');
  });

  it('localStorage adapter never drops the first write', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const ls = fakeLocalStorage();
    vi.stubGlobal('localStorage', ls);
    const repo = new ResilientRepository();
    expect(await repo.load()).toEqual({ kind: 'empty' });
    await repo.saveProfile({ ...createDemoData().profile, name: 'First write' });
    expect(ls.getItem('mfp-data')).toContain('First write');
  });
});
