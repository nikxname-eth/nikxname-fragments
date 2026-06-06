import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================================
// BANNER IMAGES
// =====================================================================
// Dark mode banner — Cloudflare Image Resizing, same approach.
// ✏️  Swap just the base filename when updating the dark banner.
const BANNER_DARK = {
  src:    'https://assets.nikxart.xyz/Banner-Medium.jpg?width=1400&quality=85&format=auto',
  srcSet: [
    'https://assets.nikxart.xyz/Banner-Min.jpg?width=640&quality=85&format=auto 640w',
    'https://assets.nikxart.xyz/Banner-Small.jpg?width=960&quality=85&format=auto 960w',
    'https://assets.nikxart.xyz/Banner-Medium.jpg?width=1400&quality=85&format=auto 1400w',
  ].join(', '),
};

// Light mode banner — Cloudflare Image Resizing handles all sizes automatically.
// The 2500px master on R2 is resized on the fly and cached at Cloudflare's edge.
// ✏️  Only this one URL needs updating if you change the light banner image.
const BANNER_LIGHT = {
  src:    'https://assets.nikxart.xyz/main_grid_light_2500px.jpg?width=1400&quality=85&format=auto',
  srcSet: [
    'https://assets.nikxart.xyz/main_grid_light_2500px.jpg?width=640&quality=85&format=auto 640w',
    'https://assets.nikxart.xyz/main_grid_light_2500px.jpg?width=960&quality=85&format=auto 960w',
    'https://assets.nikxart.xyz/main_grid_light_2500px.jpg?width=1400&quality=85&format=auto 1400w',
  ].join(', '),
};

// Shared sizes hint — tells browser the image renders at max 1400px
// regardless of screen width (due to our max-width cap on the container)
const BANNER_SIZES = '(max-width: 680px) calc(100vw - 32px), (max-width: 1100px) calc(100vw - 64px), 1400px';

// Current piece - update every drop
const CURRENT_PIECE = {
  number:    1,
  title:     'Fragment I',
  // ✏️  Placeholder image until the real piece is ready.
  // Upload PuzzlePc-PH01.jpg to your Cloudflare R2 bucket, then swap this URL.
  // Change mediaType to 'video' and update the URL when you have the final MP4.
  mediaUrl:  'https://assets.nikxart.xyz/PuzzlePc-PH01.jpg',
  mediaType: 'image' as 'video' | 'image',
  instanceId:  '3821601009',
  manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/3821601009',
};

// Drop schedule - UTC (EST = UTC-5, so 10am EST = 15:00 UTC)
const DROP_SCHEDULE: { piece: number; startsUTC: string }[] = [
  { piece: 1,  startsUTC: '2026-06-08T15:00:00Z' },
  { piece: 2,  startsUTC: '2026-06-12T15:00:00Z' },
  { piece: 3,  startsUTC: '2026-06-15T15:00:00Z' },
  { piece: 4,  startsUTC: '2026-06-17T15:00:00Z' },
  { piece: 5,  startsUTC: '2026-06-19T15:00:00Z' },
  { piece: 6,  startsUTC: '2026-06-22T15:00:00Z' },
  { piece: 7,  startsUTC: '2026-06-24T15:00:00Z' },
  { piece: 8,  startsUTC: '2026-06-26T15:00:00Z' },
  { piece: 9,  startsUTC: '2026-06-29T15:00:00Z' },
  { piece: 10, startsUTC: '2026-07-01T15:00:00Z' },
  { piece: 11, startsUTC: '2026-07-03T15:00:00Z' },
  { piece: 12, startsUTC: '2026-07-07T15:00:00Z' },
  { piece: 13, startsUTC: '2026-07-09T15:00:00Z' },
  { piece: 14, startsUTC: '2026-07-11T15:00:00Z' },
  { piece: 15, startsUTC: '2026-07-13T15:00:00Z' },
  { piece: 16, startsUTC: '2026-07-15T15:00:00Z' },
  { piece: 17, startsUTC: '2026-07-17T15:00:00Z' },
  { piece: 18, startsUTC: '2026-07-20T15:00:00Z' },
  { piece: 19, startsUTC: '2026-07-22T15:00:00Z' },
  { piece: 20, startsUTC: '2026-07-24T15:00:00Z' },
  { piece: 21, startsUTC: '2026-07-27T15:00:00Z' },
  { piece: 22, startsUTC: '2026-07-29T15:00:00Z' },
  { piece: 23, startsUTC: '2026-07-31T15:00:00Z' },
  { piece: 24, startsUTC: '2026-08-03T15:00:00Z' },
  { piece: 25, startsUTC: '2026-08-05T15:00:00Z' },
  { piece: 26, startsUTC: '2026-08-07T15:00:00Z' },
  { piece: 27, startsUTC: '2026-08-10T15:00:00Z' },
];

// Set to false on launch day (Jun 8) to hide content before drops begin
const PREVIEW_MODE = true;

// Share assets - add entries as pieces are released
const SHARE_PIECES: { number: number; label: string; thumbUrl: string; downloadUrl: string }[] = [];

// Your deployed Manifold ERC1155 contract on Ethereum mainnet
// Verified: https://etherscan.io/address/0x1641b09e11d19e6f6b9f80273158f9da28555593
// First mint: Sunday June 8 — balanceOfBatch returns 0 for all tokens until then (safe)
const CONTRACT_ADDRESS = '0x1641b09e11d19e6f6b9f80273158f9da28555593' as `0x${string}`;
const TOKEN_IDS = Array.from({ length: 27 }, (_, i) => BigInt(i + 1));

const PIECE_NAMES: Record<number, string> = {
  1:'Fragment I', 2:'Fragment II', 3:'Fragment III', 4:'Fragment IV',
  5:'Fragment V', 6:'Fragment VI', 7:'Fragment VII', 8:'Fragment VIII',
  9:'Fragment IX', 10:'Fragment X', 11:'Fragment XI', 12:'Fragment XII',
  13:'Fragment XIII', 14:'Fragment XIV', 15:'Fragment XV', 16:'Fragment XVI',
  17:'Fragment XVII', 18:'Fragment XVIII', 19:'Fragment XIX', 20:'Fragment XX',
  21:'Fragment XXI', 22:'Fragment XXII', 23:'Fragment XXIII', 24:'Fragment XXIV',
  25:'Fragment XXV', 26:'Fragment XXVI', 27:'Fragment XXVII',
};

const ERC1155_ABI = [
  {
    name: 'balanceOfBatch',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids',      type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'totalSupply',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// =====================================================================

function useCountdown(targetUTC: string | null) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, done: false });
  useEffect(() => {
    if (!targetUTC) { setT(prev => ({ ...prev, done: true })); return; }
    const end = new Date(targetUTC).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0, done: true }); return; }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetUTC]);
  return t;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [entered, setEntered]               = useState(false);
  const [introGone, setIntroGone]           = useState(false);
  const [walletVisible, setWalletVisible]   = useState(false);
  const [dark, setDark]                     = useState(true);
  const [shareOpen, setShareOpen]           = useState(false);
  const [aboutOpen, setAboutOpen]           = useState(false);
  const [bioExpanded, setBioExpanded]       = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [gwei, setGwei]                     = useState<number | null>(null);
  const [toast, setToast]                   = useState<string | null>(null);
  const [pieceVisible, setPieceVisible]     = useState(false);

  const manifoldRef    = useRef<HTMLDivElement>(null);
  const widgetInjected = useRef(false);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const toastTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchGas = async () => {
      try {
        const r = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken');
        const d = await r.json();
        if (d.status === '1') setGwei(Number(d.result.SafeGasPrice));
      } catch {}
    };
    fetchGas();
    const id = setInterval(fetchGas, 30000);
    return () => clearInterval(id);
  }, []);

  const now          = Date.now();
  const livePieceIdx = DROP_SCHEDULE.reduce((acc, item, i) =>
    new Date(item.startsUTC).getTime() <= now ? i : acc, -1);
  const dropsStarted = livePieceIdx >= 0;
  const nextDropTime = livePieceIdx < DROP_SCHEDULE.length - 1
    ? DROP_SCHEDULE[livePieceIdx + 1].startsUTC : null;
  const showContent  = dropsStarted || PREVIEW_MODE;

  const countdown = useCountdown(dropsStarted ? nextDropTime : DROP_SCHEDULE[0].startsUTC);
  const cdUnits = [
    { label: 'Days',    val: countdown.d },
    { label: 'Hours',   val: countdown.h },
    { label: 'Minutes', val: countdown.m },
    { label: 'Seconds', val: countdown.s },
  ];

  const batchAddresses = useMemo(
    () => address ? Array(27).fill(address) as `0x${string}`[] : undefined,
    [address]
  );

  const { data: rawBalances, isLoading: balancesLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ERC1155_ABI,
    functionName: 'balanceOfBatch',
    args: batchAddresses ? [batchAddresses, TOKEN_IDS] : undefined,
    query: {
      enabled: !!address && isConnected,
      staleTime: 30000,
    },
  });

  const ownedPieces = useMemo(() => {
    if (!rawBalances) return [];
    return (rawBalances as readonly bigint[])
      .map((qty, i) => ({ tokenId: i + 1, qty: Number(qty) }))
      .filter(p => p.qty > 0);
  }, [rawBalances]);

  useEffect(() => {
    if (!entered) return;
    setWalletVisible(true);
  }, [entered]);

  useEffect(() => {
    if (!showContent || widgetInjected.current) return;
    const id = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!manifoldRef.current || widgetInjected.current) return;
          widgetInjected.current = true;
          const el = document.createElement('div');
          el.setAttribute('data-widget', 'm-claim-complete');
          el.setAttribute('data-id', CURRENT_PIECE.instanceId);
          manifoldRef.current.appendChild(el);
          requestAnimationFrame(() => {
            window.dispatchEvent(new Event('m-refresh-widgets'));
          });
        });
      });
    }, 800);
    return () => clearTimeout(id);
  }, [showContent]);

  const handleEnter = () => {
    setEntered(true);
    setTimeout(() => setIntroGone(true), 2000);
  };

  const themeClass = dark ? '' : ' theme-light';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:        #06060a;
          --surface:   #0c0c13;
          --red:       #7a1424;
          --red-glow:  rgba(122,20,36,0.18);
          --blue-glow: rgba(10,18,72,0.24);
          --cream:     #f0e8dc;
          --cream-dim: rgba(240,232,220,0.82);
          --silver:    rgba(220,210,198,0.75);
          --border:    rgba(200,188,170,0.11);
          --font:      'Cormorant Garamond', Georgia, serif;
          --transition-theme: background 0.55s ease, color 0.55s ease, border-color 0.55s ease;
        }
        html, body { background: var(--bg); color: var(--cream); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
        body::before {
          content: ''; position: fixed; inset: 0; z-index: 0;
          pointer-events: none; mix-blend-mode: screen; opacity: 0.033;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E");
        }
        .glow { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
        .glow-r { top:-28vw; right:-14vw; width:68vw; height:68vw; background: radial-gradient(circle, var(--red-glow) 0%, transparent 68%); }
        .glow-b { bottom:-22vw; left:-12vw; width:60vw; height:60vw; background: radial-gradient(circle, var(--blue-glow) 0%, transparent 68%); }

        .theme-light { --bg:#d9d0c8; --surface:#cfc5bc; --red:#6b1020; --red-glow:rgba(107,16,32,0.11); --blue-glow:rgba(8,14,55,0.04); --cream:#16110d; --cream-dim:rgba(22,17,13,0.72); --silver:rgba(40,28,20,0.62); --border:rgba(40,28,20,0.12); }
        .theme-light .nav { background: rgba(212,203,196,0.85); }
        .theme-light .manifold-wrap, .theme-light .manifold-wrap div, .theme-light .manifold-wrap m-claim-complete { background: #0f0d16 !important; color: #e6ddd0 !important; }
        .theme-light .piece-video { box-shadow: 0 24px 64px rgba(28,21,16,0.18), 0 2px 8px rgba(28,21,16,0.08); }
        .theme-light .divider { background: linear-gradient(90deg, transparent, rgba(107,16,32,0.3), transparent); }

        .intro { position: fixed; inset: 0; z-index: 200; background: var(--bg); display: flex; align-items: center; justify-content: center; transition: background 0.55s ease; }
        @keyframes pulse-ring { 0%,100% { transform: scale(0.97); opacity: 0.07; } 50% { transform: scale(1.03); opacity: 0.15; } }
        @keyframes pulse-ring-outer { 0%,100% { transform: scale(0.95); opacity: 0.035; } 50% { transform: scale(1.05); opacity: 0.08; } }
        .ring { position: absolute; border-radius: 50%; border: 1px solid var(--cream); pointer-events: none; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .ring-1 { width:clamp(260px,40vw,440px); height:clamp(260px,40vw,440px); animation: pulse-ring 3.8s infinite; }
        .ring-2 { width:clamp(360px,56vw,600px); height:clamp(360px,56vw,600px); animation: pulse-ring-outer 3.8s 0.9s infinite; }
        .pz-btn { position: relative; z-index: 2; cursor: pointer; background: none; border: none; outline: none; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 0; transition: transform 0.55s cubic-bezier(0.34,1.56,0.64,1); }
        .pz-btn:hover { transform: scale(1.07); }
        .pz-svg { width: clamp(96px, 13vw, 140px); display: flex; align-items: center; justify-content: center; }
        .pz-svg svg { width: 100%; height: auto; overflow: visible; }
        .pz-glow { opacity: 0; transition: opacity 0.5s; }
        .pz-btn:hover .pz-glow { opacity: 1; }
        .pz-text { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(11px,1.4vw,13px); letter-spacing: 0.44em; text-transform: uppercase; color: var(--cream-dim); transition: color 0.5s, letter-spacing 0.5s; }
        .pz-btn:hover .pz-text { color: var(--cream); letter-spacing: 0.54em; }

        .site { position: relative; z-index: 1; min-height: 100svh; background: var(--bg); transition: background 0.55s ease; }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(20px,3vw,36px); height: 52px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50; background: rgba(6,6,10,0.75); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); will-change: transform; transition: background 0.55s ease, border-color 0.55s ease; }
        .theme-light .nav { background: rgba(237,230,220,0.82); }
        .nav-mark { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(14px,1.8vw,17px); letter-spacing: 0.28em; text-transform: uppercase; color: var(--cream); opacity: 0.72; transition: color 0.5s, opacity 0.5s; }
        .nav-about, .nav-collection { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(12px,1.4vw,14px); letter-spacing: 0.26em; text-transform: uppercase; color: var(--cream); opacity: 0.62; background: none; border: none; cursor: pointer; padding: 0; transition: opacity 0.3s; display: flex; align-items: center; gap: 6px; }
        .nav-about:hover, .nav-collection:hover { opacity: 1; }
        .nav-about-chevron, .nav-collection-chevron { transition: transform 0.45s cubic-bezier(0.34,1.56,0.64,1); opacity: 0.5; }
        .nav-about-chevron.open, .nav-collection-chevron.open { transform: rotate(180deg); }
        .nav-connect button, .nav-connect [data-testid="rk-connect-button"] { background: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; height: auto !important; border-radius: 0 !important; font-family: var(--font) !important; font-style: italic !important; font-weight: 300 !important; font-size: clamp(11px,1.4vw,13px) !important; letter-spacing: 0.28em !important; text-transform: uppercase !important; color: var(--cream) !important; opacity: 0.85; cursor: pointer !important; transition: opacity 0.3s, color 0.5s !important; }
        .nav-connect button:hover, .nav-connect [data-testid="rk-connect-button"]:hover { opacity: 1 !important; background: none !important; }
        .nav-connect [data-testid="rk-account-button"] { background: none !important; border: none !important; box-shadow: none !important; font-family: var(--font) !important; font-style: italic !important; font-size: clamp(11px,1.4vw,13px) !important; letter-spacing: 0.18em !important; color: var(--cream) !important; opacity: 0.85; padding: 0 !important; transition: opacity 0.3s, color 0.5s !important; }
        .nav-connect [data-testid="rk-account-button"]:hover { opacity: 1 !important; background: none !important; }
        .nav-center { display: flex; align-items: center; gap: clamp(16px,3vw,40px); }
        .nav-right { display: flex; align-items: center; gap: clamp(14px,2vw,24px); }
        .nav-theme-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; background: none; border: none; padding: 0; outline: none; opacity: 0.4; transition: opacity 0.3s; }
        .nav-theme-toggle:hover { opacity: 0.75; }
        .nav-theme-circle { width: 13px; height: 13px; border-radius: 50%; border: 1px solid var(--cream); position: relative; overflow: hidden; flex-shrink: 0; transition: border-color 0.5s; }
        .nav-theme-circle::before { content: ''; position: absolute; left: 0; top: 0; width: 50%; height: 100%; background: var(--cream); transition: left 0.4s ease; }
        .theme-light .nav-theme-circle::before { left: 50%; }
        .nav-theme-label { font-family: var(--font); font-style: italic; font-size: clamp(10px,1.1vw,12px); letter-spacing: 0.22em; text-transform: uppercase; color: var(--cream); transition: color 0.5s; }

        .about-drawer, .collection-drawer { position: fixed; top: 52px; left: 0; right: 0; z-index: 49; overflow: hidden; max-height: 0; opacity: 0; pointer-events: none; transition: max-height 0.72s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease, box-shadow 0.5s ease; }
        .about-drawer.open, .collection-drawer.open { max-height: 600px; opacity: 1; pointer-events: all; box-shadow: 0 32px 64px rgba(0,0,0,0.45); }
        .about-drawer-inner, .collection-drawer-inner { background: var(--surface); border-bottom: 1px solid var(--border); padding: clamp(28px,4.5vw,52px) clamp(20px,5vw,64px); max-width: 1100px; margin: 0 auto; transition: background 0.55s ease; }
        .about-drawer-inner { display: grid; grid-template-columns: auto 1fr; gap: clamp(28px,4vw,56px); align-items: start; }
        .about-portrait { width: clamp(80px,10vw,120px); aspect-ratio: 1/1; border-radius: 50%; overflow: hidden; border: 1px solid var(--border); flex-shrink: 0; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .about-portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .about-text { display: flex; flex-direction: column; gap: 18px; }
        .about-name { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(22px,3.5vw,32px); line-height: 1; color: var(--cream); letter-spacing: 0.02em; }
        .about-tagline { font-family: var(--font); font-style: italic; font-size: clamp(11px,1.3vw,13px); letter-spacing: 0.28em; text-transform: uppercase; color: var(--silver); opacity: 0.7; margin-top: -10px; }
        .about-bio { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(14px,1.6vw,17px); line-height: 1.8; color: var(--cream-dim); display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
        .about-bio.expanded { -webkit-line-clamp: unset; overflow: visible; }
        .about-read-more { font-family: var(--font); font-style: italic; font-size: clamp(11px,1.3vw,13px); letter-spacing: 0.22em; text-transform: uppercase; color: var(--silver); opacity: 0.65; background: none; border: none; cursor: pointer; padding: 0; text-align: left; transition: opacity 0.3s; }
        .about-read-more:hover { opacity: 1; }
        .about-collections { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
        .about-collection-tag { font-family: var(--font); font-style: italic; font-size: clamp(11px,1.2vw,13px); letter-spacing: 0.16em; text-transform: uppercase; color: var(--silver); opacity: 0.72; padding: 6px 16px; border: 1px solid var(--border); border-radius: 20px; text-decoration: none; transition: opacity 0.3s, border-color 0.3s; white-space: nowrap; }
        .about-collection-tag:hover { opacity: 1; border-color: var(--silver); }

        .collection-header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
        .collection-title { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(20px,3vw,28px); color: var(--cream); letter-spacing: 0.02em; }
        .collection-count { font-family: var(--font); font-style: italic; font-size: clamp(11px,1.3vw,13px); letter-spacing: 0.22em; color: var(--silver); opacity: 0.6; text-transform: uppercase; }
        .collection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(clamp(120px,18vw,160px),1fr)); gap: 10px; max-height: 300px; overflow-y: auto; padding-right: 6px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        .collection-piece { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; background: rgba(255,255,255,0.02); transition: border-color 0.3s; position: relative; }
        .collection-piece:hover { border-color: var(--silver); }
        .collection-piece-num { font-family: var(--font); font-style: italic; font-size: clamp(26px,4vw,36px); line-height: 1; color: var(--cream); opacity: 0.15; letter-spacing: -0.02em; user-select: none; }
        .collection-piece-name { font-family: var(--font); font-style: italic; font-size: clamp(11px,1.3vw,13px); letter-spacing: 0.1em; color: var(--cream-dim); line-height: 1.3; }
        .collection-qty { position: absolute; top: 10px; right: 12px; font-family: 'SF Mono', 'Fira Mono', monospace; font-size: 9px; letter-spacing: 0.1em; color: var(--cream); opacity: 0.35; background: var(--border); padding: 2px 6px; border-radius: 4px; }
        .collection-state { font-family: var(--font); font-style: italic; font-size: clamp(13px,1.5vw,15px); letter-spacing: 0.1em; color: var(--silver); opacity: 0.55; padding: 24px 0; text-align: center; }

        .hero { max-width: 820px; margin: 0 auto; text-align: center; padding: clamp(44px,6.5vw,80px) 24px clamp(24px,3.5vw,44px); }
        .eyebrow { font-family: var(--font); font-style: italic; font-size: clamp(11px,1.3vw,13px); letter-spacing: 0.28em; text-transform: uppercase; color: var(--silver); opacity: 0.72; margin-bottom: 14px; }
        .hero-title { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(40px,7.2vw,86px); line-height: 0.92; letter-spacing: -0.01em; color: var(--cream); margin-bottom: 24px; }
        .hero-sub { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(13px,1.5vw,15px); letter-spacing: 0.18em; color: var(--silver); opacity: 0.62; }

        .banner-outer { padding: clamp(16px,2.5vw,36px) clamp(16px,4.5vw,64px); max-width: 1528px; margin: 0 auto; }
        .banner-inner { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: clamp(10px,1.4vw,18px); overflow: hidden; border: none; background: transparent; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .banner-inner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity 0.5s ease; }
        .theme-light .banner-inner { box-shadow: 0 12px 40px rgba(28,21,16,0.12); }

        .divider { width: clamp(36px,7vw,72px); height: 1px; margin: 0 auto; background: linear-gradient(90deg, transparent, rgba(122,20,36,0.48), transparent); }

        .cd-wrap { text-align: center; padding: clamp(32px,5vw,60px) 24px clamp(24px,4vw,52px); }
        .cd-lbl { font-family: var(--font); font-style: italic; font-size: clamp(11px,1.1vw,13px); letter-spacing: 0.3em; text-transform: uppercase; color: var(--silver); opacity: 0.6; margin-bottom: 26px; }
        .cd-row { display: flex; justify-content: center; align-items: flex-end; gap: clamp(14px,3.8vw,50px); }
        .cd-unit { display: flex; flex-direction: column; align-items: center; gap: 7px; }
        .cd-num { font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(36px,6.2vw,70px); line-height: 1; color: var(--cream); letter-spacing: 0.02em; border-bottom: 1px solid rgba(122,20,36,0.35); padding-bottom: 2px; min-width: 1.6ch; text-align: center; font-variant-numeric: tabular-nums; }
        .cd-unit-lbl { font-family: var(--font); font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--silver); opacity: 0.58; }
        .cd-sep { font-family: var(--font); font-style: italic; font-size: clamp(22px,3.2vw,38px); line-height: 1.5; color: var(--red); opacity: 0.4; user-select: none; padding-bottom: 8px; }
        .cd-note { margin-top: 20px; font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(13px,1.5vw,15px); color: var(--silver); opacity: 0.6; letter-spacing: 0.1em; }

        .piece-section { padding: 0 clamp(16px,4vw,64px) clamp(48px,7vw,100px); max-width: 860px; margin: 0 auto; width: 100%; }
        .section-lbl { text-align: center; margin-bottom: 18px; font-family: var(--font); font-style: italic; font-size: clamp(11px,1.2vw,13px); letter-spacing: 0.3em; text-transform: uppercase; color: var(--silver); opacity: 0.62; }
        .piece-video { position: relative; width: 100%; aspect-ratio: 1/1; border-radius: clamp(8px,1.2vw,14px); overflow: hidden; border: 1px solid var(--border); background: var(--surface); box-shadow: 0 32px 80px rgba(0,0,0,0.68); }
        .piece-video video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .piece-video img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .piece-video-overlay { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to top, rgba(6,6,10,0.55) 0%, transparent 42%); }
        .piece-ghost { position: absolute; bottom: 14px; left: 18px; font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(48px,10vw,92px); line-height: 1; color: rgba(230,221,208,0.07); user-select: none; pointer-events: none; }
        .piece-frag { position: absolute; bottom: 20px; right: 20px; font-family: var(--font); font-style: italic; font-size: clamp(10px,1.2vw,12px); letter-spacing: 0.14em; color: var(--cream-dim); }
        .piece-placeholder { background: var(--surface); pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; position: absolute; inset: 0; }
        .piece-tease-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.32; filter: brightness(0.65) saturate(0.7); }
        .piece-tease-overlay { position: absolute; inset: 0; background: rgba(6,6,10,0.38); pointer-events: none; }
        .piece-tease-badge { position: absolute; bottom: 28px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .piece-tease-label { font-family: var(--font); font-style: italic; font-size: clamp(10px,1.2vw,12px); letter-spacing: 0.34em; text-transform: uppercase; color: var(--cream-dim); opacity: 0.6; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        .piece-shimmer {
          position: absolute; inset: 0; overflow: hidden; pointer-events: none;
        }
        .piece-shimmer::after {
          content: '';
          position: absolute; top: 0; bottom: 0;
          width: 40%; left: 0;
          background: linear-gradient(105deg, transparent 20%, rgba(240,232,220,0.055) 50%, transparent 80%);
          animation: shimmer 3.8s cubic-bezier(0.4,0,0.6,1) infinite;
          animation-delay: 0.8s;
        }

        .manifold-wrap { width: 100%; border-radius: clamp(8px,1.2vw,14px); overflow: hidden; border: 1px solid var(--border); background: var(--surface); margin-top: clamp(12px,2vw,20px); contain: paint; will-change: contents; display: block; }
        .manifold-wrap div, .manifold-wrap m-claim-complete { width: 100% !important; max-width: 100% !important; box-sizing: border-box; background: #0f0d16 !important; color: #e6ddd0 !important; }
        .manifold-wrap .m-btn-primary, .manifold-wrap .buy-btn, .manifold-wrap .mint-btn, .manifold-wrap .claim-btn { background: rgba(122,20,36,0.2) !important; border: 1px solid rgba(122,20,36,0.6) !important; color: #e6ddd0 !important; border-radius: 8px !important; letter-spacing: 0.1em !important; transition: background 0.4s !important; }
        .collect-fallback { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: clamp(24px,4vw,36px); padding-top: 0; }
        .collect-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 15px 24px; border-radius: 10px; border: 1px solid rgba(122,20,36,0.5); background: rgba(122,20,36,0.10); font-family: var(--font); font-style: italic; font-size: clamp(11px,1.4vw,13px); letter-spacing: 0.28em; text-transform: uppercase; color: var(--cream-dim); text-decoration: none; cursor: pointer; transition: background 0.4s, border-color 0.4s, color 0.4s; }
        .collect-btn:hover { background: rgba(122,20,36,0.18); border-color: rgba(122,20,36,0.8); color: var(--cream); }
        .collect-meta { font-family: var(--font); font-style: italic; font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--silver); opacity: 0.28; }

        .share-trigger { width: 100%; background: none; border: none; cursor: pointer; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 0; }
        .share-trigger-line { width: 100%; height: 1px; background: var(--border); }
        .share-trigger-inner { display: flex; align-items: center; gap: 10px; margin: 14px 0 10px; font-family: var(--font); font-style: italic; font-size: clamp(11px,1.3vw,13px); letter-spacing: 0.3em; text-transform: uppercase; color: var(--silver); opacity: 0.55; transition: opacity 0.3s; }
        .share-trigger:hover .share-trigger-inner { opacity: 0.9; }
        .share-trigger-label { font-family: var(--font); font-style: italic; }
        .share-chevron { transition: transform 0.4s; }
        .share-chevron.open { transform: rotate(180deg); }
        .share-drawer { max-height: 0; overflow: hidden; transition: max-height 0.65s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease; opacity: 0; }
        .share-drawer.open { max-height: 600px; opacity: 1; }
        .share-drawer-inner { padding: clamp(24px,4vw,40px) 0 clamp(32px,5vw,56px); }
        .share-intro { font-family: var(--font); font-style: italic; font-size: clamp(12px,1.4vw,14px); color: var(--silver); opacity: 0.55; letter-spacing: 0.08em; text-align: center; margin-bottom: 24px; }
        .share-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(8px,1.5vw,14px); }
        .share-card { position: relative; aspect-ratio: 1/1; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); background: var(--surface); cursor: pointer; }
        .share-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .share-card-overlay { position: absolute; inset: 0; background: rgba(6,6,10,0.6); opacity: 0; transition: opacity 0.3s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
        .share-card:hover .share-card-overlay { opacity: 1; }
        .share-download-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid rgba(230,221,208,0.3); border-radius: 20px; font-family: var(--font); font-style: italic; font-size: 11px; letter-spacing: 0.2em; color: var(--cream); text-decoration: none; transition: border-color 0.3s; }
        .share-download-btn:hover { border-color: var(--cream); }
        .share-frag-num { font-family: var(--font); font-style: italic; font-size: 10px; letter-spacing: 0.16em; color: var(--cream-dim); }
        .share-empty { font-family: var(--font); font-style: italic; font-size: clamp(12px,1.4vw,14px); color: var(--silver); opacity: 0.45; text-align: center; padding: 32px 0; }

        .footer { border-top: 1px solid var(--border); padding: 0 clamp(20px,3vw,36px); height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: var(--transition-theme); position: relative; z-index: 10; }
        .footer-copy { font-family: 'SF Mono', 'Fira Mono', 'Consolas', monospace; font-size: 10px; letter-spacing: 0.06em; color: var(--cream); opacity: 0.28; white-space: nowrap; transition: color 0.5s; }
        .footer-right { display: flex; align-items: center; gap: clamp(16px,2.5vw,28px); }
        .footer-link { font-family: 'SF Mono', 'Fira Mono', 'Consolas', monospace; font-size: 10px; letter-spacing: 0.06em; color: var(--cream); opacity: 0.28; text-decoration: none; white-space: nowrap; transition: opacity 0.3s; cursor: pointer; background: none; border: none; padding: 0; }
        .footer-link:hover { opacity: 0.6; }
        .footer-gwei { display: flex; align-items: center; gap: 5px; opacity: 0.3; transition: opacity 0.3s; cursor: default; }
        .footer-gwei:hover { opacity: 0.6; }
        .footer-gwei-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .footer-gwei-dot.low  { background: #4ade80; box-shadow: 0 0 5px rgba(74,222,128,0.5); }
        .footer-gwei-dot.mid  { background: #facc15; box-shadow: 0 0 5px rgba(250,204,21,0.5); }
        .footer-gwei-dot.high { background: #f87171; box-shadow: 0 0 5px rgba(248,113,113,0.5); }
        .footer-gwei-text { font-family: 'SF Mono','Fira Mono','Consolas',monospace; font-size: 10px; letter-spacing: 0.06em; color: var(--cream); }
        .footer-toggle { display: flex; align-items: center; gap: 7px; cursor: pointer; background: none; border: none; padding: 4px 0; outline: none; transition: opacity 0.3s; opacity: 0.38; }
        .footer-toggle:hover { opacity: 0.7; }
        .footer-toggle-circle { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--cream); position: relative; overflow: hidden; flex-shrink: 0; transition: border-color 0.5s; }
        .footer-toggle-circle::before { content: ''; position: absolute; left: 0; top: 0; width: 50%; height: 100%; background: var(--cream); transition: background 0.5s; }
        .theme-light .footer-toggle-circle::before { left: 50%; }
        .footer-toggle-label { font-family: 'SF Mono', 'Fira Mono', 'Consolas', monospace; font-size: 10px; letter-spacing: 0.06em; color: var(--cream); transition: color 0.5s; text-transform: uppercase; }

        @media (max-width: 600px) {
          .about-drawer-inner { grid-template-columns: 1fr; }
          .about-portrait { width: 72px; }
          .share-grid { grid-template-columns: repeat(2, 1fr); }
          .footer { height: auto; padding: 12px clamp(16px,4vw,24px); flex-wrap: wrap; gap: 10px; }
          .footer-link { display: none; }
          .cd-row { gap: 10px; }
          .nav-center { gap: 12px; }
        }
      `}</style>

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
                    <svg viewBox="450 80 130 185" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                      <defs>
                        <radialGradient id="pz-a" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#7a1424" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#7a1424" stopOpacity="0"/>
                        </radialGradient>
                        <radialGradient id="pz-b" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#9a1830" stopOpacity="0.62"/>
                          <stop offset="100%" stopColor="#7a1424" stopOpacity="0"/>
                        </radialGradient>
                        <filter id="pz-f" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="5" result="b"/>
                          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      <ellipse cx="513" cy="171" rx="56" ry="74" fill="url(#pz-a)" />
                      <ellipse className="pz-glow" cx="513" cy="171" rx="66" ry="86" fill="url(#pz-b)" />
                      <path filter="url(#pz-f)" fill="rgba(230,221,208,0.055)" stroke="rgba(230,221,208,0.2)" strokeWidth="1.2" d="M458.753235,132.001770 C458.755554,127.504929 458.911346,123.500244 458.716980,119.512619 C458.535492,115.789352 460.113708,114.564713 463.730499,114.614639 C474.554260,114.764023 485.381500,114.678162 496.207306,114.655212 C498.665497,114.649994 501.366821,115.139023 502.906708,112.445747 C504.507050,109.646790 501.995697,108.244270 500.713654,106.448624 C497.899780,102.507446 497.817932,98.277412 500.012787,94.196426 C502.851837,88.917679 507.635498,86.115837 513.543701,86.370087 C519.176697,86.612488 523.864319,89.348610 526.276306,94.685829 C528.339600,99.251511 527.997375,103.727791 524.319092,107.620728 C523.056519,108.957001 521.935242,110.544472 523.131897,112.539101 C524.209473,114.335304 525.964783,114.650681 527.890137,114.648964 C538.882568,114.639183 549.874939,114.652794 560.867371,114.669273 C568.346252,114.680481 568.349060,114.688400 568.354614,121.933983 C568.362976,132.759827 568.380432,143.585693 568.361938,154.411484 C568.358093,156.682327 568.653259,158.818420 570.861877,160.004593 C573.127197,161.221252 574.559204,159.461060 576.136658,158.298141 C580.685181,154.944839 585.544250,154.707870 590.034729,157.600037 C594.858643,160.706970 597.863403,167.150391 596.823303,172.157471 C594.484741,183.415070 584.680969,187.368134 575.133057,180.890991 C573.714233,179.928467 572.325806,179.003052 570.572876,180.115707 C568.622009,181.353989 568.364502,183.301712 568.366272,185.365448 C568.375549,196.191299 568.379944,207.017136 568.386108,217.842987 C568.387024,219.508469 568.259827,221.186096 568.415771,222.836945 C568.758972,226.470062 567.239014,227.958939 563.570435,227.910278 C552.415222,227.762283 541.257080,227.838150 530.101440,227.710922 C527.554077,227.681854 524.953125,227.303482 523.362427,229.801300 C521.654236,232.483521 524.056213,234.034607 525.348206,235.861282 C528.263428,239.982986 528.286438,244.401672 525.802124,248.537292 C522.774963,253.576508 518.066467,256.580170 512.085144,256.056976 C506.462555,255.565186 501.988434,252.578796 499.673004,247.222885 C497.638885,242.517715 498.342804,238.128021 502.066162,234.365204 C503.140472,233.279495 504.019775,231.979416 503.250549,230.340515 C502.230774,228.167709 500.175049,227.953491 498.148071,227.946945 C487.322479,227.911987 476.496643,227.954941 465.671051,227.916885 C458.879700,227.893005 458.784637,227.764313 458.774231,220.822540 C458.757507,209.663651 458.677765,198.503906 458.790436,187.346207 C458.835815,182.852707 459.989441,182.322739 463.875916,184.489380 C471.188171,188.565842 478.085114,187.374481 483.553345,181.090286 C488.653503,175.229095 489.105164,166.402176 484.617584,160.291534 C479.136719,152.828323 471.728119,151.196396 463.718506,155.897446 C460.026398,158.064438 458.820740,156.498535 458.782257,152.986511 C458.707489,146.158859 458.756287,139.329834 458.753235,132.001770 Z" />
                    </svg>
                  </div>
                  <span className="pz-text">Welcome</span>
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
              <motion.span className="nav-mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 1 }}>
                Nikxname
              </motion.span>

              <div className="nav-center">
                <motion.button
                  className="nav-about"
                  onClick={() => { setAboutOpen(o => !o); setCollectionOpen(false); }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0, duration: 1 }}
                  aria-expanded={aboutOpen}
                >
                  About
                  <svg className={`nav-about-chevron${aboutOpen ? ' open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </motion.button>

                <AnimatePresence>
                  {isConnected && (
                    <motion.button
                      className="nav-collection"
                      onClick={() => { setCollectionOpen(o => !o); setAboutOpen(false); }}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      aria-expanded={collectionOpen}
                    >
                      Collection
                      <svg className={`nav-collection-chevron${collectionOpen ? ' open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="nav-right">
                <motion.button
                  className={`nav-theme-toggle${themeClass}`}
                  onClick={() => setDark(d => !d)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.9 }}
                  aria-label="Toggle light/dark mode"
                >
                  <div className="nav-theme-circle" />
                  <span className="nav-theme-label">{dark ? 'Light' : 'Dark'}</span>
                </motion.button>
                <motion.div className="nav-connect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.9, ease: 'easeOut' }}>
                  <ConnectButton label="Connect" showBalance={false} accountStatus="address" chainStatus="none" />
                </motion.div>
              </div>
            </nav>

            <div className={`about-drawer${aboutOpen ? ' open' : ''}`} aria-hidden={!aboutOpen}>
              <div className="about-drawer-inner">
                <div className="about-portrait">
                  <img src="https://assets.manifold.xyz/original/7185bec68793d1e8d6fd6c90cd8cb679d23647607064137598a798711958012c.jpg" alt="Nikxname" loading="lazy" decoding="async" />
                </div>
                <div className="about-text">
                  <div>
                    <p className="about-name">Nikxname</p>
                    <p className="about-tagline">Telling Human Stories</p>
                  </div>
                  <p className={`about-bio${bioExpanded ? ' expanded' : ''}`}>
                    Nik is a visionary digital artist whose journey in creation spans decades, beginning in his youth with acrylic painting, sculpting, and intricate model building. These early explorations fostered a profound, multifaceted perspective — one that weaves emotional depth with documentary-like precision, capturing both the chaos of existence and the quiet beauty of fleeting moments. Today, he channels this into digital painting, leveraging blockchain technology to immortalise the present's ephemeral essence, turning virtual brushstrokes into timeless Life Impressions. At the heart of his ethos is a commitment to iterative growth and stillness amid turmoil — urging creators to "create more than you consume." His art serves as a bridge between personal introspection and communal connection, spreading positivity through vibrant, nature-inspired works that celebrate life and foster creative dialogue.
                  </p>
                  <button className="about-read-more" onClick={() => setBioExpanded(e => !e)}>
                    {bioExpanded ? 'Read less' : 'Read more'}
                  </button>
                  <div className="about-collections">
                    {[
                      { label: 'Together We Bloom', href: 'https://manifold.xyz/@nikxnames-art' },
                      { label: 'The Void',           href: 'https://manifold.xyz/@nikxnames-art/p/thevoid' },
                      { label: 'Life Impressions',   href: 'https://manifold.xyz/@nikxnames-art/p/1913617113' },
                      { label: '1/1 Artworks',       href: 'https://manifold.xyz/@nikxnames-art/p/nikxname1of1s' },
                    ].map(c => (
                      <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" className="about-collection-tag">{c.label}</a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {aboutOpen && (
              <div onClick={() => setAboutOpen(false)} style={{ position:'fixed', inset:0, zIndex:48, cursor:'default' }} aria-hidden="true" />
            )}

            <div className={`collection-drawer${collectionOpen ? ' open' : ''}`} aria-hidden={!collectionOpen}>
              <div className="collection-drawer-inner">
                <div className="collection-header">
                  <span className="collection-title">Your Collection</span>
                  {ownedPieces.length > 0 && (
                    <span className="collection-count">{ownedPieces.length} of 27 fragments</span>
                  )}
                </div>
                {!isConnected && <p className="collection-state">Connect your wallet to view what you own.</p>}
                {isConnected && balancesLoading && (
                  <p className="collection-state">Reading your collection...</p>
                )}
                {isConnected && !balancesLoading && ownedPieces.length === 0 && (
                  <p className="collection-state">No fragments in this wallet yet — first drop Sunday June 8th.</p>
                )}
                {ownedPieces.length > 0 && (
                  <div className="collection-grid">
                    {ownedPieces.map(({ tokenId, qty }) => (
                      <div key={tokenId} className="collection-piece">
                        {qty > 1 && <span className="collection-qty">x{qty}</span>}
                        <span className="collection-piece-num">{String(tokenId).padStart(2, '0')}</span>
                        <span className="collection-piece-name">{PIECE_NAMES[tokenId] ?? `Fragment ${tokenId}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {collectionOpen && (
              <div onClick={() => setCollectionOpen(false)} style={{ position:'fixed', inset:0, zIndex:48, cursor:'default' }} aria-hidden="true" />
            )}

            <header className="hero">
              <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0, duration: 1 }}>
                Collection &nbsp;|&nbsp; A Familiar Burn
              </motion.p>
              <motion.h1 className="hero-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 1.1 }}>
                Together We Bloom
              </motion.h1>
              <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}>
                An on-chain art discovery experience &nbsp;·&nbsp; 27 fragments
              </motion.p>
            </header>

            <motion.div className="banner-outer" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 1.2 }}>
              <div className="banner-inner">
                <img
                  key={dark ? 'banner-dark' : 'banner-light'}
                  src={dark ? BANNER_DARK.src : BANNER_LIGHT.src}
                  srcSet={dark ? BANNER_DARK.srcSet : BANNER_LIGHT.srcSet}
                  sizes={BANNER_SIZES}
                  alt="Together We Bloom — A Familiar Burn"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </motion.div>

            <motion.section className="cd-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.45, duration: 1 }}>
              {!dropsStarted ? (
                <>
                  <p className="cd-lbl">The experience begins in</p>
                  <div className="cd-row">
                    {cdUnits.map(({ label, val }, i) => (
                      <div key={label} style={{ display: 'contents' }}>
                        {i > 0 && <span className="cd-sep">·</span>}
                        <div className="cd-unit">
                          <span className="cd-num">{String(val).padStart(2, '0')}</span>
                          <span className="cd-unit-lbl">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="cd-note">Piece one arrives Monday, June 8th — 10 am EST</p>
                </>
              ) : nextDropTime ? (
                <>
                  <p className="cd-lbl">Fragment {String(livePieceIdx + 2).padStart(2, '0')} arrives in</p>
                  <div className="cd-row">
                    {cdUnits.map(({ label, val }, i) => (
                      <div key={label} style={{ display: 'contents' }}>
                        {i > 0 && <span className="cd-sep">·</span>}
                        <div className="cd-unit">
                          <span className="cd-num">{String(val).padStart(2, '0')}</span>
                          <span className="cd-unit-lbl">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="cd-note">slow down &nbsp;·&nbsp; sit with this</p>
                </>
              ) : (
                <p className="cd-note" style={{ opacity: 0.45, fontSize: 'clamp(13px,1.8vw,16px)' }}>The collection is complete.</p>
              )}
            </motion.section>

            <div className="divider" style={{ marginBottom: 'clamp(32px, 5vw, 60px)' }} />

            {showContent && (
              <motion.div className="piece-section" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.55, duration: 1.1 }}>

                <p className="section-lbl">
                  {dropsStarted
                    ? `Now available · Fragment ${String(livePieceIdx + 1).padStart(2, '0')}`
                    : `Coming · Fragment ${String(CURRENT_PIECE.number).padStart(2, '0')}`}
                </p>

                <div className="piece-video">
                  {dropsStarted ? (
                    <>
                      {CURRENT_PIECE.mediaType === 'video' ? (
                        <video ref={videoRef} src={CURRENT_PIECE.mediaUrl} autoPlay loop muted playsInline />
                      ) : (
                        <img src={CURRENT_PIECE.mediaUrl} alt={CURRENT_PIECE.title}
                          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <img
                        src="https://assets.nikxart.xyz/PuzzlePc-PH01.jpg"
                        alt="Fragment I coming soon"
                        className="piece-tease-img"
                      />
                      <div className="piece-tease-overlay" />
                      <div className="piece-shimmer" />
                      <div className="piece-tease-badge">
                        <span className="piece-tease-label">June 8th &nbsp;&middot;&nbsp; 10 am EST</span>
                      </div>
                    </>
                  )}
                  <div className="piece-video-overlay" />
                  <span className="piece-ghost">{String(dropsStarted ? livePieceIdx + 1 : CURRENT_PIECE.number).padStart(2, '0')}</span>
                  <span className="piece-frag">{CURRENT_PIECE.title}</span>
                </div>

                {dropsStarted && (
                  <>
                    <div className="manifold-wrap" ref={manifoldRef} />
                    <div className="collect-fallback">
                      <a href={CURRENT_PIECE.manifoldUrl} target="_blank" rel="noopener noreferrer" className="collect-btn">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.45 }}>
                          <path d="M12 2L4 12l8 4 8-4L12 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M4 12l8 10 8-10" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                        </svg>
                        Collect this piece
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto', opacity: 0.3 }}>
                          <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                      <span className="collect-meta">Ethereum · ERC-1155 · Manifold</span>
                    </div>
                  </>
                )}

              </motion.div>
            )}

            <div style={{ padding: '0 clamp(16px,4vw,64px)' }}>
              <button className="share-trigger" onClick={() => setShareOpen(o => !o)} aria-expanded={shareOpen}>
                <div className="share-trigger-line" />
                <div className="share-trigger-inner">
                  <span className="share-trigger-label">Share the work</span>
                  <svg className={`share-chevron${shareOpen ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="share-trigger-line" />
              </button>
              <div className={`share-drawer${shareOpen ? ' open' : ''}`} aria-hidden={!shareOpen}>
                <div className="share-drawer-inner">
                  <p className="share-intro">Download optimised files for sharing on Instagram, X, or sending to a friend.</p>
                  <div className="share-grid">
                    {SHARE_PIECES.length === 0 ? (
                      <p className="share-empty">Assets will appear here as pieces are released.</p>
                    ) : (
                      SHARE_PIECES.map(piece => (
                        <div key={piece.number} className="share-card">
                          <img src={piece.thumbUrl} alt={piece.label} loading="lazy" decoding="async" />
                          <div className="share-card-overlay">
                            <a href={piece.downloadUrl} download className="share-download-btn" onClick={e => e.stopPropagation()}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Save
                            </a>
                            <span className="share-frag-num">{String(piece.number).padStart(2,'0')} — {piece.label}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <footer className={`footer${themeClass}`}>
              <span className="footer-copy">© 2026 Nikxname</span>
              <div className="footer-right">
                <a href="https://manifold.xyz/@nikxnames-art" target="_blank" rel="noopener noreferrer" className="footer-link">Manifold</a>
                {gwei !== null ? (
                  <span className="footer-gwei" title={`Gas: ${gwei} gwei (safe)`}>
                    <span className={`footer-gwei-dot ${gwei < 15 ? 'low' : gwei < 40 ? 'mid' : 'high'}`} />
                    <span className="footer-gwei-text">{gwei} gwei</span>
                  </span>
                ) : (
                  <span className="footer-link" style={{ cursor: 'default', pointerEvents: 'none' }}>Ethereum</span>
                )}
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}