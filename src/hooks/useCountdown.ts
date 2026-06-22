import { useMemo } from 'react';

/** Derive countdown units from site clock — no separate interval. */
export function useCountdown(targetUTC: string | null, now: number) {
  return useMemo(() => {
    if (!targetUTC) {
      return { d: 0, h: 0, m: 0, s: 0 };
    }

    const diff = new Date(targetUTC).getTime() - now;
    if (diff <= 0) {
      return { d: 0, h: 0, m: 0, s: 0 };
    }

    return {
      d: Math.floor(diff / 86_400_000),
      h: Math.floor((diff % 86_400_000) / 3_600_000),
      m: Math.floor((diff % 3_600_000) / 60_000),
      s: Math.floor((diff % 60_000) / 1_000),
    };
  }, [targetUTC, now]);
}