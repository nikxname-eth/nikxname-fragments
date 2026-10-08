import { useEffect, useRef, useState } from 'react';

/** Add a rendered tune under public/atelier/sound, then a line here. */
const TUNES = [
  { id: 'prelude', name: 'Prelude', src: '/atelier/sound/prelude.m4a' },
  { id: 'waltz', name: 'Waltz', src: '/atelier/sound/waltz.m4a' },
  { id: 'nocturne', name: 'Nocturne', src: '/atelier/sound/nocturne.m4a' },
  { id: 'ballad', name: 'Ballad', src: '/atelier/sound/ballad.m4a' },
  { id: 'air', name: 'Air', src: '/atelier/sound/air.m4a' },
] as const;

type Tune = (typeof TUNES)[number];

const LEVEL = 0.55;

function shuffle(list: readonly Tune[], avoid?: string): Tune[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  if (avoid && next.length > 1 && next[0].id === avoid) {
    const j = 1 + Math.floor(Math.random() * (next.length - 1));
    [next[0], next[j]] = [next[j], next[0]];
  }
  return next;
}

function fade(audio: HTMLAudioElement, to: number, ms: number) {
  const from = audio.volume;
  const start = performance.now();
  return new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      audio.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Private Atelier only. A click starts a shuffle; another click skips; the last skip is silence. */
export function AtelierSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const orderRef = useRef<Tune[]>([]);
  const indexRef = useRef(0);
  const tuneRef = useRef<Tune | null>(null);
  const settling = useRef(false);
  const advanceRef = useRef<(ended: boolean) => void>(() => {});
  const [tune, setTune] = useState<Tune | null>(null);
  const [token, setToken] = useState(0);

  const commit = (next: Tune | null) => {
    tuneRef.current = next;
    setTune(next);
    setToken((n) => n + 1);
  };

  const playFrom = (order: Tune[], index: number) => {
    orderRef.current = order;
    indexRef.current = index;
    commit(order[index] ?? null);
  };

  const stop = () => {
    orderRef.current = [];
    indexRef.current = 0;
    commit(null);
  };

  advanceRef.current = (ended: boolean) => {
    const order = orderRef.current;
    if (!order.length) {
      playFrom(shuffle(TUNES), 0);
      return;
    }
    const i = indexRef.current + 1;
    if (i < order.length) {
      playFrom(order, i);
      return;
    }
    if (ended) playFrom(shuffle(TUNES, tuneRef.current?.id), 0);
    else stop();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (settling.current) return;
      advanceRef.current(true);
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    settling.current = true;

    const run = async () => {
      if (!tune) {
        await fade(audio, 0, 500);
        if (!cancelled) audio.pause();
        return;
      }
      await fade(audio, 0, 280);
      if (cancelled) return;
      audio.src = tune.src;
      audio.loop = false;
      audio.volume = 0;
      try {
        await audio.play();
      } catch {
        return;
      }
      if (!cancelled) await fade(audio, LEVEL, 700);
    };

    void run().finally(() => {
      if (!cancelled) settling.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [tune, token]);

  useEffect(() => {
    const onHide = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (tuneRef.current) void audio.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  return (
    <div className={`ex-sound${tune ? ' is-on' : ''}`}>
      <button
        type="button"
        className="ex-sound-btn"
        onClick={() => advanceRef.current(false)}
        aria-label={tune ? `${tune.name}. Next tune.` : 'Sound off. Play a tune.'}
      >
        <Speaker on={!!tune} />
      </button>
      {tune ? <span className="ex-sound-name">{tune.name}</span> : null}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" />
    </div>
  );
}

function Speaker({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 9.2h2.6L11 5.6v12.8l-3.9-3.6H4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {on ? (
        <path
          d="M14.2 9.1a3.2 3.2 0 0 1 0 5.8M16.6 7.2a6 6 0 0 1 0 9.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M15.2 9.4l4.2 5.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
