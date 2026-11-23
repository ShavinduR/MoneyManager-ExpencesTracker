/**
 * "How it works" guide copy, in English and Sinhala. All wording is original to this app
 * (guarded by src/originality.test.ts). Kept as data so it is easy to review and translate.
 */
import type { GuideLanguage } from './guideLanguage';

export { GUIDE_LANGUAGES, type GuideLanguage } from './guideLanguage';

export type GuideStep = { title: string; points: readonly string[] };

export type GuideContent = {
  title: string;
  intro: string;
  steps: readonly [GuideStep, GuideStep, GuideStep];
  tip: string;
  tourButton: string;
  syncButton: string;
  privacy: string;
};

export const GUIDE: Record<GuideLanguage, GuideContent> = {
  en: {
    title: 'How it works',
    intro: 'A simple monthly rhythm: plan once, log as you go, review at the end.',
    steps: [
      {
        title: 'Start of the month',
        points: [
          'Set your starting balance and one or two goals for the month.',
          'Add the income you expect, your fixed bills, savings and debt installments in the Monthly tracker.',
        ],
      },
      {
        title: 'During the month',
        points: [
          'Log spending in seconds with Quick-Entry: type something like “ada lunch 850” and press Enter.',
          'Tap the circle next to a bill or entry once it’s paid.',
        ],
      },
      {
        title: 'End of the month',
        points: [
          'Add any unexpected bills under Other bills.',
          'Check the Monthly overview. It fills itself in, including what carries into next month.',
          'Write a short reflection, then back up or sync to another device.',
        ],
      },
    ],
    tip: 'Tip: on a keyboard, press / to jump straight to Quick-Entry.',
    tourButton: 'Take the 30s tour',
    syncButton: 'Back up & sync',
    privacy: 'Everything stays on this device unless you export a backup or sync it yourself.',
  },
  si: {
    title: 'මෙය ක්‍රියා කරන ආකාරය',
    intro: 'සරල මාසික රටාවක්: මාසය මුලදී සැලසුම් කරන්න, දිනපතා සටහන් කරන්න, මාසය අවසානයේ සමාලෝචනය කරන්න.',
    steps: [
      {
        title: 'මාසය ආරම්භයේදී',
        points: [
          'ඔබගේ ආරම්භක ශේෂය සහ මාසයට ඉලක්ක එකක් හෝ දෙකක් සකසන්න.',
          'අපේක්ෂිත ආදායම, ස්ථාවර බිල්පත්, ඉතිරිකිරීම් සහ ණය වාරික මාසික සටහනට එක් කරන්න.',
        ],
      },
      {
        title: 'මාසය තුළදී',
        points: [
          'Quick-Entry මගින් තත්පර කිහිපයකින් වියදම් සටහන් කරන්න: උදාහරණයක් ලෙස “ada lunch 850” ටයිප් කර Enter ඔබන්න.',
          'බිල්පතක් හෝ ගෙවීමක් ගෙවූ පසු, එය අසල ඇති රවුම ඔබන්න.',
        ],
      },
      {
        title: 'මාසය අවසානයේදී',
        points: [
          'අනපේක්ෂිත බිල්පත් “Other bills” කොටසට එක් කරන්න.',
          'මාසික සාරාංශය බලන්න. ඊළඟ මාසයට යන ශේෂය ද ඇතුළුව එය ස්වයංක්‍රීයව සකස් වේ.',
          'කෙටි ආවර්ජනයක් ලියා, දත්ත උපස්ථ කරන්න හෝ වෙනත් උපාංගයකට සමමුහුර්ත කරන්න.',
        ],
      },
    ],
    tip: 'ඉඟිය: යතුරුපුවරුවේ / ඔබා කෙලින්ම Quick-Entry වෙත යන්න.',
    tourButton: 'තත්පර 30 මඟපෙන්වීම',
    syncButton: 'උපස්ථ සහ සමමුහුර්තකරණය',
    privacy: 'ඔබ උපස්ථයක් අපනයනය කරන තුරු හෝ සමමුහුර්ත කරන තුරු, සියලු දත්ත මෙම උපාංගයේම පමණක් පවතී.',
  },
};

export const LANGUAGE_LABELS: Record<GuideLanguage, string> = { en: 'English', si: 'සිංහල' };
