import { useEffect, useRef, useState } from 'react';
import { useTokenMetadata } from '../hooks/useTokenMetadata';

/** Playback level when sound is on — present but not overpowering. */
const PIECE_AUDIO_VOLUME = 0.38;

type Props = {
  tokenId: number;
  fallbackTitle: string;
  /** User has entered the site — safe to attempt unmuted playback after their click. */
  preferAudio?: boolean;
};

export function FragmentMedia({ tokenId, fallbackTitle, preferAudio }: Props) {
  const { metadata, isLoading, error } = useTokenMetadata(tokenId);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !metadata || metadata.mediaType !== 'video') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [metadata]);

  useEffect(() => {
    if (!preferAudio || !metadata?.hasAudio || !shouldLoadVideo) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = PIECE_AUDIO_VOLUME;
    video
      .play()
      .then(() => setMuted(false))
      .catch(() => {
        video.muted = true;
        setMuted(true);
      });
  }, [preferAudio, metadata?.hasAudio, metadata?.mediaUrl, shouldLoadVideo]);

  const toggleAudio = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) video.volume = PIECE_AUDIO_VOLUME;
    setMuted(nextMuted);

    if (!nextMuted) {
      video.play().catch(() => {
        video.muted = true;
        setMuted(true);
      });
    }
  };

  if (isLoading) {
    return <div className="piece-media-loading" aria-label="Loading artwork from chain" />;
  }

  if (error || !metadata) {
    return (
      <div className="piece-media-error" role="status">
        Unable to load on-chain artwork
      </div>
    );
  }

  const alt = metadata.name || fallbackTitle;

  if (metadata.mediaType === 'video') {
    return (
      <div ref={rootRef} className="piece-media-frame">
        {shouldLoadVideo ? (
          <video
            ref={videoRef}
            src={metadata.mediaUrl}
            poster={metadata.posterUrl}
            autoPlay
            loop
            muted={muted}
            playsInline
            preload="metadata"
            aria-label={alt}
          />
        ) : (
          <img
            src={metadata.posterUrl ?? metadata.mediaUrl}
            alt={alt}
            loading="lazy"
            decoding="async"
          />
        )}
        {metadata.hasAudio && shouldLoadVideo && (
          <button
            type="button"
            className={`piece-audio-toggle${muted ? '' : ' is-on'}`}
            onClick={toggleAudio}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            aria-pressed={!muted}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {muted ? (
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
    );
  }

  return (
    <img
      src={metadata.mediaUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}