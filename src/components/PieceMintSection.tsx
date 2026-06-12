import { motion } from 'framer-motion';
import type { RefObject } from 'react';
import { CLAIM_INSTANCES, FRAGMENT_SITE_MEDIA, PIECE_NAMES } from '../config/artist';
import { FragmentMedia } from './FragmentMedia';
import { ManifoldBuyButton } from './ManifoldBuyButton';
import { ManifoldMintCount } from './ManifoldMintCount';

type Props = {
  pieceNumber: number;
  mode: 'live' | 'teaser';
  sessionKey: string;
  entered: boolean;
  sectionRef?: RefObject<HTMLDivElement | null>;
  motionDelay?: number;
  compact?: boolean;
};

export function PieceMintSection({
  pieceNumber,
  mode,
  sessionKey,
  entered,
  sectionRef,
  motionDelay = 1.55,
  compact = false,
}: Props) {
  const claim = CLAIM_INSTANCES[pieceNumber];
  const title = PIECE_NAMES[pieceNumber] ?? `Fragment ${pieceNumber}`;
  const media = FRAGMENT_SITE_MEDIA[pieceNumber];
  const label =
    mode === 'live'
      ? `Now available · Fragment ${String(pieceNumber).padStart(2, '0')}`
      : `Coming soon · Fragment ${String(pieceNumber).padStart(2, '0')}`;

  if (!claim) return null;

  return (
    <motion.div
      ref={sectionRef}
      className={`piece-section${compact ? ' piece-section--compact' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: motionDelay, duration: 1.1 }}
    >
      <p className="section-lbl">{label}</p>

      <div className="piece-video">
        {mode === 'live' ? (
          <FragmentMedia tokenId={pieceNumber} fallbackTitle={title} preferAudio={entered} />
        ) : (
          <>
            <img
              src={media?.teaserUrl ?? media?.posterUrl ?? media?.displayUrl}
              alt={`${title} preview`}
              className="piece-tease-img"
              loading="lazy"
              decoding="async"
            />
            <div className="piece-tease-overlay" />
            <div className="piece-shimmer" />
            <div className="piece-tease-badge">
              <span className="piece-tease-label">Opens with the next window</span>
            </div>
          </>
        )}
        <div className="piece-video-overlay" />
        <span className="piece-ghost">{String(pieceNumber).padStart(2, '0')}</span>
        <span className="piece-frag">{title}</span>
      </div>

      {mode === 'live' && (
        <div className="mint-card">
          <div className="mint-card-row">
            <div className="mint-card-meta">
              <span className="mint-card-label">Mint price</span>
              <span className="mint-card-value">{claim.mintPrice}</span>
            </div>
            <div className="mint-card-meta">
              <span className="mint-card-label">Collected</span>
              <span className="mint-card-value">
                <ManifoldMintCount instanceId={claim.instanceId} active />
              </span>
            </div>
            <div className="mint-card-meta">
              <span className="mint-card-label">Edition</span>
              <span className="mint-card-value">Open</span>
            </div>
          </div>
          <ManifoldBuyButton
            instanceId={claim.instanceId}
            active
            sessionKey={sessionKey}
          />
        </div>
      )}

      {mode === 'teaser' && (
        <div className="piece-coming-soon">
          <p className="piece-coming-soon-text">
            The grid evolves · Fragment {String(pieceNumber).padStart(2, '0')} arrives with the next
            window
          </p>
        </div>
      )}
    </motion.div>
  );
}