import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoData } from './demoData';
import { emptyData, emptyMonth, emptyGoal } from './factories';
import { fromMajor } from './money';
import { clearOnboardingFlags, getOnboardingFlags, setOnboardingFlags } from './localPrefs';
import { DEFAULT_ONBOARDING_FLAGS, completedCount, onboardingSteps, shouldShowChecklist } from './onboarding';

const flags = DEFAULT_ONBOARDING_FLAGS;
const done = (data = emptyData(), f = flags) => Object.fromEntries(onboardingSteps(data, f).map((s) => [s.id, s.done]));

describe('onboarding checklist auto-completion', () => {
  it('a fresh device has nothing done and shows the checklist', () => {
    const steps = onboardingSteps(emptyData(), flags);
    expect(completedCount(steps)).toBe(0);
    expect(shouldShowChecklist(steps, flags)).toBe(true);
  });

  it('starting balance: profile balance OR a month override', () => {
    const viaProfile = { ...emptyData(), profile: { ...emptyData().profile, initialBalance: fromMajor(50000) } };
    expect(done(viaProfile).balance).toBe(true);
    const viaOverride = { ...emptyData(), months: { '2026-11': { ...emptyMonth('2026-11'), openingBalanceOverride: fromMajor(0) } } };
    expect(done(viaOverride).balance).toBe(true); // an explicit Rs. 0 override still counts as "set"
  });

  it('first entry: any monthly entry or other bill', () => {
    const entry = { ...emptyData(), months: { '2026-11': { ...emptyMonth('2026-11'), entries: [{ id: 'e', kind: 'fixed' as const, category: 'food' as const, date: '2026-11-02', description: 'Lunch', amount: fromMajor(850), cleared: true }] } } };
    expect(done(entry).entry).toBe(true);
    const bill = { ...emptyData(), months: { '2026-11': { ...emptyMonth('2026-11'), otherBills: [{ id: 'b', name: 'Doctor', dueDate: '2026-11-05', amountDue: fromMajor(3000), amountPaid: fromMajor(0), paid: false, category: 'health' as const, notes: '' }] } } };
    expect(done(bill).entry).toBe(true);
  });

  it('monthly goal: blank goal slots don’t count, a written one does', () => {
    const blank = { ...emptyData(), months: { '2026-11': emptyMonth('2026-11') } };
    expect(done(blank).goal).toBe(false);
    const written = { ...emptyData(), months: { '2026-11': { ...emptyMonth('2026-11'), goals: [{ ...emptyGoal(), text: 'Cook at home' }] } } };
    expect(done(written).goal).toBe(true);
  });

  it('protect: only the device flag completes it', () => {
    expect(done(emptyData()).protect).toBe(false);
    expect(done(emptyData(), { ...flags, protectVisited: true }).protect).toBe(true);
  });

  it('hides when all steps are done, when dismissed, or while exploring sample data', () => {
    const demo = createDemoData(new Date('2026-11-22T10:00:00'));
    const allDone = onboardingSteps(demo, { ...flags, protectVisited: true });
    expect(completedCount(allDone)).toBe(4);
    expect(shouldShowChecklist(allDone, flags)).toBe(false);
    const fresh = onboardingSteps(emptyData(), flags);
    expect(shouldShowChecklist(fresh, { ...flags, dismissed: true })).toBe(false);
    expect(shouldShowChecklist(fresh, { ...flags, sampleLoaded: true })).toBe(false);
  });
});

describe('onboarding flags storage (device-only)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const memoryStorage = () => {
    const map = new Map<string, string>();
    return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
  };

  it('round-trips, ignores corrupt values and clears', () => {
    const ls = memoryStorage();
    vi.stubGlobal('localStorage', ls);
    expect(getOnboardingFlags()).toEqual(flags);
    setOnboardingFlags({ dismissed: true, protectVisited: false, sampleLoaded: true });
    expect(getOnboardingFlags()).toEqual({ dismissed: true, protectVisited: false, sampleLoaded: true });
    ls.setItem('mfp-onboarding', '{not json');
    expect(getOnboardingFlags()).toEqual(flags);
    ls.setItem('mfp-onboarding', JSON.stringify({ dismissed: 'yes', protectVisited: 1 }));
    expect(getOnboardingFlags()).toEqual(flags);
    clearOnboardingFlags();
    expect(ls.getItem('mfp-onboarding')).toBeNull();
  });
});
