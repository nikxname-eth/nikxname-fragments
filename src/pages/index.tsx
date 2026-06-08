import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================================
// BANNER IMAGES
// =====================================================================
// Each banner has a base state (blank puzzle grid) and evolved state (with piece 01).
// The evolved banner shows automatically once a connected wallet has minted piece 01.
// All images use Cloudflare Image Resizing — one master file, infinite sizes.
// New banners are 2500×1266px — aspect ratio ~1.976:1 (close to 2:1).
// ✏️  Swap base filenames to update. Never change the ?width= params.

const BANNER_SIZES = '(max-width: 680px) calc(100vw - 32px), (max-width: 1100px) calc(100vw - 64px), 1400px';

const makeBanner = (base: string) => ({
  src:    `${base}?width=1400&quality=88&format=auto`,
  srcSet: [
    `${base}?width=640&quality=85&format=auto 640w`,
    `${base}?width=960&quality=85&format=auto 960w`,
    `${base}?width=1400&quality=88&format=auto 1400w`,
  ].join(', '),
});

// Base banners — blank puzzle grid
const BANNER_DARK       = makeBanner('https://assets.nikxart.xyz/Banner-Medium.jpg');
const BANNER_LIGHT      = makeBanner('https://assets.nikxart.xyz/main_grid_light_2500px.jpg');

// Evolved banners — puzzle grid with piece 01 revealed (shown after minting)
const BANNER_DARK_PC01  = makeBanner('https://assets.nikxart.xyz/Banner-Main-Pc001-Dark.jpg');
const BANNER_LIGHT_PC01 = makeBanner('https://assets.nikxart.xyz/Banner-Main-Pc001-Light.jpg');

// Current piece - update every drop
const CURRENT_PIECE = {
  number:    1,
  title:     'Fragment I',
  // ✏️  Placeholder image until the real piece is ready.
  // Upload PuzzlePc-PH01.jpg to your Cloudflare R2 bucket, then swap this URL.
  // Change mediaType to 'video' and update the URL when you have the final MP4.
  mediaUrl:  'https://assets.nikxart.xyz/E2_VF_Grid_Optimized.gif',
  mediaType: 'image' as 'video' | 'image',
  instanceId:  '4056113392',
  manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4056113392',
};

// Drop schedule - UTC (Summer EDT = UTC-4, so 10am EDT = 14:00 UTC)
const DROP_SCHEDULE: { piece: number; startsUTC: string }[] = [
  { piece: 1,  startsUTC: '2026-06-08T14:00:00Z' },
  { piece: 2,  startsUTC: '2026-06-12T14:00:00Z' },
  { piece: 3,  startsUTC: '2026-06-15T14:00:00Z' },
  { piece: 4,  startsUTC: '2026-06-17T14:00:00Z' },
  { piece: 5,  startsUTC: '2026-06-19T14:00:00Z' },
  { piece: 6,  startsUTC: '2026-06-22T14:00:00Z' },
  { piece: 7,  startsUTC: '2026-06-24T14:00:00Z' },
  { piece: 8,  startsUTC: '2026-06-26T14:00:00Z' },
  { piece: 9,  startsUTC: '2026-06-29T14:00:00Z' },
  { piece: 10, startsUTC: '2026-07-01T14:00:00Z' },
  { piece: 11, startsUTC: '2026-07-03T14:00:00Z' },
  { piece: 12, startsUTC: '2026-07-07T14:00:00Z' },
  { piece: 13, startsUTC: '2026-07-09T14:00:00Z' },
  { piece: 14, startsUTC: '2026-07-11T14:00:00Z' },
  { piece: 15, startsUTC: '2026-07-13T14:00:00Z' },
  { piece: 16, startsUTC: '2026-07-15T14:00:00Z' },
  { piece: 17, startsUTC: '2026-07-17T14:00:00Z' },
  { piece: 18, startsUTC: '2026-07-20T14:00:00Z' },
  { piece: 19, startsUTC: '2026-07-22T14:00:00Z' },
  { piece: 20, startsUTC: '2026-07-24T14:00:00Z' },
  { piece: 21, startsUTC: '2026-07-27T14:00:00Z' },
  { piece: 22, startsUTC: '2026-07-29T14:00:00Z' },
  { piece: 23, startsUTC: '2026-07-31T14:00:00Z' },
  { piece: 24, startsUTC: '2026-08-03T14:00:00Z' },
  { piece: 25, startsUTC: '2026-08-05T14:00:00Z' },
  { piece: 26, startsUTC: '2026-08-07T14:00:00Z' },
  { piece: 27, startsUTC: '2026-08-10T14:00:00Z' },
];

// Set to false on launch day (Jun 8) to hide content before drops begin
const PREVIEW_MODE = false;

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
        // Cloudflare's public Ethereum RPC — free, no API key, very reliable
        const r = await fetch('https://cloudflare-eth.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
        });
        const d = await r.json();
        if (d.result) {
          // Convert hex wei to gwei and round
          const gweiVal = Math.round(parseInt(d.result, 16) / 1e9);
          setGwei(gweiVal);
        }
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

  // Banner evolves once connected wallet holds piece 01
  const bannerEvolved = isConnected && ownedPieces.some(p => p.tokenId === 1 && p.qty > 0);

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

        .theme-light { --bg:#cec4ba; --surface:#c5bab0; --red:#6b1020; --red-glow:rgba(107,16,32,0.11); --blue-glow:rgba(8,14,55,0.04); --cream:#16110d; --cream-dim:rgba(22,17,13,0.72); --silver:rgba(40,28,20,0.62); --border:rgba(40,28,20,0.12); }
        .theme-light .nav { background: rgba(200,193,184,0.87); }
        .theme-light .manifold-wrap, .theme-light .manifold-wrap div, .theme-light .manifold-wrap m-claim-complete { background: #0f0d16 !important; color: #e6ddd0 !important; }
        .theme-light .piece-video { border-color: rgba(40,28,20,0.15); }
        .theme-light .divider { background: linear-gradient(90deg, transparent, rgba(107,16,32,0.3), transparent); }

        .intro { position: fixed; inset: 0; z-index: 200; background: var(--bg); display: flex; align-items: center; justify-content: center; transition: background 0.55s ease; }
        @keyframes pulse-ring { 0%,100% { transform: scale(0.97); opacity: 0.07; } 50% { transform: scale(1.03); opacity: 0.15; } }
        @keyframes pulse-ring-outer { 0%,100% { transform: scale(0.95); opacity: 0.035; } 50% { transform: scale(1.05); opacity: 0.08; } }
        .ring { position: absolute; border-radius: 50%; border: 1px solid var(--cream); pointer-events: none; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .ring-1 { width:clamp(260px,40vw,440px); height:clamp(260px,40vw,440px); animation: pulse-ring 3.8s infinite; }
        .ring-2 { width:clamp(360px,56vw,600px); height:clamp(360px,56vw,600px); animation: pulse-ring-outer 3.8s 0.9s infinite; }
        .pz-btn { position: relative; z-index: 2; cursor: pointer; background: none; border: none; outline: none; display: flex; flex-direction: column; align-items: center; gap: 0; padding: 0; transition: transform 0.55s cubic-bezier(0.34,1.56,0.64,1); }
        .pz-btn:hover { transform: scale(1.07); }
        .pz-svg { width: clamp(88px, 11vw, 130px); display: flex; align-items: center; justify-content: center; position: relative; }
        .pz-svg svg { width: 100%; height: auto; overflow: visible; }
        .pz-glow { opacity: 0; transition: opacity 0.5s; }
        .pz-btn:hover .pz-glow { opacity: 1; }

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
        .banner-inner { position: relative; width: 100%; aspect-ratio: 2500/1266; border-radius: clamp(10px,1.4vw,18px); overflow: hidden; border: none; background: transparent; }
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

        .piece-section { padding: 0 clamp(40px,9vw,140px) clamp(48px,7vw,100px); max-width: 700px; margin: 0 auto; width: 100%; }
        .section-lbl { text-align: center; margin-bottom: 18px; font-family: var(--font); font-style: italic; font-size: clamp(11px,1.2vw,13px); letter-spacing: 0.3em; text-transform: uppercase; color: var(--silver); opacity: 0.62; }
        .piece-video { position: relative; width: 100%; aspect-ratio: 1/1; border-radius: clamp(8px,1.2vw,14px); overflow: hidden; border: 1px solid var(--border); background: var(--surface); }
        .piece-video video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .piece-video img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .piece-video-overlay { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to top, rgba(6,6,10,0.55) 0%, transparent 42%); }
        .piece-ghost { position: absolute; bottom: 14px; left: 18px; font-family: var(--font); font-style: italic; font-weight: 300; font-size: clamp(48px,10vw,92px); line-height: 1; color: rgba(230,221,208,0.07); user-select: none; pointer-events: none; }
        .piece-frag { position: absolute; bottom: 20px; right: 20px; font-family: var(--font); font-style: italic; font-size: clamp(10px,1.2vw,12px); letter-spacing: 0.14em; color: var(--cream-dim); }
        .piece-placeholder { background: var(--surface); pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; position: absolute; inset: 0; }
        .piece-tease-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.30; filter: brightness(0.6) saturate(0.65); }
        .piece-tease-overlay { position: absolute; inset: 0; background: rgba(6,6,10,0.35); pointer-events: none; }
        .piece-tease-badge { position: absolute; bottom: 24px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .piece-tease-label { font-family: var(--font); font-style: italic; font-size: clamp(10px,1.2vw,12px); letter-spacing: 0.34em; text-transform: uppercase; color: var(--cream-dim); opacity: 0.55; }
        @keyframes shimmer {
          0%   { transform: translateX(-130%) skewX(-15deg); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateX(230%) skewX(-15deg); opacity: 0; }
        }
        .piece-shimmer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: inherit; }
        .piece-shimmer::after {
          content: ''; position: absolute; top: -30%; bottom: -30%; width: 22%;
          background: linear-gradient(105deg, transparent 0%, rgba(240,232,220,0.025) 35%, rgba(240,232,220,0.07) 50%, rgba(240,232,220,0.025) 65%, transparent 100%);
          animation: shimmer 3.2s cubic-bezier(0.4,0,0.2,1) infinite;
          animation-delay: 1.2s;
        }
        .manifold-wrap { width: 100%; border-radius: clamp(8px,1.2vw,14px); overflow: hidden; border: 1px solid var(--border); background: var(--surface); margin-top: clamp(12px,2vw,20px); contain: paint; will-change: contents; display: block; }
        .manifold-wrap div, .manifold-wrap m-claim-complete { width: 100% !important; max-width: 100% !important; box-sizing: border-box; background: #0f0d16 !important; color: #e6ddd0 !important; }
        .manifold-wrap button {
          font-family: 'Cormorant Garamond', Georgia, serif !important;
          font-style: italic !important; font-weight: 300 !important;
          letter-spacing: 0.28em !important; text-transform: uppercase !important;
          border-radius: 10px !important;
          transition: background 0.45s, border-color 0.45s, transform 0.3s !important;
        }
        .manifold-wrap button[class*="buy"],
        .manifold-wrap button[class*="mint"],
        .manifold-wrap button[class*="claim"],
        .manifold-wrap .m-btn-primary {
          background: linear-gradient(135deg, rgba(122,20,36,0.18) 0%, rgba(80,12,50,0.12) 100%) !important;
          border: 1px solid rgba(122,20,36,0.5) !important;
          color: #f0e8dc !important;
        }
        .manifold-wrap button[class*="buy"]:hover,
        .manifold-wrap button[class*="mint"]:hover,
        .manifold-wrap button[class*="claim"]:hover,
        .manifold-wrap .m-btn-primary:hover {
          background: linear-gradient(135deg, rgba(122,20,36,0.28) 0%, rgba(80,12,50,0.20) 100%) !important;
          border-color: rgba(122,20,36,0.8) !important;
          transform: translateY(-1px) !important;
        }
        .collect-fallback { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: clamp(16px,2.5vw,24px) 0 0; }
        .collect-meta { font-family: var(--font); font-style: italic; font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--silver); opacity: 0.28; }
        .collect-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 11px;
          width: 100%; padding: 17px 28px; border-radius: 10px;
          border: 1px solid rgba(122,20,36,0.45);
          background: linear-gradient(135deg, rgba(122,20,36,0.16) 0%, rgba(80,12,50,0.10) 100%);
          font-family: var(--font); font-style: italic;
          font-size: clamp(12px,1.5vw,14px); letter-spacing: 0.3em; text-transform: uppercase;
          color: var(--cream); text-decoration: none; cursor: pointer; position: relative; overflow: hidden;
          transition: border-color 0.45s, background 0.45s, transform 0.3s;
        }
        .collect-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%);
          transform: translateX(-100%); transition: transform 0.7s ease;
        }
        .collect-btn:hover::before { transform: translateX(100%); }
        .collect-btn:hover { border-color: rgba(122,20,36,0.75); background: linear-gradient(135deg, rgba(122,20,36,0.24) 0%, rgba(80,12,50,0.16) 100%); transform: translateY(-1px); }
        .collect-btn:active { transform: translateY(0); }
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
        .footer-gwei { display: flex; align-items: center; gap: 5px; opacity: 0.32; transition: opacity 0.3s; cursor: pointer; text-decoration: none; }
        .footer-gwei:hover { opacity: 0.65; }
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
                    <svg viewBox="2800 2150 2450 3750" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                      <defs>
                        <radialGradient id="pz-a" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#7a1424" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#7a1424" stopOpacity="0"/>
                        </radialGradient>
                        <radialGradient id="pz-b" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#9a1830" stopOpacity="0.65"/>
                          <stop offset="100%" stopColor="#7a1424" stopOpacity="0"/>
                        </radialGradient>
                        <filter id="pz-f" x="-15%" y="-15%" width="130%" height="130%">
                          <feGaussianBlur stdDeviation="60" result="b"/>
                          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
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
                      <rect
                        x="3620" y="3880"
                        width="780" height="340"
                        rx="60"
                        fill="rgba(6,6,10,0.35)"
                      />
                      <text
                        x="4008" y="4060"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontFamily="Cormorant Garamond, Georgia, serif"
                        fontStyle="italic"
                        fontWeight="300"
                        fontSize="300"
                        letterSpacing="120"
                        fill="rgba(240,232,220,0.75)"
                      >{'Enter'}</text>
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
                      { label: 'Together In Bloom', href: 'https://manifold.xyz/@nikxnames-art' },
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
                    <span className="collection-count">{ownedPieces.length} of 27</span>
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
                Together It Blooms
              </motion.h1>
              <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}>
                An on-chain art discovery experience
              </motion.p>
            </header>

            <motion.div className="banner-outer" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 1.2 }}>
              <div className="banner-inner">
                <img
                  key={`${dark ? 'dark' : 'light'}-${bannerEvolved ? 'evolved' : 'base'}`}
                  src={dark
                    ? (bannerEvolved ? BANNER_DARK_PC01.src  : BANNER_DARK.src)
                    : (bannerEvolved ? BANNER_LIGHT_PC01.src : BANNER_LIGHT.src)}
                  srcSet={dark
                    ? (bannerEvolved ? BANNER_DARK_PC01.srcSet  : BANNER_DARK.srcSet)
                    : (bannerEvolved ? BANNER_LIGHT_PC01.srcSet : BANNER_LIGHT.srcSet)}
                  sizes={BANNER_SIZES}
                  alt="Together In Bloom — A Familiar Burn"
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
                  <a
                    href="https://etherscan.io/gastracker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-gwei"
                    title={`Ethereum gas: ${gwei} gwei — click to view gas tracker`}
                    style={{ textDecoration: 'none' }}
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