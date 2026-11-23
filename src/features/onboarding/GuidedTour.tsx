import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { currentMonthKey } from '@/lib/dates';
import { useUiStore } from '@/store/uiStore';

type TourStep = {
  /** `data-tour` value of the element to spotlight. */
  anchor: string;
  /** Route that contains the anchor; null = available on every page (header / navigation). */
  route: string | null;
  title: string;
  body: string;
};

const STEPS: readonly TourStep[] = [
  {
    anchor: 'quick-entry',
    route: null,
    title: 'Quick-Entry',
    body: 'Type naturally in English, Singlish or Sinhala, like “ada lunch 850” or “Petrol 1500”, and press Enter. On a keyboard, press / or Ctrl+K to jump here.',
  },
  {
    anchor: 'paid-circles',
    route: '/monthly',
    title: 'Monthly plan and paid circles',
    body: 'Plan income and fixed bills at the start of the month, then tap the circle next to each one as you pay it.',
  },
  {
    anchor: 'carry-over',
    route: '/monthly',
    title: 'Automatic carry-over',
    body: 'Each month’s closing balance rolls into the next one by itself, and the yearly charts build from your entries.',
  },
  {
    anchor: 'privacy',
    route: null,
    title: 'Private and device-first',
    body: 'Everything stays on this device. Use Settings to export a JSON backup or sync to another device whenever you like.',
  },
];

const PAD = 6;
const CARD_WIDTH = 340;

/** First visible element for an anchor (desktop sidebar vs. mobile bottom nav share one anchor). */
const findAnchor = (anchor: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`)].find((el) => el.getClientRects().length > 0 && el.offsetWidth > 0) ??
  null;

type Box = { top: number; left: number; width: number; height: number };

/**
 * Opt-in 4-step tour (never auto-started). A native modal <dialog> keeps focus inside the tour card
 * and makes the page inert; the spotlight is a hole cut with a box-shadow. No scroll locking:
 * the spotlight follows scroll and resize.
 */
const GuidedTour = () => {
  const endTour = useUiStore((s) => s.endTour);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const step = STEPS[index] ?? STEPS[0];
  const isLast = index === STEPS.length - 1;
  const returnFocus = useRef<Element | null>(null);

  // Open as a modal dialog once; restore focus to whatever started the tour.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    returnFocus.current = document.activeElement;
    if (!dialog.open) dialog.showModal();
    // showModal() focuses the first control (Exit); start on Next instead.
    nextRef.current?.focus();
    const onCancel = (event: Event): void => {
      event.preventDefault();
      endTour();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      const target = returnFocus.current;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    };
  }, [endTour]);

  // Go to the step's page if needed.
  useEffect(() => {
    if (!step?.route) return;
    if (!pathname.startsWith(step.route)) navigate(step.route === '/monthly' ? `/monthly/${currentMonthKey()}` : step.route);
  }, [step, pathname, navigate]);

  const measure = useCallback((): void => {
    if (!step) return;
    const el = findAnchor(step.anchor);
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  // Wait for the anchor (route changes render a moment later), bring it into view, then measure.
  useLayoutEffect(() => {
    if (!step) return;
    let tries = 0;
    let timer = 0;
    const locate = (): void => {
      const el = findAnchor(step.anchor);
      if (!el && tries++ < 30) {
        timer = window.setTimeout(locate, 50);
        return;
      }
      if (el) {
        const r = el.getBoundingClientRect();
        const offscreen = r.top < 72 || r.bottom > window.innerHeight - 96;
        if (offscreen) el.scrollIntoView({ block: 'center' });
      }
      measure();
      nextRef.current?.focus();
    };
    locate();
    return () => window.clearTimeout(timer);
  }, [step, pathname, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  if (!step) return null;

  const mobile = viewport.width < 640;
  const cardStyle = ((): React.CSSProperties => {
    if (mobile || !box) return {};
    const below = box.top + box.height + 12;
    const fitsBelow = below + 220 < viewport.height;
    const left = Math.min(Math.max(12, box.left), viewport.width - CARD_WIDTH - 12);
    return fitsBelow ? { top: below, left, width: CARD_WIDTH } : { top: Math.max(12, box.top - 12 - 220), left, width: CARD_WIDTH };
  })();

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Guided tour, step ${index + 1} of ${STEPS.length}: ${step.title}`}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-inherit backdrop:bg-transparent"
    >
      {/* Spotlight: a hole in a dimmed overlay around the current element. */}
      {box ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-2xl ring-2 ring-accent-400 transition-[top,left,width,height] duration-200"
          style={{ ...box, boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.55)' }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 bg-zinc-950/55" />
      )}

      <div
        className={
          mobile || !box
            ? 'fixed inset-x-3 bottom-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl animate-pop-in safe-bottom dark:border-ink-700 dark:bg-ink-900'
            : 'fixed rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl animate-pop-in dark:border-ink-700 dark:bg-ink-900'
        }
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-400">
            Step {index + 1} of {STEPS.length}
          </p>
          <IconButton label="Exit tour" onClick={endTour} className="-mr-2 -mt-2 size-8" data-close>
            <X className="size-4" />
          </IconButton>
        </div>
        <h2 className="mt-1 text-base font-semibold tracking-tight">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-pretty text-zinc-700 dark:text-zinc-300">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.anchor + s.title} className={i === index ? 'h-1.5 w-4 rounded-full bg-accent-500' : 'size-1.5 rounded-full bg-zinc-300 dark:bg-ink-700'} />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <Button size="sm" variant="ghost" icon={<ArrowLeft className="size-3.5" />} onClick={() => setIndex((i) => i - 1)}>
                Back
              </Button>
            )}
            <Button
              ref={nextRef}
              size="sm"
              variant="primary"
              icon={isLast ? <Check className="size-3.5" /> : undefined}
              onClick={() => (isLast ? endTour() : setIndex((i) => i + 1))}
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

export default GuidedTour;
