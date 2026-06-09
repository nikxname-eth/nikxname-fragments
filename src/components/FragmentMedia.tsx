import { useEffect, useRef, useState } from 'react';
import { useTokenMetadata } from '../hooks/useTokenMetadata';

type Props = {
  tokenId: number;
  fallbackTitle: string;
  /** User has entered the site — safe to attempt unmuted playback after their click. */
  preferAudio?: boolean;
};

export function FragmentMedia({ tokenId, fallbackTitle, preferAudio }: Props) {
  const { metadata, isLoading, error } = useTokenMetadata(tokenId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!preferAudio || !metadata?.hasAudio) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video
      .play()
      .then(() => setMuted(false))
      .catch(() => {
        video.muted = true;
        setMuted(true);
      });
  }, [preferAudio, metadata?.hasAudio, metadata?.mediaUrl]);

  const toggleAudio = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
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
      <>
        <video
          ref={videoRef}
          src={metadata.mediaUrl}
          poster={metadata.posterUrl}
          autoPlay
          loop
          muted={muted}
          playsInline
          preload="auto"
          aria-label={alt}
        />
        {metadata.hasAudio && (
          <button
            type="button"
            className="piece-audio-toggle"
            onClick={toggleAudio}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            aria-pressed={!muted}
          >
            {muted ? 'Sound on' : 'Sound off'}
          </button>
        )}
      </>
    );
  }

  return (
    <img
      src={metadata.mediaUrl}
      alt={alt}
      loading="eager"
      decoding="async"
    />
  );
}