import { useCallback, useEffect, useRef, useState } from 'react';
import { getTheatreSource, THEATRE_PREP_MESSAGES } from '../config/artist';
import { inferMediaType } from '../lib/metadata';

const MESSAGE_INTERVAL_MS = 5_600;
const MESSAGE_FADE_MS = 1_800;
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
  const [messageVisible, setMessageVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const mediaType = source
    ? inferMediaType(playbackUrl ?? source.url, source.formatHint)
    : null;

  const reset = useCallback(() => {
    setMessageIndex(0);
    setMessageVisible(false);
    setIsReady(false);
    setShowMedia(false);
    setIsFullscreen(false);
    setVideoMuted(true);
    setPlaybackUrl(null);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!open || !source) return;
    setPlaybackUrl(source.url);
  }, [open, source]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    if (!source || !playbackUrl) return;

    let cancelled = false;

    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = playbackUrl;
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
    image.src = playbackUrl;
    image.onload = () => {
      if (!cancelled) setIsReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setIsReady(true);
    };

    return () => {
      cancelled = true;
    };
  }, [open, source, playbackUrl, mediaType, reset]);

  useEffect(() => {
    if (!open || isReady) return;

    const revealId = window.setTimeout(() => setMessageVisible(true), 520);

    const intervalId = window.setInterval(() => {
      setMessageVisible(false);
      window.setTimeout(() => {
        setMessageIndex((index) => (index + 1) % THEATRE_PREP_MESSAGES.length);
        setMessageVisible(true);
      }, MESSAGE_FADE_MS);
    }, MESSAGE_INTERVAL_MS);

    return () => {
      window.clearTimeout(revealId);
      window.clearInterval(intervalId);
    };
  }, [open, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const id = window.setTimeout(() => setShowMedia(true), 900);
    return () => window.clearTimeout(id);
  }, [isReady]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
        return;
      }
      onClose();
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !source || !playbackUrl) return null;

  const handleVideoError = () => {
    if (source.fallbackUrl && playbackUrl !== source.fallbackUrl) {
      setIsReady(false);
      setShowMedia(false);
      setPlaybackUrl(source.fallbackUrl);
    }
  };

  const toggleVideoAudio = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) video.volume = THEATRE_AUDIO_VOLUME;
    setVideoMuted(nextMuted);

    if (!nextMuted) {
      video.play().catch(() => {
        video.muted = true;
        setVideoMuted(true);
      });
    }
  };

  const toggleFullscreen = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      if (!document.fullscreenElement) {
        await stage.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* fullscreen may be blocked */
    }
  };

  const showAudioControl = mediaType === 'video' && source.hasAudio;

  return (
    <div
      className={`theatre-view theatre-view--${theme}${showMedia ? ' theatre-view--revealed' : ''}${isFullscreen ? ' theatre-view--fullscreen' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Theatre view — ${title}`}
    >
      <div className="theatre-view-veil" aria-hidden="true" />

      {!showMedia && (
        <p
          className={`theatre-view-message${messageVisible ? ' is-visible' : ''}`}
          aria-live="polite"
        >
          {THEATRE_PREP_MESSAGES[messageIndex]}
        </p>
      )}

      {showMedia && (
        <div ref={stageRef} className="theatre-view-stage">
          <div className="theatre-view-media-frame">
            {mediaType === 'video' ? (
              <video
                ref={videoRef}
                className="theatre-view-media"
                src={playbackUrl}
                autoPlay
                loop
                playsInline
                muted={videoMuted}
                onError={handleVideoError}
                aria-label={title}
              />
            ) : (
              <img
                className="theatre-view-media"
                src={playbackUrl}
                alt={title}
                decoding="async"
              />
            )}
          </div>

          {!isFullscreen && <p className="theatre-view-caption">{title}</p>}

          <div
            className={`theatre-view-controls${isFullscreen ? ' theatre-view-controls--overlay' : ''}`}
          >
            {showAudioControl && (
              <button
                type="button"
                className={`theatre-view-btn${videoMuted ? '' : ' is-on'}`}
                onClick={toggleVideoAudio}
                aria-label={videoMuted ? 'Turn sound on' : 'Turn sound off'}
                aria-pressed={!videoMuted}
              >
                {videoMuted ? 'Sound off' : 'Sound on'}
              </button>
            )}
            {!isFullscreen && (
              <button
                type="button"
                className="theatre-view-btn"
                onClick={toggleFullscreen}
                aria-label="Play full screen"
              >
                Full screen
              </button>
            )}
          </div>
        </div>
      )}

      {!isFullscreen && (
        <button type="button" className="theatre-view-close" onClick={onClose}>
          Exit
        </button>
      )}
    </div>
  );
}