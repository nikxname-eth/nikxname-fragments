import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ExploreWork, SeriesId } from '../config/catalog';
import { SERIES, getSeriesById, LIVE_SITE } from '../config/catalog';
import { getChainCollection } from '../lib/chainWorks';
import { fetchTokenOwner, type OwnerResult } from '../lib/owner';
import { captureHang } from '../lib/captureHang';
import { canonicalSlug } from '../lib/workSlug';
import {
  catalogueThumbUrl,
  defaultTierId,
  lowerTierId,
  mediaTiersFor,
  observeStillUrl,
  preferStill,
  preloadMedia,
  stillMasterUrl,
  theatreStillUrl,
  type MediaTierId,
} from '../lib/mediaUrl';
import { CanvasLook } from './CanvasLook';

type Props = {
  work: ExploreWork | null;
  works: ExploreWork[];
  onClose: () => void;
  onNavigate: (work: ExploreWork) => void;
  /** Jump to adjacent collection (side labels on carousel) */
  onSeriesShift?: (seriesId: SeriesId) => void;
  /** Random work from archive - lives inside Theatre only */
  onRandom?: () => void;
};

const THEATRE_SERIES = SERIES.filter((s) => s.id !== 'market').map((s) => s.id);

function theaterNeighborStill(w: ExploreWork): string {
  const master = stillMasterUrl(w);
  if (master) return theatreStillUrl(master) || master;
  return preferStill(w);
}

const MAX_ZOOM = 5;

/**
 * Collection Theatre - framed art stage, single-row collection carousel,
 * bottom-right details with owner refresh.
 */
export function WorkStage({
  work,
  works,
  onClose,
  onNavigate,
  onSeriesShift,
  onRandom,
}: Props) {
  const series = work ? getSeriesById(work.seriesId) : undefined;
  const seriesLabel = series?.label ?? work?.collectionLabel ?? 'Collection';
  const chainCol = work ? getChainCollection(work.seriesId) : null;

  /** Carousel shows only the current collection */
  const collectionWorks = useMemo(() => {
    if (!work) return [];
    const same = works.filter((w) => w.seriesId === work.seriesId);
    return same.length ? same : [work];
  }, [works, work]);

  const index = work ? collectionWorks.findIndex((w) => w.id === work.id) : -1;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < collectionWorks.length - 1;
  const nextWork = canNext ? collectionWorks[index + 1] : null;
  const prevWork = canPrev ? collectionWorks[index - 1] : null;

  const seriesIdx = work ? THEATRE_SERIES.indexOf(work.seriesId) : -1;
  const prevSeriesId = seriesIdx > 0 ? THEATRE_SERIES[seriesIdx - 1] : null;
  const nextSeriesId =
    seriesIdx >= 0 && seriesIdx < THEATRE_SERIES.length - 1
      ? THEATRE_SERIES[seriesIdx + 1]
      : null;
  const prevSeriesLabel = prevSeriesId
    ? getSeriesById(prevSeriesId)?.label
    : undefined;
  const nextSeriesLabel = nextSeriesId
    ? getSeriesById(nextSeriesId)?.label
    : undefined;

  const [panelOpen, setPanelOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [artAr, setArtAr] = useState(1.5);
  const [mediaError, setMediaError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [owner, setOwner] = useState<OwnerResult | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState(false);
  const [tierId, setTierId] = useState<MediaTierId>('1080');
  const [isPhone, setIsPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qShow, setQShow] = useState(true);
  const qTimer = useRef(0);
  const [magnifyOn, setMagnifyOn] = useState(false);
  const [observeOpen, setObserveOpen] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | null>(null);
  const mediaNodeRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  const tiers = useMemo(() => (work ? mediaTiersFor(work) : []), [work]);
  const activeTier =
    tiers.find((t) => t.id === tierId) ||
    tiers.find((t) => t.id === defaultTierId(tiers)) ||
    tiers[0];
  const isVideo = Boolean(activeTier?.kind === 'video' && !useFallback);
  const preferredSrc = activeTier?.url || '';
  const fullSrcRaw =
    useFallback && work
      ? work.originCoverUrl || work.coverUrl || preferredSrc
      : preferredSrc;
  const fullSrc = fullSrcRaw;
  const posterSrc = work
    ? catalogueThumbUrl(preferStill(work), 720) || preferStill(work)
    : '';

  const statement = useMemo(() => {
    if (!work) return '';
    return (
      work.blurb?.trim() ||
      series?.description ||
      'A work from the Nikxname archive - painted, held, and opened here in the Collection Theatre.'
    );
  }, [work, series]);

  const statementShort =
    statement.length > 160 ? `${statement.slice(0, 158).trimEnd()}…` : statement;
  const needsReadMore = statement.length > 160;

  const loadOwner = useCallback(
    async (signal?: AbortSignal) => {
      if (!work?.contractAddress || work.tokenId == null) {
        setOwner(null);
        setOwnerError(false);
        return;
      }
      setOwnerLoading(true);
      setOwnerError(false);
      try {
        const result = await fetchTokenOwner({
          contract: work.contractAddress,
          tokenId: work.tokenId,
          chainId: chainCol?.chainId,
          standard: chainCol?.standard,
          signal,
        });
        if (signal?.aborted) return;
        setOwner(result);
        if (!result) setOwnerError(true);
      } catch {
        if (!signal?.aborted) {
          setOwner(null);
          setOwnerError(true);
        }
      } finally {
        if (!signal?.aborted) setOwnerLoading(false);
      }
    },
    [work?.contractAddress, work?.tokenId, chainCol?.chainId, chainCol?.standard],
  );

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setMediaReady(false);
    setMediaError(false);
    setArtAr(1.5);
    setUseFallback(false);
    setDescOpen(false);
    setChainOpen(false);
    setPanelOpen(false);
    setOwner(null);
    setOwnerError(false);
    setTierId(work ? defaultTierId(mediaTiersFor(work)) : 'fit');
    setMagnifyOn(false);
    setObserveOpen(false);
  }, [work]);

  useEffect(() => {
    if (!work) return;
    resetView();
  }, [work?.id, resetView]);

  useEffect(() => {
    const phone = window.matchMedia('(max-width: 900px), (pointer: coarse)');
    const apply = () => setIsPhone(phone.matches);
    apply();
    phone.addEventListener('change', apply);
    return () => phone.removeEventListener('change', apply);
  }, []);

  const flashQuality = useCallback(() => {
    setQShow(true);
    window.clearTimeout(qTimer.current);
    qTimer.current = window.setTimeout(() => setQShow(false), 3000);
  }, []);

  useEffect(() => {
    flashQuality();
    return () => window.clearTimeout(qTimer.current);
  }, [work?.id, flashQuality]);

  /** Warm next/prev stills so collection navigation feels instant */
  useEffect(() => {
    if (!work) return;
    for (const neighbor of [prevWork, nextWork]) {
      if (!neighbor) continue;
      if (neighbor.mediaType === 'video') {
        preloadMedia(preferStill(neighbor), 'image');
      } else {
        const still = theaterNeighborStill(neighbor);
        if (still) preloadMedia(still, 'image');
      }
    }
  }, [work?.id, prevWork, nextWork]);

  useEffect(() => {
    if (!work || !chainOpen) return;
    const ctrl = new AbortController();
    loadOwner(ctrl.signal);
    return () => ctrl.abort();
  }, [work?.id, chainOpen, loadOwner]);

  /** Keep active thumb visible in single-row strip */
  useEffect(() => {
    if (!stripRef.current || index < 0) return;
    const el = stripRef.current.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index, work?.id]);

  useEffect(() => {
    if (!work) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (observeOpen) {
          event.preventDefault();
          setObserveOpen(false);
        } else if (magnifyOn || scale > 1) {
          event.preventDefault();
          setMagnifyOn(false);
          setScale(1);
          setOffset({ x: 0, y: 0 });
        } else if (chainOpen) setChainOpen(false);
        else if (descOpen) setDescOpen(false);
        else if (panelOpen) setPanelOpen(false);
        else onClose();
      }
      if (event.key === 'ArrowLeft' && canPrev) {
        event.preventDefault();
        onNavigate(collectionWorks[index - 1]);
      }
      if (event.key === 'ArrowRight' && canNext) {
        event.preventDefault();
        onNavigate(collectionWorks[index + 1]);
      }
      if (event.key === 'i' || event.key === 'I') setPanelOpen((v) => !v);
      if ((event.key === 'r' || event.key === 'R') && onRandom) onRandom();
      if (event.key === '0') {
        setMagnifyOn(false);
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
      if (event.key === '+' || event.key === '=') {
        setMagnifyOn(true);
        setScale((s) => Math.min(MAX_ZOOM, s + 0.25));
      }
      if (event.key === '-' || event.key === '_') {
        setScale((s) => {
          const next = Math.max(1, s - 0.25);
          if (next <= 1) setMagnifyOn(false);
          return next;
        });
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [
    work,
    collectionWorks,
    index,
    canPrev,
    canNext,
    onClose,
    onNavigate,
    onRandom,
    panelOpen,
    descOpen,
    chainOpen,
    magnifyOn,
    scale,
    observeOpen,
  ]);

  const loadHiStill = useCallback(() => {
    const hi =
      tiers.find((t) => t.kind === 'image' && t.id === 'original') ||
      tiers.find((t) => t.kind === 'image' && t.id === '4k');
    if (!hi) return;
    setTierId((cur) => (cur === hi.id ? cur : hi.id));
  }, [tiers]);

  const applyZoom = useCallback(
    (next: number) => {
      const s = Math.min(MAX_ZOOM, Math.max(1, next));
      setScale(s);
      if (s > 1) {
        setMagnifyOn(true);
        loadHiStill();
      } else {
        setMagnifyOn(false);
        setOffset({ x: 0, y: 0 });
      }
    },
    [loadHiStill],
  );

  const exitMagnify = useCallback(() => {
    setMagnifyOn(false);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const onWheel = (e: React.WheelEvent) => {
    if (isVideo) return;
    e.preventDefault();
    applyZoom(scale + (e.deltaY > 0 ? -0.14 : 0.14));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2 && !isVideo) {
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        scale,
      };
      dragRef.current = null;
      swipeRef.current = null;
      return;
    }
    if (!isVideo && scale > 1) {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      return;
    }
    if (!isPhone) return;
    if (!(e.target instanceof HTMLVideoElement)) {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    swipeRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pinchRef.current && pointersRef.current.size >= 2 && !isVideo) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchRef.current.dist > 8) {
        applyZoom(pinchRef.current.scale * (dist / pinchRef.current.dist));
      }
      return;
    }
    if (!dragRef.current || scale <= 1) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    const dragging = dragRef.current;
    dragRef.current = null;
    const swipe = swipeRef.current;
    swipeRef.current = null;
    const onChrome = Boolean((e.target as HTMLElement).closest('button, a, input'));
    if (
      !dragging &&
      !swipe &&
      (magnifyOn || scale > 1) &&
      !onChrome &&
      (e.target as HTMLElement).classList.contains('ex-theatre-canvas')
    ) {
      exitMagnify();
      return;
    }
    if (dragging || magnifyOn || scale > 1 || !swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0 && nextWork) onNavigate(nextWork);
    else if (dx > 0 && prevWork) onNavigate(prevWork);
  };

  const saveWork = useCallback(async () => {
    if (!work || saving) return;
    setSaving(true);
    try {
      const el = mediaNodeRef.current;
      let ar = 4 / 5;
      if (el instanceof HTMLVideoElement && el.videoWidth && el.videoHeight) {
        ar = el.videoWidth / el.videoHeight;
      } else if (el instanceof HTMLImageElement && el.naturalWidth && el.naturalHeight) {
        ar = el.naturalWidth / el.naturalHeight;
      }
      const stage = document.querySelector('.ex-theatre');
      const wallColor = stage ? getComputedStyle(stage).backgroundColor : '#0c0b0f';
      await captureHang({
        wallColor,
        pale: false,
        hang: 0.82,
        step: 0,
        pieces: [{ work, ar, media: el }],
        filename: `nikxart-${canonicalSlug(work)}.jpg`,
      });
    } catch {
      /* keep viewing */
    } finally {
      setSaving(false);
    }
  }, [work, saving]);

  const chainLabel =
    chainCol?.chainId === 8453
      ? 'Base'
      : chainCol?.chainId === 1
        ? 'Ethereum'
        : chainCol?.chain || (work?.kind === 'fragment' ? 'Ethereum' : ' - ');
  const standard =
    chainCol?.standard === 'erc1155'
      ? 'ERC-1155'
      : chainCol?.standard === 'erc721'
        ? 'ERC-721'
        : work?.kind === 'fragment'
          ? 'ERC-721'
          : ' - ';

  const contractHref = work?.contractAddress
    ? chainCol?.chainId === 8453
      ? `https://basescan.org/address/${work.contractAddress}`
      : `https://etherscan.io/address/${work.contractAddress}`
    : undefined;

  return (
    <AnimatePresence>
      {work && (
        <motion.div
          className={`ex-theatre${panelOpen ? ' is-panel' : ''}${magnifyOn || scale > 1 ? ' is-zoom' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          role="dialog"
          aria-modal="true"
          aria-label={work.title}
        >
          <header className="ex-theatre-top">
            <button type="button" className="ex-theatre-text-glow ex-theatre-back" onClick={onClose}>
              ← Catalogue
            </button>
            <div className="ex-theatre-top-center">
              <h1 className="ex-theatre-work-title">{work.title}</h1>
              <span className="ex-theatre-kicker">
                {seriesLabel}
                {collectionWorks.length > 1 && index >= 0
                  ? ` · ${index + 1} of ${collectionWorks.length}`
                  : ''}
              </span>
            </div>
            <div className="ex-theatre-top-right">
              <button
                type="button"
                className={`ex-theatre-save ex-theatre-observe${observeOpen ? ' is-on' : ''}`}
                onClick={() => setObserveOpen(true)}
                title="Observe — close look, zoom, true size"
                aria-label="Observe"
              >
                <svg className="ex-theatre-save-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden>
                  <circle
                    cx="10"
                    cy="10"
                    r="6.15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.35"
                  />
                  <path
                    d="M7.35 6.55c1.15-1.05 2.7-1.35 4.05-.85"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.15"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <path
                    d="M6.7 8.2c.4-.55.95-.95 1.5-1.15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.05"
                    strokeLinecap="round"
                    opacity="0.65"
                  />
                  <rect
                    x="14.35"
                    y="15.55"
                    width="7.1"
                    height="2.35"
                    rx="1.15"
                    fill="currentColor"
                    transform="rotate(45 17.9 16.72)"
                  />
                </svg>
                <span className="ex-theatre-save-label">Observe</span>
              </button>
              <button
                type="button"
                className="ex-theatre-save"
                disabled={saving}
                onClick={() => void saveWork()}
                title="Save a high-res image of this work"
                aria-label={saving ? 'Saving' : 'Save'}
              >
                <span className="ex-theatre-save-label">{saving ? 'Saving…' : 'Save'}</span>
                <svg className="ex-theatre-save-icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden>
                  <path
                    d="M8 2v8M5 7.5 8 10.5 11 7.5M3 13h10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {nextWork ? (
                <button
                  type="button"
                  className="ex-theatre-next"
                  onClick={() => onNavigate(nextWork)}
                >
                  <span className="ex-theatre-next-label">Next work</span>
                  <span className="ex-theatre-next-title">{nextWork.title}</span>
                  <span className="ex-theatre-next-arrow" aria-hidden>
                    →
                  </span>
                </button>
              ) : (
                <span className="ex-theatre-next is-end">End of collection</span>
              )}
              <button
                type="button"
                className="ex-theatre-close"
                onClick={onClose}
                aria-label="Close theatre"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="ex-theatre-stage">
            <div className="ex-theatre-wall">
            <div className="ex-theatre-hang">
            <div
              className="ex-theatre-canvas ex-arrange-frame"
              style={{ ['--ar' as string]: String(artAr) }}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={(e) => {
                flashQuality();
                onPointerMove(e);
              }}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
            <div className="ex-arrange-mat">
              {!mediaReady && !mediaError && (
                <div className="ex-theatre-loading" aria-live="polite">
                  <span className="ex-theatre-loading-dot" />
                  Opening artwork…
                </div>
              )}
              {mediaError && (
                <div className="ex-theatre-loading">
                  Could not load media.
                  {fullSrc && (
                    <a
                      href={fullSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ex-theatre-link"
                    >
                      Open source file ↗
                    </a>
                  )}
                </div>
              )}

              {isVideo ? (
                <video
                  key={fullSrc}
                  ref={(n) => {
                    mediaNodeRef.current = n;
                  }}
                  className={`ex-theatre-media${mediaReady ? ' is-ready' : ''}`}
                  src={fullSrc}
                  poster={posterSrc || undefined}
                  controls
                  playsInline
                  autoPlay
                  loop
                  preload="metadata"
                  onLoadedData={(e) => {
                    setMediaReady(true);
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight) setArtAr(v.videoWidth / v.videoHeight);
                  }}
                  onError={() => {
                    const lower = lowerTierId(tiers, tierId);
                    if (lower) {
                      setTierId(lower);
                      setMediaReady(false);
                      return;
                    }
                    if (!useFallback && (work.originCoverUrl || work.coverUrl)) {
                      setUseFallback(true);
                      setMediaReady(false);
                    } else {
                      setMediaError(true);
                    }
                  }}
                />
              ) : (
                <img
                  key={fullSrc}
                  ref={(n) => {
                    mediaRef.current = n;
                    mediaNodeRef.current = n;
                  }}
                  className={`ex-theatre-media${mediaReady ? ' is-ready' : ''}`}
                  src={fullSrc}
                  alt={work.title}
                  draggable={false}
                  decoding="async"
                  fetchPriority="high"
                  sizes="(max-width: 900px) 94vw, 92vw"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    cursor: scale > 1 ? 'grab' : 'zoom-in',
                    transformOrigin: 'center center',
                  }}
                  onLoad={(e) => {
                    setMediaReady(true);
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setArtAr(img.naturalWidth / img.naturalHeight);
                    }
                  }}
                  onError={() => {
                    const lower = lowerTierId(tiers, tierId);
                    if (lower) {
                      setTierId(lower);
                      setMediaReady(false);
                      return;
                    }
                    if (!useFallback && work.coverUrl && work.coverUrl !== preferredSrc) {
                      setUseFallback(true);
                      setMediaReady(false);
                    } else {
                      setMediaError(true);
                    }
                  }}
                />
              )}
            </div>
            </div>
            </div>
              {tiers.length > 1 ? (
                <div
                  className={`ex-theatre-q${qShow ? ' is-show' : ''}`}
                  role="group"
                  aria-label="Playback quality"
                  onPointerMove={flashQuality}
                >
                  {tiers.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      className={`ex-theatre-quality${tierId === tier.id ? ' is-hi' : ''}`}
                      onClick={() => {
                        if (tier.id === tierId) return;
                        setTierId(tier.id);
                        setMediaReady(false);
                        setMediaError(false);
                        setUseFallback(false);
                        flashQuality();
                      }}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Bottom bar: Random | series + strip | Details (aligned) */}
            <div className="ex-theatre-carousel-bar">
              {onRandom ? (
                <button type="button" className="ex-theatre-random" onClick={onRandom}>
                  Random Artwork
                </button>
              ) : (
                <span className="ex-theatre-random-spacer" aria-hidden />
              )}

              <div className="ex-theatre-carousel">
                <button
                  type="button"
                  className="ex-theatre-series-nav"
                  disabled={!prevSeriesId || !onSeriesShift}
                  onClick={() => prevSeriesId && onSeriesShift?.(prevSeriesId)}
                  title={prevSeriesLabel ? `Previous: ${prevSeriesLabel}` : undefined}
                >
                  {prevSeriesLabel ? (
                    <>
                      <span className="ex-theatre-series-dir">‹</span>
                      <span className="ex-theatre-series-name">{prevSeriesLabel}</span>
                    </>
                  ) : (
                    <span className="ex-theatre-series-name is-empty">-</span>
                  )}
                </button>

                <div className="ex-theatre-strip-wrap">
                  <div
                    ref={stripRef}
                    className="ex-theatre-strip"
                    role="listbox"
                    aria-label={`${seriesLabel} works`}
                  >
                    {collectionWorks.map((w, i) => {
                      const active = w.id === work.id;
                      // R2 previews first — never full Arweave masters in the strip
                      const near = Math.abs(i - index) <= 8;
                      const thumbRaw = preferStill(w);
                      const thumb = catalogueThumbUrl(thumbRaw, 96) || thumbRaw;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          role="option"
                          data-thumb-index={i}
                          aria-selected={active}
                          aria-label={w.title}
                          className={`ex-theatre-thumb${active ? ' is-active' : ''}`}
                          onClick={() => onNavigate(w)}
                          title={w.title}
                        >
                          {thumb ? (
                            <img
                              className="ex-theatre-thumb-img"
                              src={thumb}
                              alt=""
                              loading={near ? 'eager' : 'lazy'}
                              decoding="async"
                              width={36}
                              height={36}
                            />
                          ) : (
                            <span className="ex-theatre-thumb-fallback" aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="ex-theatre-series-nav is-next"
                  disabled={!nextSeriesId || !onSeriesShift}
                  onClick={() => nextSeriesId && onSeriesShift?.(nextSeriesId)}
                  title={nextSeriesLabel ? `Next: ${nextSeriesLabel}` : undefined}
                >
                  {nextSeriesLabel ? (
                    <>
                      <span className="ex-theatre-series-name">{nextSeriesLabel}</span>
                      <span className="ex-theatre-series-dir">›</span>
                    </>
                  ) : (
                    <span className="ex-theatre-series-name is-empty">-</span>
                  )}
                </button>
              </div>

              <button
                type="button"
                className={`ex-theatre-details-btn${panelOpen ? ' is-open' : ''}`}
                onClick={() => setPanelOpen((v) => !v)}
                aria-pressed={panelOpen}
                title="Artwork details (I)"
              >
                Details
              </button>
            </div>
          </div>

          <AnimatePresence>
            {panelOpen && (
              <motion.aside
                className="ex-theatre-panel"
                initial={{ opacity: 0, y: 24, x: 12 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 16, x: 8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="ex-theatre-panel-head">
                  <p className="ex-theatre-panel-series">{seriesLabel}</p>
                  <button
                    type="button"
                    className="ex-theatre-btn icon ghost"
                    onClick={() => setPanelOpen(false)}
                    aria-label="Hide details"
                  >
                    ✕
                  </button>
                </div>

                <h2 className="ex-theatre-panel-title">{work.title}</h2>
                {work.subtitle && <p className="ex-theatre-panel-sub">{work.subtitle}</p>}
                {work.kind === 'fragment' && work.pieceNumber != null && (
                  <p className="ex-theatre-panel-meta-line">
                    Fragment {String(work.pieceNumber).padStart(2, '0')}
                    {work.mintPrice ? ` · ${work.mintPrice}` : ''}
                  </p>
                )}
                {work.editionCount != null && work.editionCount > 1 && (
                  <p className="ex-theatre-panel-meta-line">
                    ×{work.editionCount} claimed
                  </p>
                )}

                <div className="ex-theatre-statement">
                  <p className="ex-theatre-statement-label">Artist note</p>
                  <p className="ex-theatre-statement-body">
                    {descOpen || !needsReadMore ? statement : statementShort}
                  </p>
                  {needsReadMore && (
                    <button
                      type="button"
                      className="ex-theatre-readmore"
                      onClick={() => setDescOpen((v) => !v)}
                      aria-expanded={descOpen}
                    >
                      {descOpen ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>

                <div className="ex-theatre-accordion-row">
                  <button
                    type="button"
                    className={`ex-theatre-accordion${chainOpen ? ' is-open' : ''}`}
                    onClick={() => setChainOpen((v) => !v)}
                    aria-expanded={chainOpen}
                  >
                    Blockchain details
                    <span aria-hidden>{chainOpen ? '−' : '+'}</span>
                  </button>
                  {chainOpen && work.contractAddress && work.tokenId != null && (
                    <button
                      type="button"
                      className="ex-theatre-refresh"
                      onClick={() => loadOwner()}
                      disabled={ownerLoading}
                      aria-label="Refresh owner"
                      title="Refresh owner"
                    >
                      <RefreshIcon spinning={ownerLoading} />
                    </button>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {chainOpen && (
                    <motion.dl
                      className="ex-theatre-meta"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <MetaRow label="Collection" value={seriesLabel} />
                      {work.tokenId != null && (
                        <MetaRow label="Token ID" value={String(work.tokenId)} />
                      )}
                      {work.kind === 'fragment' && work.pieceNumber != null && (
                        <MetaRow
                          label="Fragment"
                          value={String(work.pieceNumber).padStart(2, '0')}
                        />
                      )}
                      <MetaRow label="Token standard" value={standard} />
                      <MetaRow label="Chain" value={chainLabel} />
                      {work.contractAddress && (
                        <MetaRow
                          label="Contract"
                          value={`${work.contractAddress.slice(0, 6)}…${work.contractAddress.slice(-4)}`}
                          href={contractHref}
                        />
                      )}
                      <MetaRow
                        label="Held by"
                        value={
                          ownerLoading
                            ? 'Looking up…'
                            : owner
                              ? owner.label
                              : ownerError
                                ? 'Unavailable'
                                : work.contractAddress
                                  ? ' - '
                                  : 'Not on-chain'
                        }
                        href={owner?.href}
                      />
                      {work.mintPrice && <MetaRow label="Mint price" value={work.mintPrice} />}
                      {work.editionCount != null && work.editionCount > 1 && (
                        <MetaRow label="Claimed" value={String(work.editionCount)} />
                      )}
                      <MetaRow label="Storage" value={storageLabel(fullSrc)} />
                      <MetaRow label="Media" value={isVideo ? 'Video' : 'Image'} />
                    </motion.dl>
                  )}
                </AnimatePresence>

                <div className="ex-theatre-resources">
                  <p className="ex-theatre-statement-label">Other resources</p>
                  <div className="ex-theatre-resource-links">
                    {(work.mediaUrlHi || fullSrc) && (
                      <a
                        href={work.mediaUrlHi || fullSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View original ↗
                      </a>
                    )}
                    {work.openSeaUrl && (
                      <a href={work.openSeaUrl} target="_blank" rel="noopener noreferrer">
                        View on OpenSea ↗
                      </a>
                    )}
                    {work.manifoldUrl && (
                      <a href={work.manifoldUrl} target="_blank" rel="noopener noreferrer">
                        View on Manifold ↗
                      </a>
                    )}
                    {work.rasterUrl && (
                      <a href={work.rasterUrl} target="_blank" rel="noopener noreferrer">
                        View on Raster ↗
                      </a>
                    )}
                    {work.tags?.includes('live') && (
                      <a href={LIVE_SITE} target="_blank" rel="noopener noreferrer">
                        Mint live ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="ex-theatre-panel-nav">
                  <button
                    type="button"
                    className="ex-theatre-btn ghost"
                    disabled={!canPrev}
                    onClick={() => canPrev && onNavigate(collectionWorks[index - 1])}
                  >
                    ‹ Prev
                  </button>
                  <span className="ex-theatre-count">
                    {index + 1} / {collectionWorks.length}
                  </span>
                  <button
                    type="button"
                    className="ex-theatre-btn ghost"
                    disabled={!canNext}
                    onClick={() => canNext && onNavigate(collectionWorks[index + 1])}
                  >
                    Next ›
                  </button>
                  {!isVideo && (
                    <div className="ex-theatre-zoom">
                      <button
                        type="button"
                        className="ex-theatre-btn icon ghost"
                        onClick={() => setScale((s) => Math.max(1, s - 0.25))}
                        aria-label="Zoom out"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="ex-theatre-btn icon ghost"
                        onClick={() => setScale((s) => Math.min(4, s + 0.25))}
                        aria-label="Zoom in"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {observeOpen ? (
            <CanvasLook
              src={observeStillUrl(work)}
              alt={work.title}
              title={work.title}
              onClose={() => setObserveOpen(false)}
            />
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={spinning ? 'is-spin' : undefined}
    >
      <path
        d="M20 12a8 8 0 10-2.34 5.66M20 12V7m0 5h-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="ex-theatre-meta-row">
      <dt>{label}</dt>
      <dd>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function storageLabel(url: string): string {
  if (!url) return ' - ';
  if (url.includes('arweave.net') || url.startsWith('ar://')) return 'Arweave';
  if (url.includes('ipfs') || url.startsWith('ipfs://')) return 'IPFS';
  if (url.includes('assets.nikxart.xyz')) return 'Nikxart CDN';
  return 'Remote';
}
