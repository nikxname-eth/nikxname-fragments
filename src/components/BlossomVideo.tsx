/**
 * Blossom animated sequence: prefer 11K, fall back to 4K on error / load stall.
 * Counts full plays, then calls onComplete so the finale can evolve to still + claim.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANIMATE_LOOP_COUNT,
  BLOSSOM_ANIMATE_SOURCES,
  BLOSSOM_MEDIA,
} from '../config/finale';

type Props = {
  className?: string;
  /** Full cinematic playthrough (no chrome). */
  cinematic?: boolean;
  /** Banner / claim preview: loop muted with controls. */
  preview?: boolean;
  loopCount?: number;
  onComplete?: () => void;
  onPlayIndex?: (index: number, total: number) => void;
};

export function BlossomVideo({
  className = '',
  cinematic = false,
  preview = false,
  loopCount = ANIMATE_LOOP_COUNT,
  onComplete,
  onPlayIndex,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const playsRef = useRef(0);
  const completedRef = useRef(false);
  const fallbackTried = useRef(false);

  const src = BLOSSOM_ANIMATE_SOURCES[sourceIndex] ?? BLOSSOM_MEDIA.animate4k;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  const dropToBackup = useCallback(() => {
    if (fallbackTried.current) return false;
    if (sourceIndex >= BLOSSOM_ANIMATE_SOURCES.length - 1) return false;
    fallbackTried.current = true;
    setSourceIndex((i) => Math.min(i + 1, BLOSSOM_ANIMATE_SOURCES.length - 1));
    return true;
  }, [sourceIndex]);

  const onEnded = useCallback(() => {
    if (preview) return;
    playsRef.current += 1;
    const n = playsRef.current;
    if (n >= loopCount) {
      onPlayIndex?.(loopCount, loopCount);
      finish();
      return;
    }
    onPlayIndex?.(n + 1, loopCount);
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => finish());
    }
  }, [finish, loopCount, onPlayIndex, preview]);

  const onError = useCallback(() => {
    if (dropToBackup()) return;
    if (!preview) finish();
  }, [dropToBackup, finish, preview]);

  // Load + play whenever source changes (initial 11K or 4K fallback)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;
    v.load();

    const start = () => {
      if (cancelled) return;
      if (!preview && playsRef.current === 0) {
        onPlayIndex?.(1, loopCount);
      }
      void v.play().catch(() => {
        if (cancelled || preview) return;
        if (!dropToBackup()) finish();
      });
    };

    if (v.readyState >= 2) start();
    else v.addEventListener('loadeddata', start, { once: true });

    const stall = window.setTimeout(() => {
      if (cancelled) return;
      if (v.readyState < 2 && !fallbackTried.current) {
        if (!dropToBackup() && !preview) finish();
      }
    }, 14_000);

    return () => {
      cancelled = true;
      window.clearTimeout(stall);
      v.removeEventListener('loadeddata', start);
    };
  }, [src, preview, loopCount, onPlayIndex, dropToBackup, finish]);

  return (
    <div className={`finale-video-wrap ${className}`.trim()}>
      <video
        ref={videoRef}
        key={src}
        className="finale-video"
        src={src}
        poster={BLOSSOM_MEDIA.cover}
        playsInline
        preload="auto"
        controls={preview || !cinematic}
        muted={preview}
        loop={preview}
        autoPlay
        onEnded={onEnded}
        onError={onError}
      />
      {cinematic && (
        <span
          className={`finale-video-quality${sourceIndex === 0 ? ' finale-video-quality--hi' : ''}`}
          aria-hidden
        >
          {sourceIndex === 0 ? 'Max res' : '4K'}
        </span>
      )}
    </div>
  );
}
