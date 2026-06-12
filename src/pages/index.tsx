import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BANNER_SIZES,
  CLAIM_INSTANCES,
  DROP_SCHEDULE,
  formatDropArrivalNote,
  getCountdownTarget,
  getDropWindowNote,
  getPrimaryLiveMintPiece,
  getReleasedFragments,
  getSiteBanner,
  isDropWindowOpen,
  isPhaseOneEnded,
  PIECE_NAMES,
  PREVIEW_MODE,
  PROJECT_X_ARTICLE,
  SHARE_PIECES,
} from '../config/artist';

import { PieceMintSection } from '../components/PieceMintSection';
import { ReleasedFragmentsGallery } from '../components/ReleasedFragmentsGallery';
import { ManifoldConnect } from '../components/ManifoldConnect';
import { WalletButton } from '../components/WalletButton';
import { useCountdown } from '../hooks/useCountdown';
import { useSiteClock } from '../hooks/useSiteClock';
import { useManifoldWallet } from '../hooks/useManifoldWallet';
import { useEvolvingHolder } from '../hooks/useEvolvingHolder';
import { readSiteEntered, writeSiteEntered } from '../lib/siteSession';
const ABOUT_COLLECTIONS = [
  { label: 'Together It Blooms', onSite: true },
  {
    label: 'The Void',
    href: 'https://manifold.xyz/@nikxnames-art/p/thevoid',
    external: true,
  },
  {
    label: 'Life Impressions',
    href: 'https://manifold.xyz/@nikxnames-art/p/1913617113',
    external: true,
  },
  {
    label: '1/1 Artworks',
    href: 'https://manifold.xyz/@nikxnames-art/p/nikxname1of1s',
    external: true,
  },
] as const;

export default function Home() {
  const { address, shortAddress } = useManifoldWallet();

  const [entered, setEntered] = useState(false);
  const [introGone, setIntroGone] = useState(false);

  useEffect(() => {
    const already = () =>
      readSiteEntered() ||
      document.documentElement.getAttribute('data-entered') === '1' ||
      document.body.classList.contains('site-entered');

    if (already()) {
      setEntered(true);
      setIntroGone(true);
      return;
    }

    // Listen for the vanilla gate safety net (works even if React mounts after the click)
    const onVanillaEnter = () => {
      setEntered(true);
      setTimeout(() => setIntroGone(true), 50);
    };
    window.addEventListener('nikxart:entered', onVanillaEnter);

    return () => window.removeEventListener('nikxart:entered', onVanillaEnter);
  }, []);
  const [dark, setDark] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [projectAboutOpen, setProjectAboutOpen] = useState(false);
  const [gwei, setGwei] = useState<number | null>(null);
  const pieceSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.toggle('site-entered', entered);
    return () => document.body.classList.remove('site-entered');
  }, [entered]);

  useEffect(() => {
    document.body.classList.toggle('wallet-authed', !!address);
    return () => document.body.classList.remove('wallet-authed');
  }, [address]);

  const now = useSiteClock();
  const livePieceIdx = DROP_SCHEDULE.reduce(
    (acc, item, index) => (new Date(item.startsUTC).getTime() <= now ? index : acc),
    -1,
  );
  const livePieceNumber = livePieceIdx >= 0 ? livePieceIdx + 1 : 1;
  const dropsStarted = livePieceIdx >= 0;
  const showContent = dropsStarted || PREVIEW_MODE;
  const phaseOneEnded = isPhaseOneEnded(now);
  const f2MintLive = isDropWindowOpen(2, now);
  const f2Teaser = !!CLAIM_INSTANCES[2] && !f2MintLive && !phaseOneEnded;
  const primaryLivePiece = getPrimaryLiveMintPiece(now);
  const releasedFragments = getReleasedFragments(now);
  const maxSharePiece = f2MintLive || phaseOneEnded ? 2 : livePieceNumber;

  const countdownPhase = getCountdownTarget(now);
  const countdown = useCountdown(
    countdownPhase?.endsUTC ?? (dropsStarted ? null : DROP_SCHEDULE[0].startsUTC),
  );
  const cdUnits = [
    { label: 'Days', val: countdown.d },
    { label: 'Hours', val: countdown.h },
    { label: 'Minutes', val: countdown.m },
    { label: 'Seconds', val: countdown.s },
  ];

  const {
    owned,
    balance,
    isLoading: collectionLoading,
    highestOwnedPiece,
    walletOwnsAny,
    refresh: refreshOwned,
  } = useEvolvingHolder(address);
  const siteBanner = getSiteBanner({
    theme: dark ? 'dark' : 'light',
    highestOwnedPiece: walletOwnsAny ? highestOwnedPiece : 0,
    now,
  });

  useEffect(() => {
    if (!address) return;
    void refreshOwned();
  }, [address, refreshOwned]);
  const bannerKey = `${dark ? 'dark' : 'light'}-${
    walletOwnsAny ? `own-${highestOwnedPiece}` : 'guest'
  }-${phaseOneEnded ? 'revealed' : 'base'}`;
  const themeClass = dark ? '' : ' theme-light';
  const releasedSharePieces = SHARE_PIECES.filter(
    (piece) => (dropsStarted || PREVIEW_MODE) && piece.number <= maxSharePiece,
  );

  const closeAllDrawers = () => {
    setAboutOpen(false);
    setCollectionOpen(false);
    setProjectAboutOpen(false);
    setShareOpen(false);
  };

  const scrollToLivePiece = () => {
    setAboutOpen(false);
    setCollectionOpen(false);
    window.requestAnimationFrame(() => {
      pieceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const anyDrawerOpen = aboutOpen || collectionOpen || projectAboutOpen || shareOpen;

  useEffect(() => {
    if (!anyDrawerOpen) return;

    const dropdownSelector =
      '.nav-about,.about-drawer,.nav-collection,.collection-drawer,.project-about-trigger,.project-about-drawer,.share-trigger,.share-drawer';

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (target.closest(dropdownSelector)) return;
      closeAllDrawers();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [anyDrawerOpen]);

  const handleEnter = () => {
    writeSiteEntered();
    // Also set the flags the vanilla script uses, so everything stays in sync
    try { document.documentElement.setAttribute('data-entered', '1'); } catch {}
    document.body.classList.add('site-entered');
    setEntered(true);
    // The vanilla script will have removed the DOM node; this timeout is only for the pure-React path
    setTimeout(() => setIntroGone(true), 1600);
  };

  // Gas price is only interesting once inside the experience (saves a pointless request for people who are still on the gate)
  useEffect(() => {
    if (!entered) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const fetchGas = async () => {
      try {
        const response = await fetch('https://cloudflare-eth.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
        });
        const data = await response.json();
        if (data.result) setGwei(Math.round(parseInt(data.result, 16) / 1e9));
      } catch {
        /* gas display is optional */
      }
    };

    const start = () => {
      fetchGas();
      intervalId = setInterval(fetchGas, 30_000);
    };

    const delayId = window.setTimeout(start, 4_000);
    return () => {
      window.clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [entered]);

  const bannerPreload = entered ? siteBanner : null;

  return (
    <>
      <Head>
        {bannerPreload && (
          <link
            rel="preload"
            as="image"
            href={bannerPreload.src}
            imageSrcSet={bannerPreload.srcSet}
            imageSizes={BANNER_SIZES}
          />
        )}
      </Head>
      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <AnimatePresence>
        {!introGone && (
          <motion.div
            key="intro"
            className={`intro${themeClass}`}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="ring ring-1" />
            <div className="ring ring-2" />
            <AnimatePresence>
              {!entered && (
                <motion.button
                  key="pz"
                  className="pz-btn"
                  type="button"
                  data-enter-gate
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.85, ease: 'easeInOut' } }}
                  transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
                  onClick={handleEnter}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEnter(); } }}
                  aria-label="Enter the experience — tap or press Enter"
                  title="Enter"
                >
                  <div className="pz-svg">
                    {/* External SVG — dramatically smaller initial HTML snapshot and JS bundle.
                        Full vector art is in public/enter-symbol.svg */}
                    <img
                      src="/enter-symbol.svg"
                      alt=""
                      className="enter-mark"
                      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
                    />
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {entered && (
          <motion.div
            key="site"
            className={`site${themeClass}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.9, delay: 0.3, ease: 'easeInOut' }}
          >
            <nav className="nav">
              <div className="nav-left">
                <motion.span
                  className="nav-mark"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 1 }}
                >
                  Nikxname
                </motion.span>
                <motion.button
                  className="nav-about"
                  onClick={() => {
                    setAboutOpen((open) => !open);
                    setCollectionOpen(false);
                    setProjectAboutOpen(false);
                    setShareOpen(false);
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0, duration: 1 }}
                  aria-expanded={aboutOpen}
                >
                  About
                  <svg
                    className={`nav-about-chevron${aboutOpen ? ' open' : ''}`}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </motion.button>
                <AnimatePresence>
                  {address && (
                    <motion.button
                      className="nav-collection"
                      onClick={() => {
                        setCollectionOpen((open) => !open);
                        setAboutOpen(false);
                        setProjectAboutOpen(false);
                        setShareOpen(false);
                      }}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.7 }}
                      aria-expanded={collectionOpen}
                    >
                      Collection
                      <svg
                        className={`nav-collection-chevron${collectionOpen ? ' open' : ''}`}
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <div className="nav-right">
                <motion.button
                  className={`nav-theme-toggle${themeClass}`}
                  onClick={() => setDark((value) => !value)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.9 }}
                  aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <div className="nav-theme-circle" />
                  <span className="nav-theme-label">{dark ? 'Light' : 'Dark'}</span>
                </motion.button>
                <motion.div
                  className="nav-connect"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.9 }}
                >
                  {/* Keep m-connect mounted after connect — unmounting breaks claim checkout */}
                  <ManifoldConnect visible={!address} />
                  {address && (
                    <WalletButton address={address} shortAddress={shortAddress} />
                  )}
                </motion.div>
              </div>
            </nav>

            <div className={`about-drawer${aboutOpen ? ' open' : ''}`} aria-hidden={!aboutOpen}>
              <div className="about-drawer-inner">
                <div className="about-portrait">
                  <img
                    src="https://assets.manifold.xyz/original/7185bec68793d1e8d6fd6c90cd8cb679d23647607064137598a798711958012c.jpg"
                    alt="Nikxname"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="about-text">
                  <div className="about-heading">
                    <p className="about-name">Nikxname</p>
                    <p className="about-tagline">Telling Human Stories</p>
                  </div>
                  <p className={`about-bio${bioExpanded ? ' expanded' : ''}`}>
                    Nik is a visionary digital artist whose journey in creation spans decades,
                    beginning in his youth with acrylic painting, sculpting, and intricate model
                    building. These early explorations fostered a profound, multifaceted
                    perspective — one that weaves emotional depth with documentary-like precision,
                    capturing both the chaos of existence and the quiet beauty of fleeting moments.
                    Today, he channels this into digital painting, leveraging blockchain technology
                    to immortalise the present&apos;s ephemeral essence, turning virtual brushstrokes
                    into timeless Life Impressions. At the heart of his ethos is a commitment to
                    iterative growth and stillness amid turmoil — urging creators to &quot;create more
                    than you consume.&quot; His art serves as a bridge between personal introspection
                    and communal connection.
                  </p>
                  <button className="about-read-more" onClick={() => setBioExpanded((expanded) => !expanded)}>
                    {bioExpanded ? 'Read less' : 'Read more'}
                  </button>
                  <div className="about-collections">
                    {ABOUT_COLLECTIONS.map((collection) =>
                      'onSite' in collection ? (
                        <button
                          key={collection.label}
                          type="button"
                          className="about-collection-tag"
                          onClick={scrollToLivePiece}
                        >
                          {collection.label}
                        </button>
                      ) : (
                        <a
                          key={collection.label}
                          href={'href' in collection ? collection.href : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="about-collection-tag about-collection-tag--external"
                        >
                          {collection.label}
                        </a>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className={`collection-drawer${collectionOpen ? ' open' : ''}`} aria-hidden={!collectionOpen}>
              <div className="collection-drawer-inner">
                <div className="collection-header">
                  <span className="collection-title">Your Collection</span>
                  {walletOwnsAny && (
                    <span className="collection-count">
                      {balance} fragment{balance !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {!address && (
                  <p className="collection-state">Collect a piece to connect your wallet and view what you own.</p>
                )}
                {address && collectionLoading && (
                  <p className="collection-state">Reading your collection...</p>
                )}
                {address && !collectionLoading && !walletOwnsAny && (
                  <p className="collection-state">No fragments in this wallet yet.</p>
                )}
                {walletOwnsAny && (
                  <div className="collection-grid">
                    {owned.map((fragment) => (
                      <div key={fragment.pieceNumber} className="collection-piece">
                        <span className="collection-piece-num">
                          {String(fragment.pieceNumber).padStart(2, '0')}
                        </span>
                        <span className="collection-piece-name">{fragment.title}</span>
                        {fragment.quantity > 1 && (
                          <span className="collection-qty">x{fragment.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <header className="hero">
              <motion.p
                className="eyebrow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 1 }}
              >
                Collection &nbsp;|&nbsp; A Familiar Burn
              </motion.p>
              <motion.h1
                className="hero-title"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 1.1 }}
              >
                Together It Blooms
              </motion.h1>
              <motion.p
                className="hero-sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
              >
                An on-chain art discovery experience
              </motion.p>
            </header>

            <motion.div
              className="banner-outer"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 1.2 }}
            >
              <div className="banner-inner">
                <img
                  key={bannerKey}
                  src={siteBanner.src}
                  srcSet={siteBanner.srcSet}
                  sizes={BANNER_SIZES}
                  alt="Together It Blooms — A Familiar Burn"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </motion.div>

            <motion.section
              className="cd-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.45, duration: 1 }}
            >
              {!dropsStarted ? (
                <>
                  <p className="cd-lbl">The experience begins in</p>
                  <div className="cd-row">
                    {cdUnits.map(({ label, val }, index) => (
                      <div key={label} style={{ display: 'contents' }}>
                        {index > 0 && <span className="cd-sep">·</span>}
                        <div className="cd-unit">
                          <span className="cd-num">{String(val).padStart(2, '0')}</span>
                          <span className="cd-unit-lbl">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="cd-note">{formatDropArrivalNote(DROP_SCHEDULE[0])}</p>
                </>
              ) : countdownPhase ? (
                <>
                  <p className="cd-lbl">
                    Fragment {String(countdownPhase.piece).padStart(2, '0')} closes in
                  </p>
                  <div className="cd-row">
                    {cdUnits.map(({ label, val }, index) => (
                      <div key={label} style={{ display: 'contents' }}>
                        {index > 0 && <span className="cd-sep">·</span>}
                        <div className="cd-unit">
                          <span className="cd-num">{String(val).padStart(2, '0')}</span>
                          <span className="cd-unit-lbl">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="cd-note">
                    {PIECE_NAMES[countdownPhase.piece] ?? `Fragment ${countdownPhase.piece}`} ·{' '}
                    {getDropWindowNote(countdownPhase.activeDrop)}
                  </p>
                  {phaseOneEnded && countdownPhase.piece === 2 && (
                    <p className="cd-note cd-note--phase">
                      The grid has evolved · Fragment 01 is revealed for everyone
                    </p>
                  )}
                </>
              ) : (
                <p className="cd-note" style={{ opacity: 0.45, fontSize: 'clamp(13px,1.8vw,16px)' }}>
                  The collection is complete.
                </p>
              )}
            </motion.section>

            <div style={{ padding: '0 clamp(16px,4vw,64px)' }}>
              <button
                className="project-about-trigger"
                onClick={() => {
                  setProjectAboutOpen((open) => !open);
                  setAboutOpen(false);
                  setCollectionOpen(false);
                  setShareOpen(false);
                }}
                aria-expanded={projectAboutOpen}
              >
                <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />
                <div className="project-about-inner">
                  <span style={{ fontFamily: 'var(--font)', fontStyle: 'italic' }}>About the project</span>
                  <svg
                    style={{
                      transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
                      transform: projectAboutOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      opacity: 0.5,
                    }}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />
              </button>
              <div className={`project-about-drawer${projectAboutOpen ? ' open' : ''}`}>
                <div className="project-about-content">
                  <p className="project-about-title">A Familiar Burn</p>
                  <div className="project-about-body">
                    <p>
                      A Familiar Burn is an on-chain art discovery experience — an experiment
                      designed to reward presence.
                    </p>
                    <br />
                    <p>
                      It challenges the instant-reveal culture of Web3 by unfolding as a slow burn.
                      Twenty-seven fragments are revealed one piece at a time, guided by a public
                      countdown. As one window closes, the grid evolves for everyone — and a new
                      window opens with the next piece.
                    </p>
                    <ul className="project-about-features">
                      <li>27 fragments · one living puzzle</li>
                      <li>Timed release windows · weekend &amp; 48-hour drops</li>
                      <li>On-chain collection · mint directly on site</li>
                      <li>Evolving banner · the grid grows with every piece you hold</li>
                      <li>Complete the journey · claim all 27 for eligibility on the primary work</li>
                    </ul>
                    <br />
                    <p>
                      The journey itself — showing up, waiting, discovering — is the art. Every step
                      contributes to the living collection.
                    </p>
                    <a
                      href={PROJECT_X_ARTICLE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-about-link"
                    >
                      Read more on X
                    </a>
                  </div>
                  <p className="project-about-sig">Together It Blooms · A Familiar Burn</p>
                </div>
              </div>
            </div>

            <div
              className="divider"
              style={{
                marginBottom: 'clamp(32px,5vw,60px)',
                marginTop: 'clamp(16px,3vw,32px)',
              }}
            />

            {showContent && primaryLivePiece && (
              <PieceMintSection
                pieceNumber={primaryLivePiece}
                mode="live"
                sessionKey={address ?? 'anon'}
                entered={entered}
                sectionRef={pieceSectionRef}
              />
            )}

            {showContent && f2Teaser && (
              <PieceMintSection
                pieceNumber={2}
                mode="teaser"
                sessionKey={address ?? 'anon'}
                entered={entered}
                motionDelay={1.65}
                compact
              />
            )}

            {showContent && releasedFragments.length > 0 && (
              <ReleasedFragmentsGallery pieceNumbers={releasedFragments} entered={entered} />
            )}

            <div style={{ padding: '0 clamp(16px,4vw,64px)' }}>
              <button
                className="share-trigger"
                onClick={() => {
                  setShareOpen((open) => !open);
                  setAboutOpen(false);
                  setCollectionOpen(false);
                  setProjectAboutOpen(false);
                }}
                aria-expanded={shareOpen}
              >
                <div className="share-trigger-line" />
                <div className="share-trigger-inner">
                  <span>Share the work</span>
                  <svg
                    className={`share-chevron${shareOpen ? ' open' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div className="share-trigger-line" />
              </button>
              <div className={`share-drawer${shareOpen ? ' open' : ''}`} aria-hidden={!shareOpen}>
                <div className="share-drawer-inner">
                  <p className="share-intro">
                    Download optimised files for sharing on Instagram, X, or sending to a friend.
                  </p>
                  {releasedSharePieces.length === 0 ? (
                    <p className="share-empty">Assets will appear here as pieces are released.</p>
                  ) : (
                    <div className="share-tags">
                      {releasedSharePieces.map((piece) => (
                        <a
                          key={piece.number}
                          href={piece.downloadUrl}
                          download={piece.downloadName}
                          className="share-tag"
                        >
                          <span>{piece.label}</span>
                          <span className="share-tag-hint">click here</span>
                          <svg
                            className="share-tag-icon"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M12 3v12M12 15l4-4M12 15L8 11"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <footer className={`footer${themeClass}`}>
              <span className="footer-copy">© 2026 Nikxname</span>
              <div className="footer-right">
                <a
                  href="https://manifold.xyz/@nikxnames-art"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  Manifold
                </a>
                {gwei !== null ? (
                  <a
                    href="https://etherscan.io/gastracker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-gwei"
                    style={{ textDecoration: 'none' }}
                    title={`Gas: ${gwei} gwei`}
                  >
                    <span className={`footer-gwei-dot ${gwei < 15 ? 'low' : gwei < 40 ? 'mid' : 'high'}`} />
                    <span className="footer-gwei-text">{gwei} gwei</span>
                  </a>
                ) : (
                  <a
                    href="https://etherscan.io/gastracker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    Ethereum
                  </a>
                )}
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}