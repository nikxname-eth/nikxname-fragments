import { useEffect, useRef, useState } from 'react';

const BEDS = [
  { id: 'room', name: 'Room', src: '/atelier/sound/room.m4a' },
  { id: 'piano', name: 'Piano', src: '/atelier/sound/piano.m4a' },
  { id: 'night', name: 'Night', src: '/atelier/sound/night.m4a' },
  { id: 'brush', name: 'Brush', src: '/atelier/sound/brush.m4a' },
  { id: 'air', name: 'Air', src: '/atelier/sound/air.m4a' },
] as const;

const LEVEL = 0.42;

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

/** Private Atelier only. Each click moves to the next bed, then silence. */
export function AtelierSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const bed = index > 0 ? BEDS[index - 1] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;

    const run = async () => {
      if (!bed) {
        await fade(audio, 0, 500);
        if (!cancelled) audio.pause();
        return;
      }
      const next = new URL(bed.src, window.location.href).href;
      if (!audio.src.endsWith(bed.src) && audio.src !== next) {
        await fade(audio, 0, 280);
        if (cancelled) return;
        audio.src = bed.src;
        audio.loop = true;
        audio.volume = 0;
        try {
          await audio.play();
        } catch {
          return;
        }
      } else if (audio.paused) {
        audio.volume = 0;
        try {
          await audio.play();
        } catch {
          return;
        }
      }
      if (!cancelled) await fade(audio, LEVEL, 700);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [bed]);

  useEffect(() => {
    const onHide = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (bed) void audio.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [bed]);

  return (
    <div className={`ex-sound${bed ? ' is-on' : ''}`}>
      <button
        type="button"
        className="ex-sound-btn"
        onClick={() => setIndex((n) => (n + 1) % (BEDS.length + 1))}
        aria-label={bed ? `${bed.name}. Next sound.` : 'Sound off. Play Room.'}
      >
        <Speaker on={!!bed} />
      </button>
      {bed ? <span className="ex-sound-name">{bed.name}</span> : null}
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
