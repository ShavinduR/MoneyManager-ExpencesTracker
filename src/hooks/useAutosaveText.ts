import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'dirty' | 'saved';

/**
 * Local text state that commits after `delay` ms of inactivity and on blur,
 * so long journal entries don't write to IndexedDB on every keystroke.
 */
export const useAutosaveText = (value: string, commit: (next: string) => void, delay = 800) => {
  const [text, setText] = useState(value);
  const [state, setState] = useState<SaveState>('idle');
  const timer = useRef<number | null>(null);
  const latest = useRef({ text, value, commit });
  latest.current = { text, value, commit };

  useEffect(() => {
    // Sync when the stored value changes from elsewhere (import, demo data), not from our own commit.
    if (value !== latest.current.text) {
      setText(value);
      setState('idle');
    }
  }, [value]);

  const flush = useCallback((): void => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const { text: current, value: stored, commit: save } = latest.current;
    if (current !== stored) {
      save(current);
      setState('saved');
    }
  }, []);

  const onChange = (next: string): void => {
    setText(next);
    setState('dirty');
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, delay);
  };

  useEffect(() => () => flush(), [flush]);

  return { text, onChange, flush, state };
};
