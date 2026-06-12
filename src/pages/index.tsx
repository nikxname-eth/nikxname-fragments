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
import { ManifoldConnect } from '../components/ManifoldConnect';
import { PieceMintSection } from '../components/PieceMintSection';
import { ReleasedFragmentsGallery } from '../components/ReleasedFragmentsGallery';
import { WalletButton } from '../components/WalletButton';
import { useCountdown } from '../hooks/useCountdown';
import { useSiteClock } from '../hooks/useSiteClock';
import { useManifoldWallet } from '../hooks/useManifoldWallet';
import { useOwnedFragments } from '../hooks/useOwnedFragments';
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
  const { address, shortAddress, isAuthenticated } = useManifoldWallet();

  const [entered, setEntered] = useState(false);
  const [introGone, setIntroGone] = useState(false);
  const [dark, setDark] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [projectAboutOpen, setProjectAboutOpen] = useState(false);
  const [gwei, setGwei] = useState<number | null>(null);
  const pieceSectionRef = useRef<HTMLDivElement>(null);

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

  const { owned, balance, isLoading: collectionLoading } = useOwnedFragments(address);
  const highestOwnedPiece = owned.reduce((max, fragment) => Math.max(max, fragment.pieceNumber), 0);
  const walletOwnsAny = !!address && (balance > 0 || owned.length > 0);
  const siteBanner = getSiteBanner({
    theme: dark ? 'dark' : 'light',
    highestOwnedPiece: walletOwnsAny ? highestOwnedPiece : 0,
    now,
  });
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
    setEntered(true);
    setTimeout(() => setIntroGone(true), 2000);
  };

  useEffect(() => {
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

    const delayId = window.setTimeout(start, 5_000);
    return () => {
      window.clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

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
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.85, ease: 'easeInOut' } }}
                  transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
                  onClick={handleEnter}
                  aria-label="Enter the experience"
                >
                  <div className="pz-svg">
                    <svg viewBox="2800 2150 2450 3750" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                      <defs>
                        <radialGradient id="pz-a" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#7a1424" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#7a1424" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="pz-b" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#9a1830" stopOpacity="0.65" />
                          <stop offset="100%" stopColor="#7a1424" stopOpacity="0" />
                        </radialGradient>
                        <filter id="pz-f" x="-15%" y="-15%" width="130%" height="130%">
                          <feGaussianBlur stdDeviation="60" result="b" />
                          <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <ellipse cx="4008" cy="4000" rx="950" ry="1400" fill="url(#pz-a)" />
                      <ellipse className="pz-glow" cx="4008" cy="4000" rx="1100" ry="1600" fill="url(#pz-b)" />
                      <path
                        filter="url(#pz-f)"
                        fill="rgba(230,221,208,0.08)"
                        stroke="rgba(230,221,208,0.26)"
                        strokeWidth="28"
                        strokeLinejoin="round"
                        d="M5066,2799.68 C5093.33,2799.68 5116.66,2799.67 5140,2799.68 C5144,2799.69 5148,2799.56 5152,2799.75 C5169.6,2800.56 5178.7,2809.64 5179.38,2827.31 C5179.58,2832.62 5178.86,2837.96 5178.86,2843.28 C5178.88,2902.61 5179.17,2961.94 5178.93,3021.27 C5178.8,3055.23 5177.48,3089.19 5177.3,3123.16 C5177.05,3172.49 5177.49,3221.82 5177.38,3271.15 C5177.19,3353.8 5176.84,3436.45 5176.49,3519.1 C5176.25,3575.75 5175.92,3632.41 5175.62,3689.06 C5175.6,3693.06 5175.47,3697.06 5175.57,3701.06 C5176.2,3726.72 5148.12,3734.54 5132.63,3725.56 C5123.49,3720.25 5114.98,3713.83 5106.32,3707.72 C5100.36,3703.51 5094.97,3698.4 5088.74,3694.69 C5037.73,3664.38 4982.26,3648.39 4923.15,3648.67 C4842.35,3649.05 4769.94,3675.41 4707.79,3727.24 C4634.28,3788.54 4592.1,3867.72 4581.28,3962.53 C4566.81,4089.25 4621.96,4220.41 4737.8,4293.36 C4798.91,4331.85 4866.03,4349.03 4937.98,4343.12 C5006.08,4337.52 5067.33,4312.9 5121.15,4270.41 C5125.84,4266.71 5130.43,4262.71 5135.61,4259.81 C5151.63,4250.83 5172.7,4260.51 5173.14,4280.68 C5173.62,4302.64 5175.69,4324.58 5175.7,4346.53 C5175.89,4619.19 5175.82,4891.85 5175.81,5164.5 C5175.81,5171.83 5176.16,5179.21 5175.53,5186.49 C5173.84,5206.1 5161.25,5217.93 5141.72,5218.7 C5137.06,5218.89 5132.39,5218.76 5127.72,5218.76 C4870.4,5218.77 4613.08,5218.76 4355.75,5218.82 C4337.1,5218.82 4318.44,5219.44 4299.78,5219.63 C4266.18,5219.98 4236.63,5242.25 4227.13,5274.69 C4218.66,5303.6 4226.35,5329.1 4245.77,5350.74 C4270.21,5377.97 4288.36,5408.82 4300.68,5442.89 C4332.2,5530 4323.48,5613.57 4274,5691.77 C4232.9,5756.72 4173.03,5796.97 4099.05,5816.11 C4042.61,5830.72 3985.19,5831.72 3928.72,5818.54 C3831.11,5795.77 3758.86,5739.6 3720.15,5645.83 C3689.68,5572.02 3692.07,5497.47 3724.9,5424.42 C3737.24,5396.95 3753.63,5372.15 3773.45,5349.15 C3811.78,5304.69 3794.03,5247.56 3747.38,5225.14 C3740.08,5221.63 3732.51,5219.61 3724.29,5219.59 C3706.3,5219.53 3688.31,5218.82 3670.32,5218.81 C3410.99,5218.76 3151.67,5218.77 2892.35,5218.76 C2887.02,5218.76 2881.68,5218.88 2876.35,5218.71 C2857.42,5218.09 2845.23,5207.23 2843.07,5188.44 C2842.23,5181.19 2842.56,5173.8 2842.56,5166.47 C2842.54,4986.48 2842.54,4806.48 2842.54,4626.49 C2842.54,4539.16 2842.4,4451.83 2842.63,4364.5 C2842.69,4337.86 2843.86,4311.22 2844.33,4284.57 C2844.45,4277.71 2845.53,4271.31 2849.79,4265.77 C2857.03,4256.31 2870.72,4253.51 2882.33,4259.75 C2887.55,4262.55 2892.1,4266.63 2896.81,4270.33 C2957.01,4317.6 3025.5,4344.42 3101.86,4343.8 C3229.38,4342.77 3326.53,4285.37 3392.32,4176.18 C3424.01,4123.59 3439.15,4065.37 3439.11,4004.5 C3439.06,3917.69 3411.92,3839.43 3355.57,3772.33 C3312.01,3720.47 3258.11,3683.81 3193.29,3663.91 C3100.9,3635.56 3012.81,3646.59 2929.4,3694.8 C2916.28,3702.39 2904.66,3712.58 2892.39,3721.63 C2883.89,3727.9 2874.6,3730.28 2864.12,3728.18 C2852.08,3725.76 2844.21,3717.41 2843.12,3704.95 C2842.65,3699.65 2842.82,3694.29 2842.82,3688.96 C2842.8,3650.29 2843.62,3611.61 2842.65,3572.97 C2840.35,3481.68 2841.58,3390.38 2841.17,3299.09 C2840.86,3227.77 2840.65,3156.45 2840.33,3085.14 C2839.95,2999.82 2839.83,2914.5 2838.82,2829.2 C2838.61,2811.43 2850.36,2797.83 2868.13,2799.6 C2874.73,2800.26 2881.45,2799.68 2888.12,2799.68 C3142.78,2799.68 3397.43,2799.7 3652.09,2799.64 C3672.08,2799.63 3692.07,2799.18 3712.06,2798.77 C3745.23,2798.1 3776.38,2772.3 3783.91,2739.65 C3790.26,2712.07 3782.79,2687.87 3764.59,2667.33 C3724.95,2622.55 3700.78,2570.63 3693.48,2511.59 C3685.26,2445.11 3698.86,2382.68 3735.76,2326.4 C3780.95,2257.46 3844.71,2213.33 3924.49,2194.61 C4033.59,2169.02 4134.02,2190.91 4222.23,2259.94 C4283.9,2308.21 4318.06,2373.23 4324.99,2451.7 C4332.04,2531.53 4307.8,2601.42 4257.1,2662.79 C4251.19,2669.95 4245.27,2677.38 4240.97,2685.54 C4216.65,2731.65 4243.26,2783.26 4290.28,2797.03 C4294.67,2798.31 4299.46,2798.6 4304.09,2798.71 C4323.41,2799.16 4342.73,2799.63 4362.06,2799.64 C4596.7,2799.7 4831.35,2799.68 5066,2799.68 Z"
                      />
                      <rect x="3620" y="3880" width="780" height="340" rx="60" fill="rgba(6,6,10,0.35)" />
                      <text
                        x="4008"
                        y="4060"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontFamily="Cormorant Garamond,Georgia,serif"
                        fontStyle="italic"
                        fontWeight="300"
                        fontSize="300"
                        letterSpacing="120"
                        fill="rgba(240,232,220,0.75)"
                      >
                        Enter
                      </text>
                    </svg>
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
                  <WalletButton address={address} shortAddress={shortAddress} />
                  <ManifoldConnect visible sessionActive={isAuthenticated} />
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