import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ExploreWork } from '../config/catalog';
import { getSeriesById, LIVE_SITE } from '../config/catalog';

type Props = {
  work: ExploreWork | null;
  works: ExploreWork[];
  onClose: () => void;
  onNavigate: (work: ExploreWork) => void;
};

export function WorkStage({ work, works, onClose, onNavigate }: Props) {
  const index = work ? works.findIndex((w) => w.id === work.id) : -1;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < works.length - 1;
  const series = work ? getSeriesById(work.seriesId) : undefined;

  useEffect(() => {
    if (!work) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && canPrev) onNavigate(works[index - 1]);
      if (event.key === 'ArrowRight' && canNext) onNavigate(works[index + 1]);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [work, works, index, canPrev, canNext, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {work && (
        <motion.div
          className="ex-stage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={work.title}
        >
          <motion.div
            className="ex-stage-panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="ex-stage-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="ex-stage-media">
              {work.mediaType === 'video' && work.mediaUrl ? (
                <video
                  key={work.mediaUrl}
                  src={work.mediaUrl}
                  poster={work.coverUrl}
                  controls
                  playsInline
                  autoPlay
                  muted
                  loop
                />
              ) : (
                <img key={work.coverUrl} src={work.coverUrl} alt="" />
              )}
            </div>

            <div className="ex-stage-body">
              <p className="ex-stage-kicker">{series?.label ?? work.seriesId}</p>
              <h2 className="ex-stage-title">{work.title}</h2>
              {work.subtitle && <p className="ex-stage-sub">{work.subtitle}</p>}
              {work.blurb && <p className="ex-stage-blurb">{work.blurb}</p>}
              {work.mintPrice && (
                <p className="ex-stage-sub" style={{ marginBottom: 14 }}>
                  {work.mintPrice}
                  {work.tags?.includes('open edition') ? ' · Open edition' : ''}
                </p>
              )}
              {work.editionCount != null && work.editionCount > 1 && (
                <p className="ex-stage-sub" style={{ marginBottom: 14 }}>
                  Editions · x{work.editionCount}
                </p>
              )}

              <div className="ex-stage-actions">
                {work.contractAddress && work.tokenId != null && (
                  <span className="ex-pill" style={{ cursor: 'default', opacity: 0.55 }}>
                    {work.contractAddress.slice(0, 6)}…{work.contractAddress.slice(-4)} · #{work.tokenId}
                  </span>
                )}
                {work.openSeaUrl && (
                  <a
                    className="ex-pill ex-pill--accent"
                    href={work.openSeaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View token ↗
                  </a>
                )}
                {work.manifoldUrl && (
                  <a
                    className="ex-pill ex-pill--accent"
                    href={work.manifoldUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Manifold catalog ↗
                  </a>
                )}
                {work.rasterUrl && (
                  <a
                    className="ex-pill ex-pill--accent"
                    href={work.rasterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Raster ↗
                  </a>
                )}
                {work.tags?.includes('live') && (
                  <a className="ex-pill" href={LIVE_SITE} target="_blank" rel="noopener noreferrer">
                    Mint on live site ↗
                  </a>
                )}
              </div>

              {works.length > 1 && (
                <div className="ex-stage-nav">
                  <button
                    type="button"
                    className="ex-stage-arrow"
                    disabled={!canPrev}
                    onClick={() => canPrev && onNavigate(works[index - 1])}
                    aria-label="Previous"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M15 6l-6 6 6 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <span className="ex-stage-sub" style={{ margin: 0, minWidth: '5ch', textAlign: 'center' }}>
                    {index + 1} / {works.length}
                  </span>
                  <button
                    type="button"
                    className="ex-stage-arrow"
                    disabled={!canNext}
                    onClick={() => canNext && onNavigate(works[index + 1])}
                    aria-label="Next"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
