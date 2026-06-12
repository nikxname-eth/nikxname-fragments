import { useEffect, useState } from 'react';

/** Ticks every second so countdown, banner, and mint sections evolve without a refresh. */
export function useSiteClock(intervalMs = 1_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}