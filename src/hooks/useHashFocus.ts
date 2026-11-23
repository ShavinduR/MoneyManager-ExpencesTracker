import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const FOCUSABLE = 'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Deep links like `/settings#starting-balance` scroll to the element with that id and focus it
 * (or its first focusable child). Retries briefly because lazy routes render a moment later.
 */
export const useHashFocus = (): void => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer = 0;
    const attempt = (): void => {
      const el = document.getElementById(id);
      if (!el) {
        if (tries++ < 20) timer = window.setTimeout(attempt, 60);
        return;
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      // A section can mark its preferred field with data-autofocus (e.g. the first empty goal).
      const target = el.matches(FOCUSABLE) ? el : (el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el);
      if (target === el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    timer = window.setTimeout(attempt, 30);
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);
};
