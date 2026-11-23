import { useEffect, useState } from 'react';

/** Seconds left until `deadline` (ms epoch), ticking once a second. */
export const useCountdown = (deadline: number | null): number => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
};

export const formatCountdown = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
