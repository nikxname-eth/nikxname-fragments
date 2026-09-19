/**
 * A Familiar Burn — full Blossom canvas (same masters as the finale claim viewer).
 * Still / Animated toggle; click the canvas to open Theatre (larger view).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BLOSSOM_ANIMATE_SOURCES, BLOSSOM_CANVAS } from '../config/catalog';

type Mode = 'still' | 'animated';

type Props = {
  onOpen: (mode: Mode) => void;
};

export function AfbCanvas({ onOpen }: Props) {
  const [mode, setMode] = useState<Mode>('still');

  useEffect(() => {
    const img = new Image();
    img.decoding = 'async';
    img.src = BLOSSOM_CANVAS.still;
  }, []);

  return (
    <section className="ex-afb-canvas" aria-label="Blossom Fragments full canvas">
      <div className="ex-afb-canvas-head">
        <p className="ex-afb-kicker">Main artwork · Full canvas</p>
        <h3 className="ex-afb-title">Blossom Fragments</h3>
        <div className="ex-afb-toggles" role="tablist" aria-label="Canvas version">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'still'}
            className={`ex-afb-toggle${mode === 'still' ? ' is-active' : ''}`}
            onClick={() => setMode('still')}
          >
            Still
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'animated'}
            className={`ex-afb-toggle${mode === 'animated' ? ' is-active' : ''}`}
            onClick={() => setMode('animated')}
          >
            Animated
          </button>
        </div>
      </div>

      <div className="ex-afb-stage">
        <button
          type="button"
          className="ex-afb-frame"
          data-mode={mode}
          onClick={() => onOpen(mode)}
          aria-label={`Open Blossom Fragments ${mode} in Theatre`}
        >
          {mode === 'still' ? (
            <img
              className="ex-afb-media"
              src={BLOSSOM_CANVAS.still}
              alt=""
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <AfbAnimateVideo />
          )}
        </button>
      </div>
      <p className="ex-afb-hint">Click canvas to view larger</p>
    </section>
  );
}

function AfbAnimateVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const fallbackTried = useRef(false);
  const src = BLOSSOM_ANIMATE_SOURCES[sourceIndex] ?? BLOSSOM_CANVAS.animate4k;

  const dropToBackup = useCallback(() => {
    if (fallbackTried.current) return false;
    if (sourceIndex >= BLOSSOM_ANIMATE_SOURCES.length - 1) return false;
    fallbackTried.current = true;
    setSourceIndex((i) => Math.min(i + 1, BLOSSOM_ANIMATE_SOURCES.length - 1));
    return true;
  }, [sourceIndex]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    v.load();
    const start = () => {
      if (cancelled) return;
      void v.play().catch(() => {
        if (!cancelled) dropToBackup();
      });
    };
    if (v.readyState >= 2) start();
    else v.addEventListener('loadeddata', start, { once: true });
    const stall = window.setTimeout(() => {
      if (cancelled) return;
      if (v.readyState < 2) dropToBackup();
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearTimeout(stall);
      v.removeEventListener('loadeddata', start);
    };
  }, [src, dropToBackup]);

  return (
    <video
      ref={videoRef}
      key={src}
      className="ex-afb-media"
      src={src}
      poster={BLOSSOM_CANVAS.cover}
      playsInline
      preload="auto"
      muted
      loop
      autoPlay
      onError={() => dropToBackup()}
    />
  );
}
