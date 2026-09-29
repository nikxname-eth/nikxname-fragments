/**
 * Pan/zoom magnifier for the high-res Blossom still (master ~15k px).
 * Click to zoom, drag to pan, scroll to zoom.
 * When zoomed: corner map shows viewport; click/drag map to jump.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  showHint?: boolean;
};

/** Visible region under CSS scale + transform-origin (percent space 0–100). */
function viewportRect(origin: { x: number; y: number }, scale: number) {
  const s = Math.max(scale, 1);
  const w = 100 / s;
  const h = 100 / s;
  return {
    left: origin.x * (1 - 1 / s),
    top: origin.y * (1 - 1 / s),
    width: w,
    height: h,
  };
}

function imageIsReady(img: HTMLImageElement | null): boolean {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

export function BlossomMagnifier({
  src,
  alt = 'Blossom Fragments — Still',
  className = '',
  showHint = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mapDragging, setMapDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const zoomed = scale > 1.05;
  const view = viewportRect(origin, scale);

  const markLoaded = useCallback(() => setLoaded(true), []);

  /** Cached images often fire load before React attaches onLoad — poll complete. */
  useEffect(() => {
    setLoaded(false);
    setScale(1);
    setOrigin({ x: 50, y: 50 });

    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      if (imageIsReady(imgRef.current)) {
        setLoaded(true);
        return true;
      }
      return false;
    };

    if (check()) return;

    // rAF + short interval covers cache race and progressive decode
    const raf = requestAnimationFrame(() => {
      check();
    });
    const poll = window.setInterval(() => {
      if (check()) window.clearInterval(poll);
    }, 80);
    const giveUp = window.setTimeout(() => {
      window.clearInterval(poll);
      // Show anyway if browser has partial paint
      if (!cancelled && imgRef.current) setLoaded(true);
    }, 12_000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      window.clearTimeout(giveUp);
    };
  }, [src]);

  const originFromMapEvent = useCallback((e: React.PointerEvent | PointerEvent) => {
    const map = mapRef.current;
    if (!map) return null;
    const rect = map.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (dragging && dragStart.current && scale > 1) {
        const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
        setOrigin({
          x: Math.min(100, Math.max(0, dragStart.current.ox - dx * (scale * 0.4))),
          y: Math.min(100, Math.max(0, dragStart.current.oy - dy * (scale * 0.4))),
        });
      } else if (!dragging && !mapDragging && scale <= 1.05) {
        setOrigin({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
      }
    },
    [dragging, mapDragging, scale],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) {
      setScale(2.5);
      const el = wrapRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setOrigin({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
      return;
    }
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: origin.x, oy: origin.y };
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(8, Math.max(1, s + (e.deltaY < 0 ? 0.35 : -0.35))));
  };

  const onMapPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = originFromMapEvent(e);
    if (!next) return;
    setOrigin(next);
    setMapDragging(true);
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onMapPointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!mapDragging) return;
    const next = originFromMapEvent(e);
    if (next) setOrigin(next);
  };

  const onMapPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setMapDragging(false);
  };

  return (
    <div className={`blossom-mag ${className}`.trim()}>
      <div
        ref={wrapRef}
        className={`blossom-mag-stage${dragging ? ' is-dragging' : ''}${zoomed ? ' is-zoomed' : ''}`}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        role="img"
        aria-label={alt}
      >
        {!loaded && <div className="blossom-mag-loading">Loading canvas…</div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="blossom-mag-img"
          draggable={false}
          decoding="async"
          loading="eager"
          fetchPriority="high"
          onLoad={markLoaded}
          onError={markLoaded}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            opacity: loaded ? 1 : 0,
          }}
        />

        {zoomed && loaded && (
          <div
            ref={mapRef}
            className={`blossom-mag-map${mapDragging ? ' is-dragging' : ''}`}
            onPointerDown={onMapPointerDown}
            onPointerMove={onMapPointerMove}
            onPointerUp={onMapPointerUp}
            onPointerCancel={onMapPointerUp}
            role="presentation"
            aria-hidden
            title="Canvas map — click or drag to move view"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="blossom-mag-map-img" draggable={false} />
            <div
              className="blossom-mag-map-view"
              style={{
                left: `${view.left}%`,
                top: `${view.top}%`,
                width: `${view.width}%`,
                height: `${view.height}%`,
              }}
            />
            <span className="blossom-mag-map-label">Map</span>
          </div>
        )}

        {!zoomed && loaded && (
          <div className="blossom-mag-lens" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      {showHint && (
        <div className="blossom-mag-hint">
          {zoomed ? (
            <>
              <button type="button" className="blossom-mag-reset" onClick={() => setScale(1)}>
                Reset
              </button>
              <span>{scale.toFixed(1)}× · drag to pan · map to jump · scroll to zoom</span>
            </>
          ) : (
            <span>Click to magnify · scroll to zoom · drag to pan</span>
          )}
        </div>
      )}
    </div>
  );
}
