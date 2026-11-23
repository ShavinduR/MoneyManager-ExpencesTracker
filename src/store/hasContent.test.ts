import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { emptyData, emptyMonth } from '@/lib/factories';
import { hasContent } from './useFinanceStore';

describe('hasContent', () => {
  it('is false for a fresh profile and true once anything exists', () => {
    expect(hasContent(emptyData())).toBe(false);
    expect(hasContent({ ...emptyData(), months: { '2026-11': emptyMonth('2026-11') } })).toBe(true);
  });
});
