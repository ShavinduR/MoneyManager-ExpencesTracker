import { describe, expect, it } from 'vitest';
import { startCrossTabSync } from './sync';

describe('startCrossTabSync (H2)', () => {
  it('notifies other tabs but not itself', async () => {
    let aHeard = 0;
    let bHeard = 0;
    const a = startCrossTabSync(() => (aHeard += 1));
    startCrossTabSync(() => (bHeard += 1));
    a.notify();
    await new Promise((r) => setTimeout(r, 50));
    expect(bHeard).toBe(1);
    expect(aHeard).toBe(0);
  });
});
