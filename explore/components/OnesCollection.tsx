import { useEffect, useRef, useState } from 'react';
import type { ExploreWork } from '../config/catalog';
import {
  BLOCK_BLIP,
  BLOCK_PAGE,
  BLOCK_PANELS,
  BLOCK_WORK_TITLE,
  blockPanelRevealed,
} from '../config/on-the-block';
import { catalogueThumbUrl, isVideoWork, stillMasterUrl } from '../lib/mediaUrl';
import { getFeatureCacheItems } from '../lib/previews';

type Props = {
  works: ExploreWork[];
  activeId?: string;
  onSelect: (work: ExploreWork) => void;
};

function hangStill(work: ExploreWork) {
  const cached = getFeatureCacheItems().find(
    (item) => item.seriesId === work.seriesId && item.workId === work.id,
  )?.featureUrl;
  const base =
    cached || work.originCoverUrl || stillMasterUrl(work) || work.coverUrl || '';
  if (/\.gif(\?|$)/i.test(base)) return base;
  return catalogueThumbUrl(base, 1800) || base;
}

function hangFallback(work: ExploreWork) {
  return work.originCoverUrl || work.coverUrl || stillMasterUrl(work) || '';
}

function OnesHang({
  work,
  isActive,
  onSelect,
}: {
  work: ExploreWork;
  isActive?: boolean;
  onSelect: (w: ExploreWork) => void;
}) {
  const frameRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [quiet, setQuiet] = useState(false);
  const [inView, setInView] = useState(false);
  const [armed, setArmed] = useState(false);
  const still = hangStill(work);
  const video = !quiet && isVideoWork(work) ? work.mediaUrl : undefined;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setQuiet(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.28,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (inView && video) setArmed(true);
  }, [inView, video]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) v.play().catch(() => {});
    else v.pause();
  }, [inView, armed, video]);

  return (
    <article className="ex-ones-hang">
      <h3 className="ex-ones-hang-title">{work.title}</h3>
      <button
        ref={frameRef}
        type="button"
        className={`ex-ones-hang-frame${isActive ? ' is-active' : ''}`}
        onClick={() => onSelect(work)}
        aria-label={`Open ${work.title} in Theatre`}
      >
        {video ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            src={armed ? video : undefined}
            poster={still}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={still}
            alt=""
            decoding="async"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              const next = hangFallback(work);
              if (next && img.src !== next) img.src = next;
              else img.onerror = null;
            }}
          />
        )}
      </button>
    </article>
  );
}

export function OnesVoices() {
  return (
    <section className="ex-afb-will" aria-label="Voices Of Time">
      <div className="ex-section-head">
        <h2 className="ex-section-title">{BLOCK_WORK_TITLE}</h2>
      </div>
      <p className="ex-afb-will-sub">{BLOCK_BLIP}</p>
      <div className="ex-afb-will-row" aria-hidden="true">
        {BLOCK_PANELS.map((p) => {
          const open = blockPanelRevealed(p);
          return (
            <span key={p.panel} className="ex-afb-will-cell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={open ? p.thumb : p.still} alt="" loading="lazy" decoding="async" />
              <em>{String(p.panel).padStart(2, '0')}</em>
              {!open ? <span className="ex-would-veil">Unrevealed</span> : null}
            </span>
          );
        })}
      </div>
      <hr className="ex-afb-rule" />
      <a className="ex-read-more" href={BLOCK_PAGE}>
        Look Closer
      </a>
    </section>
  );
}

export function OnesCollection({ works, activeId, onSelect }: Props) {
  return (
    <section className="ex-ones-stack" aria-label="1 of 1s">
      {works.map((work) => (
        <OnesHang
          key={work.id}
          work={work}
          isActive={activeId === work.id}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
