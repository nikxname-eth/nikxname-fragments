import { useEffect, useRef } from 'react';
import type { ExploreWork } from '../config/catalog';
import { CanvasLook } from './CanvasLook';
import { lookingGifUrl, lookingMotionKind, lookingStillUrl, lookingVideoUrl } from '../lib/lookingStill';
import { observeStillUrl } from '../lib/mediaUrl';

type Props = {
  work: ExploreWork;
  onClose: () => void;
};

export function LookingStage({ work, onClose }: Props) {
  const kind = lookingMotionKind(work);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const play = () => {
      void el.play().catch(() => {
        /* Samsung autoplay is muted-only and flaky */
      });
    };
    play();
  }, [work.id]);

  if (kind === 'video') {
    const src = lookingVideoUrl(work);
    return (
      <div className="ex-looking-stage" role="dialog" aria-modal="true" aria-label={work.title}>
        <div className="ex-looking-stage-bar">
          <p className="ex-looking-stage-title">{work.title}</p>
          <button type="button" className="ex-looking-hit" onClick={onClose}>
            Back
          </button>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="ex-looking-video"
          src={src || undefined}
          poster={lookingStillUrl(work) || undefined}
          playsInline
          muted
          loop
          autoPlay
        />
      </div>
    );
  }

  if (kind === 'gif') {
    const src = lookingGifUrl(work);
    return (
      <div className="ex-looking-stage" role="dialog" aria-modal="true" aria-label={work.title}>
        <div className="ex-looking-stage-bar">
          <p className="ex-looking-stage-title">{work.title}</p>
          <button type="button" className="ex-looking-hit" onClick={onClose}>
            Back
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ex-looking-gif" src={src || ''} alt={work.title} />
      </div>
    );
  }

  return (
    <CanvasLook
      src={observeStillUrl(work) || lookingStillUrl(work)}
      alt={work.title}
      title={work.title}
      onClose={onClose}
      hint="F Fit · 1 true size · arrows move · Esc back"
    />
  );
}
