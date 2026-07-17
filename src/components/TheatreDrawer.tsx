import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getFragmentThumbUrl, PIECE_NAMES } from '../config/artist';
import { useSiteAudio } from '../providers/SiteAudioProvider';
import { FragmentMedia } from './FragmentMedia';

type Props = {
  open: boolean;
  pieceNumbers: number[];
};

export function TheatreDrawer({ open, pieceNumbers }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [immersive, setImmersive] = useState(false);
  const { setMasterSuppressed } = useSiteAudio();

  const pieceIndex = expanded != null ? pieceNumbers.indexOf(expanded) : -1;
  const canNavigate = pieceNumbers.length > 1 && pieceIndex >= 0;

  const goToRelative = useCallback(
    (delta: number) => {
      if (pieceNumbers.length < 2 || pieceIndex < 0) return;
      const nextIndex = (pieceIndex + delta + pieceNumbers.length) % pieceNumbers.length;
      setExpanded(pieceNumbers[nextIndex]);
    },
    [pieceIndex, pieceNumbers],
  );

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      setImmersive(false);
    }
  }, [open]);

  useEffect(() => {
    if (expanded == null) setImmersive(false);
  }, [expanded]);

  useEffect(() => {
    setMasterSuppressed('theatre', expanded != null);
    return () => setMasterSuppressed('theatre', false);
  }, [expanded, setMasterSuppressed]);

  useEffect(() => {
    if (expanded == null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToRelative(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToRelative(1);
        return;
      }
      if (event.key !== 'Escape') return;
      if (immersive) {
        setImmersive(false);
        return;
      }
      setExpanded(null);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded, immersive, goToRelative]);

  const expandedLabel =
    expanded != null ? `Fragment ${String(expanded).padStart(2, '0')}` : '';
  const expandedTitle =
    expanded != null ? (PIECE_NAMES[expanded] ?? expandedLabel) : '';

  return (
    <>
      <div className={`theatre-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="theatre-drawer-inner">
          <div className="theatre-header">
            <p className="theatre-title">Theatre</p>
            <p className="theatre-tagline">Experience the fragments in full view</p>
          </div>

          {pieceNumbers.length === 0 ? (
            <p className="theatre-empty">Fragments appear here as they are released.</p>
          ) : (
            <div className="theatre-grid">
              {pieceNumbers.map((piece) => {
                const title = PIECE_NAMES[piece] ?? `Fragment ${piece}`;
                const thumb = getFragmentThumbUrl(piece, 240);

                return (
                  <button
                    key={piece}
                    type="button"
                    className="theatre-thumb"
                    onClick={() => setExpanded(piece)}
                    aria-label={`View ${title} in theatre`}
                  >
                    {thumb && (
                      <img src={thumb} alt="" loading="lazy" decoding="async" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded != null && (
          <motion.div
            className={`theatre-stage${immersive ? ' is-immersive' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36 }}
            onClick={() => {
              if (immersive) setImmersive(false);
              else setExpanded(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={expandedTitle}
          >
            <button
              type="button"
              className="theatre-stage-close"
              onClick={() => {
                if (immersive) setImmersive(false);
                else setExpanded(null);
              }}
              aria-label={immersive ? 'Exit full' : 'Close theatre view'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <motion.div
              className="theatre-stage-panel"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="theatre-stage-nav">
                <button
                  type="button"
                  className="theatre-stage-arrow"
                  onClick={() => goToRelative(-1)}
                  disabled={!canNavigate}
                  aria-label="Previous fragment"
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
                <p className="theatre-stage-title">{expandedLabel.toUpperCase()}</p>
                <button
                  type="button"
                  className="theatre-stage-arrow"
                  onClick={() => goToRelative(1)}
                  disabled={!canNavigate}
                  aria-label="Next fragment"
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

              <div className="theatre-stage-media piece-video">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={expanded}
                    className="theatre-stage-media-swap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <FragmentMedia tokenId={expanded} fallbackTitle={expandedTitle} eager />
                  </motion.div>
                </AnimatePresence>
                <div className="piece-video-overlay" />
                <span className="piece-ghost">{String(expanded).padStart(2, '0')}</span>
                <button
                  type="button"
                  className={`theatre-full-btn${immersive ? ' is-active' : ''}`}
                  onClick={() => setImmersive((value) => !value)}
                  aria-label={immersive ? 'Exit full' : 'Full'}
                  aria-pressed={immersive}
                >
                  Full
                </button>
              </div>
              <p className="theatre-stage-hint">
                {immersive
                  ? 'Arrows to browse · Esc or Full to step back'
                  : 'Arrows to browse · click outside or Esc to close'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
