/** Guide languages, split from the guide text so the text itself stays out of the entry chunk. */
export const GUIDE_LANGUAGES = ['en', 'si'] as const;
export type GuideLanguage = (typeof GUIDE_LANGUAGES)[number];
