import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FINAL_FRAGMENT_PIECE,
  FRAGMENT_27_REVEAL,
  getSiteBanner,
  isFinalFragmentLive,
} from '../config/artist';
import { MINT_COMPLETE_EVENT, type MintCompleteDetail } from '../lib/mintEvents';

type Props = {
  theme: 'dark' | 'light';
  now: number;
  /** True when connected wallet already holds Fragment 27 */
  ownsFinalFragment?: boolean;
  onMediaLoad?: () => void;
};

function readStoredReveal(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(FRAGMENT_27_REVEAL.storageKey) === '1';
  } catch {
    return false;
  }
}

function writeStoredReveal(): void {
  try {
    window.localStorage.setItem(FRAGMENT_27_REVEAL.storageKey, '1');
  } catch {
    /* private mode */
  }
}

/**
 * Hero banner.
 * Default: live-window theme media.
 * F27: canvas state No.26 still until claim → BannerGrid-*-last.gif.
 */
export function HeroBanner({ theme, now, ownsFinalFragment, onMediaLoad }: Props) {
  const finalLive = isFinalFragmentLive(now);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!finalLive) {
      setRevealed(false);
      return;
    }
    if (ownsFinalFragment || readStoredReveal()) {
      setRevealed(true);
    }
  }, [finalLive, ownsFinalFragment]);

  useEffect(() => {
    if (!finalLive) return;

    const onMint = (event: Event) => {
      const detail = (event as CustomEvent<MintCompleteDetail>).detail;
      if (detail?.pieceNumber != null && detail.pieceNumber !== FINAL_FRAGMENT_PIECE) return;
      writeStoredReveal();
      setRevealed(true);
    };

    window.addEventListener(MINT_COMPLETE_EVENT, onMint);
    return () => window.removeEventListener(MINT_COMPLETE_EVENT, onMint);
  }, [finalLive]);

  const markRevealed = useCallback(() => {
    writeStoredReveal();
    setRevealed(true);
  }, []);

  useEffect(() => {
    if (finalLive && ownsFinalFragment) markRevealed();
  }, [finalLive, ownsFinalFragment, markRevealed]);

  const banner = getSiteBanner({
    theme,
    now,
    revealed: finalLive ? revealed : false,
  });

  // Pre-claim F27: canvasstatedark/light-26.jpg (2500×1266). Post-claim: F27 GIF (1920×1080).
  const useF27Motion = finalLive && revealed;
  const useF27Still = finalLive && !revealed;

  return (
    <motion.div
      className="banner-outer"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 1 }}
    >
      <div
        className={[
          'banner-inner',
          useF27Motion ? 'banner-inner--16x9' : '',
          useF27Still ? 'banner-inner--canvas26' : '',
          useF27Motion ? 'is-revealed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <img
          key={`banner-${theme}-${banner.piece}-${revealed ? 'live' : 'still'}`}
          className="banner-media"
          src={banner.src}
          alt="Together It Blooms — A Familiar Burn"
          width={useF27Motion ? 1920 : 2500}
          height={useF27Motion ? 1080 : 1266}
          sizes="(max-width: 1528px) 100vw, 1528px"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={onMediaLoad}
        />
      </div>

      {finalLive && (
        <div className="banner-finale" aria-live="polite">
          <p className="banner-finale-claim">{FRAGMENT_27_REVEAL.claimNote}</p>
          <div className="banner-finale-reminder">
            {FRAGMENT_27_REVEAL.reminderLines.map((line, i) =>
              line ? (
                <p key={`${i}-${line}`}>{line}</p>
              ) : (
                <p key={`sp-${i}`} className="banner-finale-gap" aria-hidden>
                  &nbsp;
                </p>
              ),
            )}
          </div>
          {revealed ? (
            <p className="banner-finale-status">Your claim unlocked the living banner.</p>
          ) : (
            <p className="banner-finale-status">{FRAGMENT_27_REVEAL.claimCta}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
