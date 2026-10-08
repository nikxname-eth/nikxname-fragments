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

/** Burn The Roses is 1920×1152. A 16:9 frame leaves a dark margin around it. */
const HANG_RATIO: Record<string, string> = {
  'one-of-ones-3': '5 / 3',
};

const VOICES_ORDER = ['one-of-ones-7', 'one-of-ones-6', 'one-of-ones-5'];

function OnesHang({
  work,
  isActive,
  onSelect,
  frameClass,
  caption,
  indexLabel,
}: {
  work: ExploreWork;
  isActive?: boolean;
  onSelect: (w: ExploreWork) => void;
  frameClass?: string;
  caption?: string;
  indexLabel?: string;
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

  const frame = (
      <button
        ref={frameRef}
        type="button"
        className={`${frameClass || 'ex-ones-hang-frame'}${isActive ? ' is-active' : ''}`}
        style={
          frameClass
            ? undefined
            : HANG_RATIO[work.id]
              ? { aspectRatio: HANG_RATIO[work.id] }
              : undefined
        }
        onClick={() => onSelect(work)}
        aria-label={`Look closer at ${caption || work.title}`}
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
        {indexLabel ? <em>{indexLabel}</em> : null}
        {caption ? <span>{caption}</span> : null}
      </button>
  );

  if (frameClass) return frame;
  return (
    <article className="ex-ones-hang">
      <h3 className="ex-ones-hang-title">{work.title}</h3>
      {frame}
    </article>
  );
}

function VoicesTriptych({
  works,
  activeId,
  onSelect,
}: Props) {
  const ordered = VOICES_ORDER.map((id) => works.find((w) => w.id === id)).filter(
    (w): w is ExploreWork => Boolean(w),
  );
  if (!ordered.length) return null;

  return (
    <section className="ex-voices-hang" aria-label="Voices Of Time">
      <div className="ex-section-head">
        <h2 className="ex-section-title">{BLOCK_WORK_TITLE}</h2>
      </div>
      <p className="ex-afb-will-sub">{BLOCK_BLIP}</p>
      <div className="ex-voices-row">
        {ordered.map((work, i) => {
          const panel = BLOCK_PANELS[i];
          const open = panel ? blockPanelRevealed(panel) : true;
          return (
            <OnesHang
              key={work.id}
              work={work}
              isActive={activeId === work.id}
              onSelect={onSelect}
              frameClass="ex-voices-cell"
              caption={open ? work.subtitle || work.title : 'Unrevealed'}
              indexLabel={String(i + 1).padStart(2, '0')}
            />
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

function OnesDesk({ works, activeId, onSelect }: Props) {
  const [picked, setPicked] = useState(works[0]?.id ?? '');
  const work = works.find((w) => w.id === picked) ?? works[0];
  if (!work) return null;

  return (
    <section className="ex-ones-desk" aria-label="1 of 1s">
      <div className="ex-ones-minis" role="tablist" aria-label="Choose a work">
        {works.map((item) => {
          const thumb = catalogueThumbUrl(item.coverUrl, 480) || item.coverUrl;
          const on = item.id === work.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`ex-ones-mini${on ? ' is-on' : ''}`}
              onClick={() => setPicked(item.id)}
            >
              <span className="ex-ones-mini-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" decoding="async" />
              </span>
              <span className="ex-ones-mini-name">{item.title}</span>
            </button>
          );
        })}
      </div>
      <OnesHang
        key={work.id}
        work={work}
        isActive={activeId === work.id}
        onSelect={onSelect}
      />
      <p className="ex-ones-hint">Click the frame to look closer</p>
    </section>
  );
}

export function OnesCollection({ works, activeId, onSelect }: Props) {
  const voices = works.filter((w) => VOICES_ORDER.includes(w.id));
  const rest = works.filter((w) => !VOICES_ORDER.includes(w.id));
  return (
    <>
      {rest.length ? (
        <OnesDesk works={rest} activeId={activeId} onSelect={onSelect} />
      ) : null}
      <VoicesTriptych works={voices} activeId={activeId} onSelect={onSelect} />
    </>
  );
}
