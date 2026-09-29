import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ExploreWork } from '../config/catalog';
import { catalogueThumbUrl } from '../lib/mediaUrl';

export function WorkCard({
  work,
  index,
  isActive,
  compact,
  onSelect,
}: {
  work: ExploreWork;
  index: number;
  isActive?: boolean;
  compact?: boolean;
  onSelect: (w: ExploreWork) => void;
}) {
  const primary = catalogueThumbUrl(work.coverUrl, 420) || work.coverUrl;
  const [src, setSrc] = useState(primary);
  useEffect(() => {
    setSrc(catalogueThumbUrl(work.coverUrl, 420) || work.coverUrl);
  }, [work.coverUrl]);

  const fallback =
    work.originCoverUrl && work.originCoverUrl !== work.coverUrl
      ? catalogueThumbUrl(work.originCoverUrl, 420) || work.originCoverUrl
      : work.mediaType === 'image' && work.mediaUrl && work.mediaUrl !== work.coverUrl
        ? catalogueThumbUrl(work.mediaUrl, 420) || work.mediaUrl
        : undefined;

  const eager = compact ? index < 7 : index < 6;
  const motionSrc = work.motionUrl;
  const [armed, setArmed] = useState(false);

  return (
    <motion.button
      type="button"
      className={`ex-card${isActive ? ' is-active' : ''}${compact ? ' ex-card--compact' : ''}${
        work.tags?.includes('portrait') ? ' ex-card--portrait' : ''
      }${work.tags?.includes('embers') ? ' ex-card--ember' : ''}${motionSrc ? ' has-motion' : ''}${
        armed ? ' is-armed' : ''
      }`}
      onClick={() => onSelect(work)}
      onMouseEnter={() => motionSrc && setArmed(true)}
      onFocus={() => motionSrc && setArmed(true)}
      initial={eager ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={eager ? { delay: Math.min(index * 0.03, 0.25), duration: 0.4 } : { duration: 0 }}
      aria-label={`Open ${work.title} in Theatre`}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="ex-card-media">
        <img
          className="ex-card-still"
          src={src}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'low' : undefined}
          sizes={
            compact
              ? '(max-width: 720px) 30vw, 11vw'
              : '(max-width: 640px) 45vw, (max-width: 1100px) 22vw, 180px'
          }
          width={compact ? 280 : 420}
          height={compact ? 280 : 420}
          onError={() => {
            if (fallback && src !== fallback) setSrc(fallback);
          }}
        />
        {motionSrc && armed ? (
          <img className="ex-card-gif" src={motionSrc} alt="" decoding="async" />
        ) : null}
        {motionSrc && !compact ? (
          <span
            className="ex-motion-view"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setArmed((v) => !v);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {armed ? 'Still' : 'View'}
          </span>
        ) : null}
        {!compact && work.tags?.includes('live') && <span className="ex-card-badge live">Live</span>}
        {!compact && work.editionCount != null && work.editionCount > 1 ? (
          <span className="ex-card-badge editions">×{work.editionCount}</span>
        ) : null}
      </div>
      <div className="ex-card-meta">
        <p className="ex-card-title">{work.title}</p>
        {!compact && work.subtitle ? <p className="ex-card-sub">{work.subtitle}</p> : null}
      </div>
    </motion.button>
  );
}
