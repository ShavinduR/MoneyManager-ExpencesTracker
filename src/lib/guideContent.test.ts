import { describe, expect, it } from 'vitest';
import { GUIDE, GUIDE_LANGUAGES } from './guideContent';

const SINHALA = /[඀-෿]/;

describe('bilingual guide content', () => {
  it('every language has the same 3-step structure', () => {
    for (const lang of GUIDE_LANGUAGES) {
      expect(GUIDE[lang].steps).toHaveLength(3);
      GUIDE[lang].steps.forEach((step, i) => expect(step.points.length).toBe(GUIDE.en.steps[i]?.points.length));
    }
  });

  it('the Sinhala guide is actually translated (no English left behind except product names)', () => {
    const si = GUIDE.si;
    const strings = [si.title, si.intro, si.tip, si.tourButton, si.syncButton, si.privacy, ...si.steps.flatMap((s) => [s.title, ...s.points])];
    for (const text of strings) expect(text).toMatch(SINHALA);
  });

  it('covers the three monthly moments in English', () => {
    expect(GUIDE.en.steps.map((s) => s.title)).toEqual(['Start of the month', 'During the month', 'End of the month']);
  });
});
