import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarDays, CalendarRange, Compass, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { GUIDE, GUIDE_LANGUAGES, LANGUAGE_LABELS, type GuideLanguage } from '@/lib/guideContent';
import { getGuideLanguage, setGuideLanguage } from '@/lib/localPrefs';
import { useUiStore } from '@/store/uiStore';

const STEP_ICONS = [CalendarDays, CalendarRange, CalendarCheck] as const;

/** Bilingual "How it works" guide (lazy-loaded from the header ? button). */
const HelpModal = () => {
  const closeHelp = useUiStore((s) => s.closeHelp);
  const startTour = useUiStore((s) => s.startTour);
  const navigate = useNavigate();
  const [lang, setLang] = useState<GuideLanguage>(getGuideLanguage);
  const copy = GUIDE[lang];

  const changeLanguage = (next: GuideLanguage): void => {
    setLang(next);
    setGuideLanguage(next);
  };

  return (
    <Modal
      open
      onClose={closeHelp}
      title={copy.title}
      footer={
        <>
          <Button
            className="max-sm:w-full"
            icon={<ShieldCheck className="size-4" />}
            onClick={() => {
              closeHelp();
              navigate('/settings#backup');
            }}
          >
            <span lang={lang}>{copy.syncButton}</span>
          </Button>
          <Button variant="primary" className="max-sm:w-full" icon={<Compass className="size-4" />} onClick={startTour}>
            <span lang={lang}>{copy.tourButton}</span>
          </Button>
        </>
      }
    >
      <div className="mb-4 flex justify-center">
        <Segmented<GuideLanguage>
          label="Guide language"
          value={lang}
          onChange={changeLanguage}
          options={GUIDE_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
        />
      </div>
      <div lang={lang} className={lang === 'si' ? 'leading-relaxed' : undefined}>
        <p className="text-sm text-muted">{copy.intro}</p>
        <ol className="mt-4 space-y-4">
          {copy.steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? CalendarDays;
            return (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400" aria-hidden>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    <span className="sr-only">{i + 1}. </span>
                    {step.title}
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-pretty text-zinc-700 dark:text-zinc-300">
                    {step.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-muted dark:bg-ink-850">{copy.tip}</p>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent-600 dark:text-accent-400" aria-hidden />
          {copy.privacy}
        </p>
      </div>
    </Modal>
  );
};

export default HelpModal;
