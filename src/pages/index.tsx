import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  getSiteBanner,
  PREVIEW_MODE,
  SHARE_PIECES,
} from '../config/artist';
import { AboutDrawer } from '../components/AboutDrawer';
import { CollectionDrawer } from '../components/CollectionDrawer';
import { CountdownSection } from '../components/CountdownSection';
import { PieceMintSection } from '../components/PieceMintSection';
import { ProjectAboutSection } from '../components/ProjectAboutSection';
import { ReleasedFragmentsGallery } from '../components/ReleasedFragmentsGallery';
import { ShareSection } from '../components/ShareSection';
import { SiteFooter } from '../components/SiteFooter';
import { SiteNav } from '../components/SiteNav';
import { useCountdown } from '../hooks/useCountdown';
import { useDropSchedule } from '../hooks/useDropSchedule';
import { useExclusiveDrawer } from '../hooks/useExclusiveDrawer';
import { useGasPrice } from '../hooks/useGasPrice';
import { useOwnedFragments } from '../hooks/useOwnedFragments';
import { useWallet } from '../providers/WalletProvider';

export default function Home() {
  const { address } = useWallet();
  const [dark, setDark] = useState(true);
  const pieceSectionRef = useRef<HTMLDivElement>(null);
  const gwei = useGasPrice();

  const drawer = useExclusiveDrawer();
  const schedule = useDropSchedule();
  const countdown = useCountdown(schedule.countdownTarget, schedule.now);
  const collection = useOwnedFragments(address);

  const siteBanner = getSiteBanner({ theme: dark ? 'dark' : 'light' });
  const themeClass = dark ? '' : ' theme-light';
  const showContent = schedule.dropsStarted || PREVIEW_MODE;
  const releasedSharePieces = SHARE_PIECES.filter(
    (piece) => (schedule.dropsStarted || PREVIEW_MODE) && piece.number <= schedule.maxSharePiece,
  );

  useEffect(() => {
    document.body.classList.toggle('wallet-authed', !!address);
    return () => document.body.classList.remove('wallet-authed');
  }, [address]);

  const scrollToLivePiece = () => {
    drawer.closeAll();
    window.requestAnimationFrame(() => {
      pieceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <>
      <Head>
        <link rel="preload" as="image" href={siteBanner.src} />
      </Head>
      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <motion.div
        className={`site${themeClass}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <SiteNav
          dark={dark}
          onToggleTheme={() => setDark((value) => !value)}
          aboutOpen={drawer.aboutOpen}
          collectionOpen={drawer.collectionOpen}
          onToggleAbout={drawer.toggleAbout}
          onToggleCollection={drawer.toggleCollection}
        />

        <AboutDrawer
          open={drawer.aboutOpen}
          bioExpanded={drawer.bioExpanded}
          onToggleBio={() => drawer.setBioExpanded((value) => !value)}
          onScrollToLivePiece={scrollToLivePiece}
        />

        <CollectionDrawer
          open={drawer.collectionOpen}
          address={address}
          owned={collection.owned}
          balance={collection.balance}
          isLoading={collection.isLoading}
          walletOwnsAny={collection.walletOwnsAny}
        />

        <header className="hero">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Collection &nbsp;|&nbsp; A Familiar Burn
          </motion.p>
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.9 }}
          >
            Together It Blooms
          </motion.h1>
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            An on-chain art discovery experience
          </motion.p>
        </header>

        <motion.div
          className="banner-outer"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 1 }}
        >
          <div className="banner-inner">
            <img
              key={dark ? 'banner-dark' : 'banner-light'}
              src={siteBanner.src}
              alt="Together It Blooms — A Familiar Burn"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </motion.div>

        <CountdownSection
          dropsStarted={schedule.dropsStarted}
          countdownPhase={schedule.countdownPhase}
          units={countdown}
        />

        <ProjectAboutSection open={drawer.projectAboutOpen} onToggle={drawer.toggleProjectAbout} />

        <div className="divider section-divider" />

        {showContent && schedule.primaryLivePiece && (
          <PieceMintSection
            pieceNumber={schedule.primaryLivePiece}
            mode="live"
            sessionKey={address ?? 'anon'}
            sectionRef={pieceSectionRef}
          />
        )}

        {showContent && schedule.teaserPiece != null && (
          <PieceMintSection
            pieceNumber={schedule.teaserPiece}
            mode="teaser"
            sessionKey={address ?? 'anon'}
            motionDelay={0.7}
            compact
          />
        )}

        {showContent && schedule.releasedFragments.length > 0 && (
          <ReleasedFragmentsGallery pieceNumbers={schedule.releasedFragments} />
        )}

        <ShareSection
          open={drawer.shareOpen}
          onToggle={drawer.toggleShare}
          pieces={releasedSharePieces}
        />

        <SiteFooter themeClass={themeClass} gwei={gwei} />
      </motion.div>
    </>
  );
}