import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getCanvasStatePiece,
  getCanvasStateStill,
  getFragmentThumbUrl,
  PIECE_NAMES,
} from '../config/artist';
import { useDropSchedule } from '../hooks/useDropSchedule';
import { useSiteAudio } from '../providers/SiteAudioProvider';
import { FragmentMedia } from './FragmentMedia';

type Props = {
  open: boolean;
  pieceNumbers: number[];
  theme: 'dark' | 'light';
};

export function TheatreDrawer({ open, pieceNumbers, theme }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const { setMasterSuppressed } = useSiteAudio();
  /** Same clock as mint — canvas does not advance until the live window flips. */
  const { now } = useDropSchedule();
  const canvasPiece = getCanvasStatePiece(now);
  const canvasState = getCanvasStateStill({ theme, width: 720, piece: canvasPiece, now });
  const canvasStateFull = getCanvasStateStill({ theme, width: 1920, piece: canvasPiece, now });

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

  const openCanvas = useCallback(() => {
    setExpanded(null);
    setImmersive(false);
    setCanvasOpen(true);
  }, []);

  const openFragment = useCallback((piece: number) => {
    setCanvasOpen(false);
    setExpanded(piece);
  }, []);

  const closeStage = useCallback(() => {
    setExpanded(null);
    setCanvasOpen(false);
    setImmersive(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      setCanvasOpen(false);
      setImmersive(false);
    }
  }, [open]);

  useEffect(() => {
    if (expanded == null) setImmersive(false);
  }, [expanded]);

  // Suppress ambient audio only while a fragment plays — canvas keeps site audio.
  useEffect(() => {
    setMasterSuppressed('theatre', expanded != null);
    return () => setMasterSuppressed('theatre', false);
  }, [expanded, setMasterSuppressed]);

  useEffect(() => {
    if (expanded == null && !canvasOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (canvasOpen) {
        if (event.key === 'Escape') setCanvasOpen(false);
        return;
      }

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
  }, [expanded, immersive, canvasOpen, goToRelative]);

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
            <p className="theatre-tagline">Experience the Art in Full view</p>
          </div>

          <button
            type="button"
            className="theatre-canvas-option"
            onClick={openCanvas}
            aria-label={`View canvas state No.${canvasPiece}`}
          >
            <div className="theatre-canvas-option-media">
              <img
                key={canvasState.src}
                src={canvasState.src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
            <div className="theatre-canvas-option-label">
              Canvas state No.{canvasPiece}
            </div>
          </button>

          {pieceNumbers.length === 0 ? (
            <p className="theatre-empty">Fragments appear here as they are released.</p>
          ) : (
            <>
              <p className="theatre-grid-lbl">Released fragments</p>
              <div className="theatre-grid">
                {pieceNumbers.map((piece) => {
                  const title = PIECE_NAMES[piece] ?? `Fragment ${piece}`;
                  const thumb = getFragmentThumbUrl(piece, 240);

                  return (
                    <button
                      key={piece}
                      type="button"
                      className="theatre-thumb"
                      onClick={() => openFragment(piece)}
                      aria-label={`View ${title} in theatre`}
                    >
                      {thumb && (
                        <img src={thumb} alt="" loading="lazy" decoding="async" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {canvasOpen && (
          <motion.div
            className="theatre-stage theatre-stage--canvas is-immersive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36 }}
            onClick={() => setCanvasOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Canvas state — current revealed grid"
          >
            <button
              type="button"
              className="theatre-stage-close"
              onClick={() => setCanvasOpen(false)}
              aria-label="Close canvas state"
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
              <p className="theatre-stage-title">Canvas state No.{canvasPiece}</p>
              <div className="theatre-stage-media theatre-canvas-media">
                <img
                  key={canvasStateFull.fullSrc}
                  src={canvasStateFull.fullSrc}
                  alt="Current canvas — revealed grid still"
                  decoding="async"
                />
              </div>
              <p className="theatre-stage-hint">Click outside or press Esc to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              else closeStage();
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
                else closeStage();
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
