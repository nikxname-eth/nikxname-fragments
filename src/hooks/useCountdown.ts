import { useEffect, useState } from 'react';

export function useCountdown(targetUTC: string | null) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, done: false });

  useEffect(() => {
    if (!targetUTC) {
      setTime((prev) => ({ ...prev, done: true }));
      return;
    }

    const end = new Date(targetUTC).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setTime({ d: 0, h: 0, m: 0, s: 0, done: true });
        return;
      }
      setTime({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
        done: false,
      });
    };

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetUTC]);

  return time;
}