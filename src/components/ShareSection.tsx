import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { downloadAsset } from '../lib/downloadAsset';
import { useSiteAudio } from '../providers/SiteAudioProvider';
import { ChevronIcon } from './ChevronIcon';

type SharePiece = {
  number: number;
  label: string;
  thumbUrl: string;
  downloadUrl: string;
  downloadName: string;
};

type Props = {
  open: boolean;
  onToggle: () => void;
  pieces: SharePiece[];
};

export function ShareSection({ open, onToggle, pieces }: Props) {
  const [preview, setPreview] = useState<SharePiece | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const { setMasterSuppressed } = useSiteAudio();

  useEffect(() => {
    setMasterSuppressed('share-preview', preview != null);
    return () => setMasterSuppressed('share-preview', false);
  }, [preview, setMasterSuppressed]);

  useEffect(() => {
    if (preview == null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [preview]);

  const closePreview = useCallback(() => {
    setPreview(null);
    setDownloadError(false);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!preview || downloading) return;

    setDownloading(true);
    setDownloadError(false);

    try {
      await downloadAsset(preview.downloadUrl, preview.downloadName);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  }, [preview, downloading]);

  return (
    <>
      <div className="section-pad">
        <button type="button" className="share-trigger" onClick={onToggle} aria-expanded={open}>
          <div className="share-trigger-line" />
          <div className="share-trigger-inner">
            <span>Share the work</span>
            <ChevronIcon open={open} className={`share-chevron${open ? ' open' : ''}`} />
          </div>
          <div className="share-trigger-line" />
        </button>
        <div className={`share-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
          <div className="share-drawer-inner">
            <p className="share-intro">
              Download optimised files for sharing on Instagram, X, or sending to a friend.
            </p>
            {pieces.length === 0 ? (
              <p className="share-empty">Assets will appear here as pieces are released.</p>
            ) : (
              <div className="share-tags">
                {pieces.map((piece) => (
                  <button
                    key={piece.number}
                    type="button"
                    className="share-tag"
                    onClick={() => setPreview(piece)}
                  >
                    <span>{piece.label}</span>
                    <span className="share-tag-hint">preview</span>
                    <svg
                      className="share-tag-icon"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 5v14l11-7L8 5z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {preview != null && (
          <motion.div
            className="share-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={closePreview}
            role="dialog"
            aria-modal="true"
            aria-label={`${preview.label} share preview`}
          >
            <motion.div
              className="share-modal-panel"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="share-modal-close"
                onClick={closePreview}
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

              <p className="share-modal-title">{preview.label}</p>

              <div className="share-modal-media">
                <video
                  src={preview.downloadUrl}
                  poster={preview.thumbUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={preview.label}
                />
              </div>

              <button
                type="button"
                className="share-modal-download"
                onClick={() => void handleDownload()}
                disabled={downloading}
              >
                {downloading ? 'Preparing…' : 'Download'}
              </button>

              {downloadError && (
                <p className="share-modal-error" role="status">
                  Download failed — try again in a moment.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}