import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SeriesId } from '../config/catalog';
import type { ShareAsset } from '../lib/shareAssets';
import { SHARE_COLLECTIONS } from '../lib/shareAssets';
import { downloadAsset } from '../lib/downloadAsset';

type Props = {
  assets: ShareAsset[];
  /** When set, show a collection filter. Defaults to this series. */
  filterable?: boolean;
  defaultCollection?: SeriesId | 'all';
};

export function ShareDownloads({ assets, filterable, defaultCollection = 'all' }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ShareAsset | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [collection, setCollection] = useState<SeriesId | 'all'>(defaultCollection);

  useEffect(() => {
    setCollection(defaultCollection);
  }, [defaultCollection]);

  const collections = useMemo(() => {
    const present = new Set(assets.map((a) => a.seriesId));
    return SHARE_COLLECTIONS.filter((c) => present.has(c.id));
  }, [assets]);

  const visible = useMemo(() => {
    if (!filterable || collection === 'all') return assets;
    return assets.filter((a) => a.seriesId === collection);
  }, [assets, filterable, collection]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [preview]);

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

  if (!assets.length) return null;

  return (
    <>
      <section className="ex-share" aria-labelledby="ex-share-title">
        <button
          type="button"
          className="ex-share-trigger"
          id="ex-share-title"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="ex-share-trigger-line" />
          <span className="ex-share-trigger-inner">
            Share the work
            <svg
              className={`ex-share-chevron${open ? ' is-open' : ''}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="ex-share-trigger-line" />
        </button>
        <div className={`ex-share-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
          <div className="ex-share-drawer-inner">
            <p className="ex-share-intro">
              Web-optimised files for Instagram, X, or sending to a friend. Video is Full HD —
              1920 on the long edge, 24fps.
            </p>
            {filterable && collections.length > 1 ? (
              <div className="ex-share-filters" role="tablist" aria-label="Collection">
                <button
                  type="button"
                  role="tab"
                  aria-selected={collection === 'all'}
                  className={collection === 'all' ? 'is-on' : undefined}
                  onClick={() => setCollection('all')}
                >
                  All
                </button>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={collection === c.id}
                    className={collection === c.id ? 'is-on' : undefined}
                    onClick={() => setCollection(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="ex-share-tags">
              {visible.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="ex-share-tag"
                  onClick={() => {
                    setPreview(asset);
                    setDownloadError(false);
                  }}
                >
                  <span>{asset.label}</span>
                  <span className="ex-share-tag-hint">
                    {asset.kind === 'video' ? 'Full HD' : 'preview'}
                  </span>
                </button>
              ))}
            </div>
            {!visible.length ? (
              <p className="ex-share-intro">Nothing in this collection yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {preview && (
          <motion.div
            className="ex-share-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${preview.label} share preview`}
          >
            <motion.div
              className="ex-share-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="ex-share-close"
                onClick={() => setPreview(null)}
                aria-label="Close"
              >
                ✕
              </button>
              <p className="ex-share-modal-title">{preview.label}</p>
              <p className="ex-share-modal-sub">
                {preview.seriesLabel}
                {preview.kind === 'video' ? ' · Full HD · 24fps' : ''}
              </p>
              <div className={`ex-share-media${preview.kind === 'image' ? ' is-still' : ''}`}>
                {preview.kind === 'video' ? (
                  <video
                    src={preview.downloadUrl}
                    poster={preview.thumbUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.thumbUrl || preview.downloadUrl} alt="" />
                )}
              </div>
              <button
                type="button"
                className="ex-share-download"
                onClick={() => void handleDownload()}
                disabled={downloading}
              >
                {downloading
                  ? 'Preparing…'
                  : preview.kind === 'video'
                    ? 'Download Full HD'
                    : 'Download'}
              </button>
              {downloadError && (
                <p className="ex-share-error" role="status">
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
