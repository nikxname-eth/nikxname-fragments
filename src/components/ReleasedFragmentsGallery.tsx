import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getFragmentThumbUrl, PIECE_NAMES } from '../config/artist';
import { useSiteAudio } from '../providers/SiteAudioProvider';
import { FragmentMedia } from './FragmentMedia';

type Props = {
  pieceNumbers: number[];
};

export function ReleasedFragmentsGallery({ pieceNumbers }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { setMasterSuppressed } = useSiteAudio();

  useEffect(() => {
    setMasterSuppressed('released-gallery', expanded != null);
    return () => setMasterSuppressed('released-gallery', false);
  }, [expanded, setMasterSuppressed]);

  useEffect(() => {
    if (expanded == null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(null);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  if (!pieceNumbers.length) return null;

  const expandedTitle =
    expanded != null ? (PIECE_NAMES[expanded] ?? `Fragment ${expanded}`) : '';

  return (
    <>
      <motion.section
        className="released-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.75, duration: 0.9 }}
        aria-label="Released fragments"
      >
        <p className="released-lbl">Released fragments</p>
        <div className="released-grid">
          {pieceNumbers.map((piece) => {
            const title = PIECE_NAMES[piece] ?? `Fragment ${piece}`;
            const thumb = getFragmentThumbUrl(piece);

            return (
              <button
                key={piece}
                type="button"
                className="released-thumb"
                onClick={() => setExpanded(piece)}
                aria-label={`Experience ${title}`}
              >
                {thumb && (
                  <img src={thumb} alt="" loading="lazy" decoding="async" />
                )}
                <span className="released-thumb-num">{String(piece).padStart(2, '0')}</span>
              </button>
            );
          })}
        </div>
      </motion.section>

      <AnimatePresence>
        {expanded != null && (
          <motion.div
            className="released-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            onClick={() => setExpanded(null)}
            role="dialog"
            aria-modal="true"
            aria-label={expandedTitle}
          >
            <motion.div
              className="released-lightbox-panel"
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="released-lightbox-close"
                onClick={() => setExpanded(null)}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <p className="released-lightbox-title">{expandedTitle}</p>

              <div className="released-lightbox-media piece-video">
                <FragmentMedia
                  tokenId={expanded}
                  fallbackTitle={expandedTitle}

                />
                <div className="piece-video-overlay" />
                <span className="piece-ghost">{String(expanded).padStart(2, '0')}</span>
                <span className="piece-frag">{expandedTitle}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}