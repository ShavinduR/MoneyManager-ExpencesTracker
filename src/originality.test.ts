import { describe, expect, it } from 'vitest';

/**
 * V1 originality guard: the app's copy must be our own. The reference paper planner's slogan
 * must not reappear in the UI, sample data, HTML, public assets or docs.
 * Uses Vite's import.meta.glob (no Node APIs, so it type-checks with the app's tsconfig).
 */
const BANNED: readonly RegExp[] = [
  /richer than (you|i) think/i,
  /first step toward(s)? financial freedom/i,
  /how much wealth you already poss?ess?/i,
  /financial management in one versatile book/i,
  /right mindset and daily discipline/i,
];

const sources: Record<string, string> = {
  ...import.meta.glob('/src/**/*.{ts,tsx,css}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/public/**/*.{js,svg,webmanifest}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/{index.html,README.md,docs/**/*.md}', { query: '?raw', import: 'default', eager: true }),
};

describe('copy originality', () => {
  it('scans the app, assets and docs', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
    expect(Object.keys(sources)).toContain('/README.md');
  });

  it('does not use the reference planner’s slogan anywhere', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.endsWith('/originality.test.ts'))
      .filter(([, text]) => BANNED.some((re) => re.test(text)))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
