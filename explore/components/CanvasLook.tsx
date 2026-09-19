import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type View = { x: number; y: number; scale: number };
type Pt = { x: number; y: number };

type Props = {
  src: string;
  alt: string;
  title?: string;
  onClose: () => void;
  nav?: ReactNode;
};

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function CanvasLook({ src, alt, title, onClose, nav }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef<View>({ x: 0, y: 0, scale: 1 });
  const ptsRef = useRef(new Map<number, Pt>());
  const pinchRef = useRef<{ dist: number; view: View } | null>(null);
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [view, setView] = useState<View>(viewRef.current);
  const [loaded, setLoaded] = useState(false);
  const [fitScale, setFitScale] = useState(0.2);
  const [nat, setNat] = useState({ w: 5000, h: 5000 });

  const commit = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const size = useCallback(() => {
    const img = imgRef.current;
    return {
      nw: img?.naturalWidth || nat.w,
      nh: img?.naturalHeight || nat.h,
    };
  }, [nat.w, nat.h]);

  const fitView = useCallback((): View => {
    const stage = stageRef.current;
    const { nw, nh } = size();
    if (!stage || !nw) return viewRef.current;
    const pad = 16;
    const s = Math.min((stage.clientWidth - pad) / nw, (stage.clientHeight - pad) / nh);
    return {
      x: (stage.clientWidth - nw * s) / 2,
      y: (stage.clientHeight - nh * s) / 2,
      scale: s,
    };
  }, [size]);

  const actualView = useCallback((): View => {
    const stage = stageRef.current;
    const { nw, nh } = size();
    if (!stage || !nw) return viewRef.current;
    return {
      x: (stage.clientWidth - nw) / 2,
      y: (stage.clientHeight - nh) / 2,
      scale: 1,
    };
  }, [size]);

  const clampScale = useCallback(
    (s: number) => Math.min(2, Math.max(fitScale * 0.98, s)),
    [fitScale],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const cur = viewRef.current;
      const s = clampScale(nextScale);
      const k = s / cur.scale;
      commit({
        x: px - (px - cur.x) * k,
        y: py - (py - cur.y) * k,
        scale: s,
      });
    },
    [clampScale, commit],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    setLoaded(false);
    viewRef.current = { x: 0, y: 0, scale: 1 };
    setView(viewRef.current);
  }, [src]);

  useEffect(() => {
    if (!loaded) return;
    const next = fitView();
    setFitScale(next.scale);
    commit(next);
  }, [loaded, fitView, commit]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      const fitted = fitView();
      setFitScale(fitted.scale);
      if (Math.abs(viewRef.current.scale - fitted.scale) < 0.03) commit(fitted);
    });
    ro.observe(stage);
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(e.clientX, e.clientY, viewRef.current.scale * factor);
    };
    stage.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      ro.disconnect();
      stage.removeEventListener('wheel', onWheelNative);
    };
  }, [fitView, commit, zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptsRef.current.size === 2) {
      const [a, b] = [...ptsRef.current.values()];
      pinchRef.current = {
        dist: dist(a, b),
        view: { ...viewRef.current },
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      vx: viewRef.current.x,
      vy: viewRef.current.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!ptsRef.current.has(e.pointerId)) return;
    ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptsRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = [...ptsRef.current.values()];
      const d = dist(a, b);
      const m = mid(a, b);
      const ratio = d / Math.max(pinchRef.current.dist, 1);
      const start = pinchRef.current.view;
      const s = clampScale(start.scale * ratio);
      const k = s / start.scale;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const px = m.x - rect.left;
      const py = m.y - rect.top;
      commit({
        x: px - (px - start.x) * k,
        y: py - (py - start.y) * k,
        scale: s,
      });
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    commit({
      ...viewRef.current,
      x: drag.vx + (e.clientX - drag.x),
      y: drag.vy + (e.clientY - drag.y),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    ptsRef.current.delete(e.pointerId);
    if (ptsRef.current.size < 2) pinchRef.current = null;
    if (ptsRef.current.size === 0) dragRef.current = null;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const nearFit = Math.abs(viewRef.current.scale - fitScale) < 0.04;
    if (nearFit) zoomAt(e.clientX, e.clientY, 1);
    else commit(fitView());
  };

  const atActual = Math.abs(view.scale - 1) < 0.03;
  const pct = Math.round(view.scale * 100);

  return (
    <div className="ex-look" role="dialog" aria-modal="true" aria-label={alt}>
      <div className="ex-look-bar">
        <p className="ex-look-title">{title || alt}</p>
        <div className="ex-look-tools">
          <button type="button" onClick={() => commit(fitView())}>
            Fit
          </button>
          <button
            type="button"
            className={atActual ? 'is-on' : ''}
            onClick={() => commit(actualView())}
          >
            100%
          </button>
          <button type="button" className="ex-look-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="ex-look-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {!loaded ? <div className="ex-look-loading">Loading canvas…</div> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          decoding="async"
          onLoad={() => {
            const img = imgRef.current;
            if (img?.naturalWidth) setNat({ w: img.naturalWidth, h: img.naturalHeight });
            setLoaded(true);
          }}
          style={{
            width: nat.w,
            height: nat.h,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            opacity: loaded ? 1 : 0,
          }}
        />
      </div>
      {nav ? <div className="ex-look-nav">{nav}</div> : null}
      <p className="ex-look-hint">
        {pct}% · drag to move · pinch or scroll to zoom · 100% is true size
      </p>
    </div>
  );
}
