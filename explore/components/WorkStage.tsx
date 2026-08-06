import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ExploreWork } from '../config/catalog';
import { getSeriesById, LIVE_SITE } from '../config/catalog';
import { getChainCollection } from '../lib/chainWorks';

type Props = {
  work: ExploreWork | null;
  works: ExploreWork[];
  onClose: () => void;
  onNavigate: (work: ExploreWork) => void;
};

/**
 * Collection Theatre — art-first immersive viewer.
 * Grid uses lightweight covers; full media is pulled from origin (Arweave/IPFS/CDN)
 * only when the theatre opens.
 */
export function WorkStage({ work, works, onClose, onNavigate }: Props) {
  const index = work ? works.findIndex((w) => w.id === work.id) : -1;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < works.length - 1;
  const series = work ? getSeriesById(work.seriesId) : undefined;
  const chainCol = work ? getChainCollection(work.seriesId) : null;

  const [infoOpen, setInfoOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const mediaShellRef = useRef<HTMLDivElement>(null);

  const preferredSrc = work?.mediaUrl || work?.coverUrl || '';
  const fullSrc =
    useFallback && work?.coverUrl && work.coverUrl !== preferredSrc
      ? work.coverUrl
      : preferredSrc;
  const isVideo = work?.mediaType === 'video' && !!work?.mediaUrl && !useFallback;

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setMediaReady(false);
    setMediaError(false);
    setUseFallback(false);
  }, []);

  useEffect(() => {
    if (!work) return;
    resetView();
  }, [work?.id, resetView]);

  useEffect(() => {
    if (!work) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (infoOpen) setInfoOpen(false);
        else onClose();
      }
      if (event.key === 'ArrowLeft' && canPrev) onNavigate(works[index - 1]);
      if (event.key === 'ArrowRight' && canNext) onNavigate(works[index + 1]);
      if (event.key === 'i' || event.key === 'I') setInfoOpen((v) => !v);
      if (event.key === '0') {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
      if (event.key === '+' || event.key === '=') setScale((s) => Math.min(4, s + 0.25));
      if (event.key === '-' || event.key === '_') setScale((s) => Math.max(1, s - 0.25));
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [work, works, index, canPrev, canNext, onClose, onNavigate, infoOpen]);

  const onWheel = (e: React.WheelEvent) => {
    if (isVideo) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    setScale((s) => Math.min(4, Math.max(1, s + delta)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (isVideo || scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || scale <= 1) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const chainLabel =
    chainCol?.chainId === 8453 ? 'Base' : chainCol?.chainId === 1 ? 'Ethereum' : chainCol?.chain || '—';
  const standard =
    chainCol?.standard === 'erc1155'
      ? 'ERC-1155'
      : chainCol?.standard === 'erc721'
        ? 'ERC-721'
        : work?.kind === 'fragment'
          ? 'ERC-721'
          : '—';

  return (
    <AnimatePresence>
      {work && (
        <motion.div
          className={`ex-theatre${infoOpen ? ' is-info' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-label={work.title}
        >
          {/* Art canvas — full-res pulled from origin on open */}
          <div
            className="ex-theatre-canvas"
            ref={mediaShellRef}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {!mediaReady && !mediaError && (
              <div className="ex-theatre-loading" aria-live="polite">
                <span className="ex-theatre-loading-dot" />
                Loading artwork…
              </div>
            )}
            {mediaError && (
              <div className="ex-theatre-loading">
                Could not load media.
                {fullSrc && (
                  <a href={fullSrc} target="_blank" rel="noopener noreferrer" className="ex-theatre-link">
                    Open source file ↗
                  </a>
                )}
              </div>
            )}

            {isVideo ? (
              <video
                key={fullSrc}
                className={`ex-theatre-media${mediaReady ? ' is-ready' : ''}`}
                src={fullSrc}
                poster={work.coverUrl}
                controls
                playsInline
                autoPlay
                loop
                onLoadedData={() => setMediaReady(true)}
                onError={() => setMediaError(true)}
              />
            ) : (
              <img
                key={fullSrc}
                className={`ex-theatre-media${mediaReady ? ' is-ready' : ''}`}
                src={fullSrc}
                alt={work.title}
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  cursor: scale > 1 ? 'grab' : 'default',
                }}
                onLoad={() => setMediaReady(true)}
                onError={() => {
                  if (!useFallback && work.coverUrl && work.coverUrl !== preferredSrc) {
                    setUseFallback(true);
                    setMediaReady(false);
                  } else {
                    setMediaError(true);
                  }
                }}
              />
            )}

            {/* Soft title overlay — minimal */}
            <div className="ex-theatre-titlebar">
              <p className="ex-theatre-title">{work.title}</p>
              {work.editionCount != null && work.editionCount > 1 && (
                <span className="ex-theatre-edition">x{work.editionCount}</span>
              )}
            </div>
          </div>

          {/* Bottom chrome */}
          <div className="ex-theatre-bar">
            <div className="ex-theatre-bar-left">
              <button type="button" className="ex-theatre-btn" onClick={onClose}>
                Catalogue
              </button>
            </div>

            <div className="ex-theatre-bar-center">
              <button
                type="button"
                className="ex-theatre-btn"
                disabled={!canPrev}
                onClick={() => canPrev && onNavigate(works[index - 1])}
                aria-label="Previous"
              >
                ‹ Prev
              </button>
              <span className="ex-theatre-count">
                {index + 1} / {works.length}
              </span>
              <button
                type="button"
                className="ex-theatre-btn"
                disabled={!canNext}
                onClick={() => canNext && onNavigate(works[index + 1])}
                aria-label="Next"
              >
                Next ›
              </button>
            </div>

            <div className="ex-theatre-bar-right">
              {!isVideo && (
                <>
                  <button
                    type="button"
                    className="ex-theatre-btn icon"
                    onClick={() => setScale((s) => Math.max(1, s - 0.25))}
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="ex-theatre-btn icon"
                    onClick={() => setScale((s) => Math.min(4, s + 0.25))}
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ex-theatre-btn"
                    onClick={() => {
                      setScale(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                  >
                    Fit
                  </button>
                </>
              )}
              <button
                type="button"
                className={`ex-theatre-btn${infoOpen ? ' is-active' : ''}`}
                onClick={() => setInfoOpen((v) => !v)}
                aria-pressed={infoOpen}
              >
                Info
              </button>
              <button type="button" className="ex-theatre-btn icon" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Optional info drawer — on demand */}
          <AnimatePresence>
            {infoOpen && (
              <motion.aside
                className="ex-theatre-info"
                initial={{ x: '100%', opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.6 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="ex-theatre-info-head">
                  <p className="ex-theatre-info-kicker">{series?.label ?? 'Collection'}</p>
                  <button
                    type="button"
                    className="ex-theatre-btn icon"
                    onClick={() => setInfoOpen(false)}
                    aria-label="Close info"
                  >
                    ✕
                  </button>
                </div>
                <h2 className="ex-theatre-info-title">{work.title}</h2>
                {work.subtitle && <p className="ex-theatre-info-sub">{work.subtitle}</p>}
                {work.blurb && <p className="ex-theatre-info-blurb">{work.blurb}</p>}

                <dl className="ex-theatre-meta">
                  <MetaRow label="Collection" value={series?.label ?? work.seriesId} />
                  {work.editionCount != null && work.editionCount > 1 && (
                    <MetaRow label="Edition" value={`x${work.editionCount}`} />
                  )}
                  {work.mintPrice && <MetaRow label="Mint price" value={work.mintPrice} />}
                  {work.kind === 'fragment' && work.pieceNumber != null && (
                    <MetaRow label="Fragment" value={String(work.pieceNumber).padStart(2, '0')} />
                  )}
                  {work.tokenId != null && <MetaRow label="Token ID" value={`#${work.tokenId}`} />}
                  <MetaRow label="Token standard" value={standard} />
                  <MetaRow label="Blockchain" value={chainLabel} />
                  {work.contractAddress && (
                    <MetaRow
                      label="Contract"
                      value={`${work.contractAddress.slice(0, 8)}…${work.contractAddress.slice(-6)}`}
                      href={
                        chainCol?.chainId === 8453
                          ? `https://basescan.org/address/${work.contractAddress}`
                          : `https://etherscan.io/address/${work.contractAddress}`
                      }
                    />
                  )}
                  <MetaRow label="File storage" value={storageLabel(fullSrc)} />
                  <MetaRow label="Media" value={isVideo ? 'Video' : 'Image'} />
                </dl>

                <div className="ex-theatre-info-actions">
                  {fullSrc && (
                    <a className="ex-pill ex-pill--accent" href={fullSrc} target="_blank" rel="noopener noreferrer">
                      Open full media ↗
                    </a>
                  )}
                  {work.openSeaUrl && (
                    <a className="ex-pill" href={work.openSeaUrl} target="_blank" rel="noopener noreferrer">
                      View token ↗
                    </a>
                  )}
                  {work.manifoldUrl && (
                    <a className="ex-pill" href={work.manifoldUrl} target="_blank" rel="noopener noreferrer">
                      Manifold ↗
                    </a>
                  )}
                  {work.rasterUrl && (
                    <a className="ex-pill" href={work.rasterUrl} target="_blank" rel="noopener noreferrer">
                      Raster ↗
                    </a>
                  )}
                  {work.tags?.includes('live') && (
                    <a className="ex-pill" href={LIVE_SITE} target="_blank" rel="noopener noreferrer">
                      Mint live ↗
                    </a>
                  )}
                </div>

                <p className="ex-theatre-hint">
                  Shortcuts · ← → navigate · I info · + − zoom · Esc close
                </p>
              </motion.aside>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
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
            {value} ↗
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function storageLabel(url: string): string {
  if (!url) return '—';
  if (url.includes('arweave.net') || url.startsWith('ar://')) return 'Arweave';
  if (url.includes('ipfs') || url.startsWith('ipfs://')) return 'IPFS';
  if (url.includes('assets.nikxart.xyz')) return 'Nikxart CDN';
  return 'Remote';
}
