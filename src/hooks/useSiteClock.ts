import { useEffect, useState } from 'react';

/** Ticks every second — null until mounted to avoid SSR/client hydration drift. */
export function useSiteClock(intervalMs = 1_000) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}