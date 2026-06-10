import { useCallback, useEffect, useRef, useState } from 'react';
import { getTheatreSource, THEATRE_PREP_MESSAGES } from '../config/artist';
import { inferMediaType } from '../lib/metadata';

const MESSAGE_INTERVAL_MS = 2_800;
const THEATRE_AUDIO_VOLUME = 0.42;

type Props = {
  open: boolean;
  onClose: () => void;
  tokenId: number;
  title: string;
  theme: 'dark' | 'light';
};

export function TheatreView({ open, onClose, tokenId, title, theme }: Props) {
  const source = getTheatreSource(tokenId);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaType = source
    ? inferMediaType(source.url, source.formatHint)
    : null;

  const reset = useCallback(() => {
    setMessageIndex(0);
    setIsReady(false);
    setShowMedia(false);
    setVideoMuted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    if (!source) return;

    let cancelled = false;

    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = source.url;
      video.muted = true;
      video.playsInline = true;

      const onReady = () => {
        if (!cancelled) setIsReady(true);
      };

      video.addEventListener('canplaythrough', onReady, { once: true });
      video.addEventListener('loadeddata', onReady, { once: true });
      video.load();

      return () => {
        cancelled = true;
        video.removeAttribute('src');
        video.load();
      };
    }

    const image = new Image();
    image.decoding = 'async';
    image.src = source.url;
    image.onload = () => {
      if (!cancelled) setIsReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setIsReady(true);
    };

    return () => {
      cancelled = true;
    };
  }, [open, source, mediaType, reset]);

  useEffect(() => {
    if (!open || isReady) return;

    const id = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % THEATRE_PREP_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [open, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const id = window.setTimeout(() => setShowMedia(true), 480);
    return () => window.clearTimeout(id);
  }, [isReady]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !source) return null;

  const toggleVideoAudio = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) video.volume = THEATRE_AUDIO_VOLUME;
    setVideoMuted(nextMuted);
  };

  return (
    <div
      className={`theatre-view theatre-view--${theme}${showMedia ? ' theatre-view--revealed' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Theatre view — ${title}`}
    >
      <div className="theatre-view-veil" aria-hidden="true" />

      {!showMedia && (
        <p className="theatre-view-message" key={messageIndex}>
          {THEATRE_PREP_MESSAGES[messageIndex]}
        </p>
      )}

      {showMedia && (
        <div className="theatre-view-stage">
          {mediaType === 'video' ? (
            <video
              ref={videoRef}
              className="theatre-view-media"
              src={source.url}
              autoPlay
              loop
              playsInline
              muted={videoMuted}
              aria-label={title}
            />
          ) : (
            <img
              className="theatre-view-media"
              src={source.url}
              alt={title}
              decoding="async"
            />
          )}
          <p className="theatre-view-caption">{title}</p>
          {mediaType === 'video' && (
            <button
              type="button"
              className={`theatre-view-audio${videoMuted ? '' : ' is-on'}`}
              onClick={toggleVideoAudio}
              aria-label={videoMuted ? 'Turn sound on' : 'Turn sound off'}
              aria-pressed={!videoMuted}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {videoMuted ? (
                  <>
                    <path
                      d="M11 5L6 9H3v6h3l5 4V5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 9l5 5M21 9l-5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M11 5L6 9H3v6h3l5 4V5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.5 9.5a4.5 4.5 0 010 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>
      )}

      <button type="button" className="theatre-view-close" onClick={onClose}>
        Exit
      </button>
    </div>
  );
}