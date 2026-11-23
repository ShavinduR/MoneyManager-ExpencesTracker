import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoData } from '@/lib/demoData';
import { mirrorTheme, setGeminiKey, setGeminiModel, setGuideLanguage, setOnboardingFlags, setSidebarCollapsed } from '@/lib/localPrefs';
import { buildSyncPayload, parseSyncPayload } from './syncPayload';

describe('sync payload isolation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('never contains the Gemini key or any device-only preference', () => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    });
    const secretKey = 'AIzaSy-TEST-SECRET-KEY-1234567890';
    setGeminiKey(secretKey);
    setGeminiModel('gemini-test-model');
    setOnboardingFlags({ dismissed: true, protectVisited: true });
    setGuideLanguage('si');
    setSidebarCollapsed(true);
    mirrorTheme('dark');
    expect(map.size).toBeGreaterThanOrEqual(5);

    const payload = buildSyncPayload(createDemoData());
    expect(payload).not.toContain(secretKey);
    expect(payload).not.toContain('gemini-test-model');
    for (const key of map.keys()) expect(payload).not.toContain(key);
    expect(payload).not.toMatch(/gemini|apiKey|onboarding|sidebar|protectVisited|guide-lang/i);

    const parsed = parseSyncPayload(payload);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(Object.keys(parsed.data).sort()).toEqual(['bankAccounts', 'debts', 'months', 'profile', 'schemaVersion', 'yearPlans']);
  });
});
