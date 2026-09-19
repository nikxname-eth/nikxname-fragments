import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ExploreWork } from '../config/catalog';
import {
  catalogueThumbUrl,
  defaultTierId,
  HI_LONG_EDGE,
  isVideoWork,
  lowerTierId,
  mediaTiersFor,
  stillMasterUrl,
  theatreStillUrl,
  type MediaTierId,
} from '../lib/mediaUrl';
import { captureHang } from '../lib/captureHang';
import { frameCssVars, type FrameTone } from '../lib/frameFinish';
import { LookBook } from './LookBook';

const WALL_PAPERS: { id: string; name: string; src: string; hex: string; pale: boolean }[] = [
  { id: 'linen', name: 'Linen', src: '/garden/walls/linen.webp', hex: '#e6ded0', pale: true },
  { id: 'plaster', name: 'Plaster', src: '/garden/walls/plaster.webp', hex: '#d2ccc2', pale: true },
  { id: 'clay', name: 'Clay wash', src: '/garden/walls/clay.webp', hex: '#c4b09a', pale: true },
  { id: 'slate', name: 'Slate lime', src: '/garden/walls/slate.webp', hex: '#4a4e54', pale: false },
  { id: 'charcoal', name: 'Charcoal', src: '/garden/walls/charcoal.webp', hex: '#1a1c20', pale: false },
  { id: 'umber', name: 'Umber', src: '/garden/walls/umber.webp', hex: '#3a342e', pale: false },
];

const WALLS = [
  '#0e0f12',
  '#16181c',
  '#1e2126',
  '#282c32',
  '#343840',
  '#434850',
  '#5a6068',
  '#737980',
  '#9aa0a6',
  '#c5c8cc',
  '#eeeae4',
] as const;

/** 11×11 house-paint card: rows are hue families, columns run light → dark. */
const PAINT_CHART: { name: string; hex: string }[][] = [
  [
    { name: 'All White', hex: '#F3F2ED' },
    { name: 'Chantilly Lace', hex: '#F2F3EE' },
    { name: 'Pointing', hex: '#F0EBE0' },
    { name: 'Wimborne White', hex: '#EFECE3' },
    { name: 'White Dove', hex: '#EDEAE0' },
    { name: 'Wevet', hex: '#E8E4DB' },
    { name: 'Strong White', hex: '#E6E2D8' },
    { name: 'Slipper Satin', hex: '#E6DED2' },
    { name: 'Dimity', hex: '#E8DECF' },
    { name: 'Old White', hex: '#E4DCCE' },
    { name: 'New White', hex: '#E3D7C3' },
  ],
  [
    { name: 'Ammonite', hex: '#DBD6CC' },
    { name: 'Pale Oak', hex: '#D6D0C2' },
    { name: 'Shaded White', hex: '#D4CEC4' },
    { name: 'Cornforth White', hex: '#D2CCC0' },
    { name: 'Bone', hex: '#D8CCB8' },
    { name: 'Skimming Stone', hex: '#C8C0B4' },
    { name: 'Drop Cloth', hex: '#C8BCA8' },
    { name: 'String', hex: '#D0C09C' },
    { name: 'Jitney', hex: '#C4B49A' },
    { name: 'Oxford Stone', hex: '#C8B294' },
    { name: 'Stony Ground', hex: '#C0B092' },
  ],
  [
    { name: 'Pale Hound', hex: '#E0D2A0' },
    { name: 'Satin', hex: '#E6C898' },
    { name: 'Dayroom Yellow', hex: '#E4C85C' },
    { name: 'Yellow Ground', hex: '#E0B448' },
    { name: 'Savage Ground', hex: '#C4AE82' },
    { name: 'Hay', hex: '#C8B060' },
    { name: 'Sudbury Yellow', hex: '#CC9C38' },
    { name: 'Babouche', hex: '#D8A428' },
    { name: 'Citron', hex: '#B8A428' },
    { name: 'India Yellow', hex: '#B88218' },
    { name: 'Indian Yellow', hex: '#A07018' },
  ],
  [
    { name: 'Tallow', hex: '#E8D0B8' },
    { name: 'Setting Plaster', hex: '#D6B49E' },
    { name: 'Pink Ground', hex: '#DDB8A8' },
    { name: 'Calamine', hex: '#D8B0A8' },
    { name: 'Dead Salmon', hex: '#C09880' },
    { name: 'Orangery', hex: '#C47248' },
    { name: "Charlotte's Locks", hex: '#D45C38' },
    { name: 'Red Earth', hex: '#C45E46' },
    { name: 'London Clay', hex: '#725438' },
    { name: 'Arabica', hex: '#6E4624' },
    { name: 'Mahogany', hex: '#52281C' },
  ],
  [
    { name: 'Middleton Pink', hex: '#D8B4BA' },
    { name: "Nancy's Blushes", hex: '#C89094' },
    { name: 'Rangwali', hex: '#C45468' },
    { name: 'Cinder Rose', hex: '#A8625C' },
    { name: 'Incarnadine', hex: '#A02830' },
    { name: 'Picture Gallery Red', hex: '#9C3E30' },
    { name: 'Eating Room Red', hex: '#862820' },
    { name: 'Crimson', hex: '#8E1A32' },
    { name: 'Preference Red', hex: '#722E36' },
    { name: 'Cubist Red', hex: '#662820' },
    { name: 'Deep Crimson', hex: '#4A0C16' },
  ],
  [
    { name: 'Peignoir', hex: '#D8CCD0' },
    { name: 'Calluna', hex: '#C4B4BC' },
    { name: 'Crocus', hex: '#A07C90' },
    { name: 'Brassica', hex: '#8E6A78' },
    { name: 'Preference Plum', hex: '#5C3048' },
    { name: 'Brinjal', hex: '#542C40' },
    { name: 'Pelt', hex: '#4E3C4C' },
    { name: 'Imperial Purple', hex: '#3C2848' },
    { name: 'Wine Dark', hex: '#3A2432' },
    { name: 'Deep Aubergine', hex: '#2C1824' },
    { name: 'Paean Black', hex: '#24181E' },
  ],
  [
    { name: 'Borrowed Light', hex: '#D4DCE4' },
    { name: 'Parma Gray', hex: '#B0BCC8' },
    { name: 'Light Blue', hex: '#8CA4B8' },
    { name: 'Pale Wedgwood', hex: '#6A8AA8' },
    { name: 'Pitch Blue', hex: '#3C4C78' },
    { name: 'Lulworth Blue', hex: '#2C5E94' },
    { name: "Cook's Blue", hex: '#244C7C' },
    { name: 'St Giles Blue', hex: '#163E82' },
    { name: 'Drawing Room Blue', hex: '#22304C' },
    { name: 'Hague Blue', hex: '#223038' },
    { name: 'Naval', hex: '#1C2A36' },
  ],
  [
    { name: 'Sea Salt', hex: '#C8D0C8' },
    { name: 'Pale Powder', hex: '#C4D0CC' },
    { name: 'Palladian Blue', hex: '#A4B8B2' },
    { name: 'Skylight', hex: '#9CB8BC' },
    { name: 'Blue Ground', hex: '#6AADB8' },
    { name: 'Dix Blue', hex: '#5A8E98' },
    { name: 'Oval Room Blue', hex: '#5A847C' },
    { name: 'Stone Blue', hex: '#4A7888' },
    { name: 'Green Blue', hex: '#3C6C74' },
    { name: 'De Nimes', hex: '#3E5C64' },
    { name: 'Vardo', hex: '#2C5E5C' },
  ],
  [
    { name: 'Cooking Apple Green', hex: '#C0C4A4' },
    { name: 'Vert de Terre', hex: '#A8B07C' },
    { name: 'Lichen', hex: '#8E8E64' },
    { name: 'Breakfast Room Green', hex: '#7A8C54' },
    { name: 'Yeabridge Green', hex: '#6A8838' },
    { name: 'Folly Green', hex: '#5A7A3C' },
    { name: 'Calke Green', hex: '#4C6840' },
    { name: 'Green Smoke', hex: '#4E5C4A' },
    { name: 'Card Room Green', hex: '#444E3C' },
    { name: 'Bancha', hex: '#4E5824' },
    { name: 'Studio Green', hex: '#323A34' },
  ],
  [
    { name: "Elephant's Breath", hex: '#BEB4A8' },
    { name: 'London Stone', hex: '#B4A090' },
    { name: 'Universal Khaki', hex: '#A89270' },
    { name: "Mouse's Back", hex: '#94826C' },
    { name: 'Salon Drab', hex: '#5C4A3A' },
    { name: 'Olive', hex: '#52501C' },
    { name: "Tanner's Brown", hex: '#463830' },
    { name: 'Silhouette', hex: '#423C38' },
    { name: 'Wenge', hex: '#322A2C' },
    { name: 'Boreal Forest', hex: '#243420' },
    { name: 'Espresso', hex: '#241C18' },
  ],
  [
    { name: 'Pavilion Gray', hex: '#C6C1B6' },
    { name: 'Light Gray', hex: '#B4AEA2' },
    { name: 'Purbeck Stone', hex: '#B4ACA0' },
    { name: 'French Gray', hex: '#A8A89C' },
    { name: 'Hardwick White', hex: '#A49C8C' },
    { name: 'Charleston Gray', hex: '#867E74' },
    { name: 'Lamp Room Gray', hex: '#646260' },
    { name: "Mole's Breath", hex: '#6A6058' },
    { name: 'Down Pipe', hex: '#4E5052' },
    { name: 'Railings', hex: '#36383C' },
    { name: 'Pitch Black', hex: '#161616' },
  ],
];

const PAINTS = PAINT_CHART.flat();

function sameHex(a: string, b: string) {
  return a.replace('#', '').toLowerCase() === b.replace('#', '').toLowerCase();
}

function isPaleHex(hex: string) {
  const n = hex.replace('#', '');
  if (n.length < 6) return false;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.52;
}

type Props = {
  works: ExploreWork[];
  catalogue?: ExploreWork[];
  seed?: ExploreWork | null;
  onClose: () => void;
  onObserve?: (work: ExploreWork) => void;
};

const EMPTY_AR = 4 / 5;

function stillCoverSrc(work: ExploreWork): string {
  const list = [work.coverUrl, work.originCoverUrl];
  for (const u of list) {
    if (u && !/\.(mp4|webm|mov)(\?|$)/i.test(u)) return u;
  }
  return '';
}

function cover(work: ExploreWork, wide = false) {
  const raw = stillCoverSrc(work);
  if (!raw) return '';
  return (wide ? catalogueThumbUrl(raw, 900) : catalogueThumbUrl(raw, 280)) || raw;
}

function hangStill(work: ExploreWork) {
  if (isVideoWork(work)) return cover(work, true);
  const raw = stillMasterUrl(work);
  if (!raw) return cover(work, true);
  if (/\.gif(\?|$)/i.test(raw)) return raw;
  return theatreStillUrl(raw, HI_LONG_EDGE) || raw;
}

function ratioProbe(work: ExploreWork) {
  const raw = work.coverUrl || work.originCoverUrl || work.mediaUrl || '';
  if (!raw) return '';
  if (/\.gif(\?|$)/i.test(raw)) return catalogueThumbUrl(raw, 280) || raw;
  return catalogueThumbUrl(raw, 96) || raw;
}

const HANGS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: 'Single' },
  { n: 2, label: 'Diptych' },
  { n: 3, label: 'Triptych' },
];

const FRAME_TONES: { id: FrameTone; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'med', label: 'Med' },
  { id: 'light', label: 'Light' },
];

function HangGlyph({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="ex-arrange-hang-glyph" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

/**
 * Near-future: left catalogue drawer (desktop + mobile) so patrons can hang
 * any Nikxname work without owning it. Red/green availability dots from a
 * Raster + ownership layer — browse-to-hang, then live sold/available.
 */
export function ArrangeWall({ works, catalogue, seed, onClose, onObserve }: Props) {
  const [frames, setFrames] = useState<1 | 2 | 3>(1);
  const [wallColor, setWallColor] = useState<string>('#4a4e54');
  const [wallPaperId, setWallPaperId] = useState<string | null>('slate');
  const wallPaper = WALL_PAPERS.find((p) => p.id === wallPaperId) ?? null;
  const [frameTone, setFrameTone] = useState<FrameTone>('med');
  const [paintsOpen, setPaintsOpen] = useState(false);
  const [paintHint, setPaintHint] = useState<string | null>(null);
  const [slots, setSlots] = useState<(ExploreWork | null)[]>([null, null]);
  const [active, setActive] = useState<number | null>(0);
  const [trayOpen, setTrayOpen] = useState(true);
  const [lookOpen, setLookOpen] = useState(false);
  const ownedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of works) {
      ids.add(w.id);
      if (w.tokenId != null) ids.add(`${w.seriesId}-${w.tokenId}`);
    }
    return ids;
  }, [works]);
  const lookCatalogue = catalogue?.length ? catalogue : works;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragFromSlot, setDragFromSlot] = useState<number | null>(null);
  const hangDrag = useRef<{ from: number; x: number; y: number; moved: boolean } | null>(
    null,
  );
  const skipSlotClick = useRef(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [autoFrame] = useState(true);
  const [deepMat, setDeepMat] = useState(false);
  const [ratios, setRatios] = useState<Record<string, { w: number; h: number }>>({});
  const [quality, setQuality] = useState<Record<string, MediaTierId>>({});
  const [hang, setHang] = useState(0.72);
  const [sharing, setSharing] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [qShow, setQShow] = useState<Record<string, boolean>>({});
  const hangRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [immersive, setImmersive] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);
  const paintsRef = useRef<HTMLDivElement>(null);
  const qTimers = useRef<Record<string, number>>({});
  const trayClose = useRef(0);
  const paintsLeave = useRef(0);
  const pale = wallPaper ? wallPaper.pale : isPaleHex(wallColor);
  const paintName = PAINTS.find((p) => sameHex(p.hex, wallColor))?.name;

  const filled = useMemo(() => slots.filter(Boolean).length, [slots]);
  const hangReady = filled >= frames;
  const hangHasMotion = useMemo(
    () =>
      slots.some(
        (w) =>
          w &&
          (isVideoWork(w) ||
            /\.gif(\?|$)/i.test(w.coverUrl || '') ||
            /\.gif(\?|$)/i.test(w.mediaUrl || '')),
      ),
    [slots],
  );

  const flashQuality = useCallback((id: string) => {
    setQShow((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
    window.clearTimeout(qTimers.current[id]);
    qTimers.current[id] = window.setTimeout(() => {
      setQShow((prev) => ({ ...prev, [id]: false }));
    }, 3000);
  }, []);

  useEffect(() => {
    setSlots((prev) => {
      const next = prev.slice(0, frames);
      while (next.length < frames) next.push(null);
      return next;
    });
    setActive(0);
  }, [frames]);

  useEffect(() => {
    if (!seed) return;
    setSlots((prev) => {
      const next = [...prev];
      next[0] = seed;
      return next;
    });
    setActive(1 % frames);
    setLookOpen(false);
  }, [seed, frames]);

  const openTray = useCallback(() => {
    window.clearTimeout(trayClose.current);
    setTrayOpen(true);
  }, []);

  const toggleImmersive = useCallback(async () => {
    const el = stageRef.current;
    if (!immersive) {
      try {
        if (el?.requestFullscreen) await el.requestFullscreen();
        else if (el && 'webkitRequestFullscreen' in el) {
          await (el as HTMLDivElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      } catch {
        /* iOS often rejects element fullscreen — CSS immersive still applies */
      }
      setImmersive(true);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
    setImmersive(false);
  }, [immersive]);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setImmersive(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const closeTrayIfHung = useCallback(
    (nextSlots: (ExploreWork | null)[]) => {
      window.clearTimeout(trayClose.current);
      const full = nextSlots.slice(0, frames).filter(Boolean).length >= frames;
      if (!full) return;
      trayClose.current = window.setTimeout(() => setTrayOpen(false), 1200);
    },
    [frames],
  );

  useEffect(() => {
    for (const w of slots) {
      if (w && isVideoWork(w)) flashQuality(w.id);
    }
  }, [slots, flashQuality]);

  useEffect(() => {
    const timers = qTimers.current;
    return () => {
      Object.values(timers).forEach((t) => window.clearTimeout(t));
      window.clearTimeout(trayClose.current);
      window.clearTimeout(paintsLeave.current);
    };
  }, []);

  useEffect(() => {
    if (!trayOpen || active == null) return;
    const slot = hangRef.current?.querySelector(`[data-slot="${active}"]`);
    const tray = trayRef.current;
    if (!slot || !tray) return;
    const placeSpot = () => {
      const frame = slot.querySelector('.ex-arrange-frame') ?? slot;
      const sr = frame.getBoundingClientRect();
      const tr = tray.getBoundingClientRect();
      tray.style.setProperty('--spot-x', `${sr.left + sr.width / 2 - tr.left}px`);
      tray.style.setProperty('--spot-w', `${Math.max(sr.width * 0.38, 48)}px`);
    };
    placeSpot();
    window.addEventListener('resize', placeSpot);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', placeSpot);
    vv?.addEventListener('scroll', placeSpot);
    const ro = new ResizeObserver(placeSpot);
    ro.observe(slot);
    const frameEl = slot.querySelector('.ex-arrange-frame');
    if (frameEl) ro.observe(frameEl);
    return () => {
      window.removeEventListener('resize', placeSpot);
      vv?.removeEventListener('resize', placeSpot);
      vv?.removeEventListener('scroll', placeSpot);
      ro.disconnect();
    };
  }, [trayOpen, active, frames, hang, step, deepMat, slots, wallPaperId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lookOpen) {
        setLookOpen(false);
        return;
      }
      if (paintsOpen) {
        setPaintsOpen(false);
        return;
      }
      if (roomOpen) {
        setRoomOpen(false);
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, paintsOpen, roomOpen, lookOpen]);

  useEffect(() => {
    if (!paintsOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!paintsRef.current?.contains(e.target as Node)) setPaintsOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [paintsOpen]);

  const place = useCallback((index: number, work: ExploreWork) => {
    setSlots((prev) => {
      const next = [...prev];
      const already = next.findIndex((s) => s?.id === work.id);
      if (already >= 0 && already !== index) next[already] = null;
      next[index] = work;
      closeTrayIfHung(next);
      return next;
    });
    setActive((index + 1) % frames);
  }, [frames, closeTrayIfHung]);

  const swapSlots = useCallback((from: number, to: number) => {
    if (from === to) return;
    setSlots((prev) => {
      const next = [...prev];
      const held = next[from];
      next[from] = next[to];
      next[to] = held;
      return next;
    });
    setActive(to);
  }, []);

  const uniqueWorks = useMemo(() => {
    const seen = new Set<string>();
    return works.filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return Boolean(cover(w)) || isVideoWork(w);
    });
  }, [works]);

  useEffect(() => {
    let cancelled = false;
    uniqueWorks.forEach((work) => {
      if (isVideoWork(work)) return;
      const src = ratioProbe(work);
      if (!src || /\.gif(\?|$)/i.test(src)) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
        setRatios((prev) =>
          prev[work.id]
            ? prev
            : { ...prev, [work.id]: { w: img.naturalWidth, h: img.naturalHeight } },
        );
      };
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, [uniqueWorks]);

  const slotArs = useMemo(
    () =>
      slots.map((work) => {
        if (!autoFrame) return EMPTY_AR;
        if (work && ratios[work.id]?.w && ratios[work.id]?.h) {
          return ratios[work.id].w / ratios[work.id].h;
        }
        return EMPTY_AR;
      }),
    [slots, ratios, autoFrame],
  );
  const sumAr = slotArs.reduce((n, ar) => n + ar, 0) || EMPTY_AR * frames;

  const shareHang = useCallback(async () => {
    if (!hangReady || sharing) return;
    const hung = slots.filter((w): w is ExploreWork => Boolean(w));
    if (hung.length < frames) return;
    setSharing(true);
    setSaveErr(null);
    try {
      const slotNodes = hangRef.current
        ? hangRef.current.querySelectorAll<HTMLElement>('[data-slot]')
        : [];
      let paperEl: HTMLImageElement | null = null;
      if (wallPaper) {
        paperEl = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = wallPaper.src;
        });
      }
      await captureHang({
        wallColor: wallPaper?.hex ?? wallColor,
        frameTone,
        hang,
        step,
        deepMat,
        wallPaper: paperEl,
        pieces: slots.flatMap((work, i) => {
          if (!work) return [];
          const media = slotNodes[i]?.querySelector('img, video') as
            | HTMLImageElement
            | HTMLVideoElement
            | null;
          return [
            {
              work,
              ar: slotArs[i] ?? EMPTY_AR,
              media,
            },
          ];
        }),
        filename: `nikxart-${frames === 1 ? 'single' : frames === 3 ? 'triptych' : 'diptych'}.${hangHasMotion ? 'mp4' : 'jpg'}`,
      });
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Could not save this hang');
    } finally {
      setSharing(false);
    }
  }, [hangReady, sharing, slots, frames, wallColor, frameTone, hang, step, slotArs, hangHasMotion, wallPaper, deepMat]);

  return (
    <motion.div
      ref={stageRef}
      className={`ex-arrange${pale ? ' is-pale' : ''}${wallPaper ? ' has-paper' : ''}${immersive ? ' is-immersive' : ''}`}
      style={{
        backgroundColor: wallPaper?.hex ?? wallColor,
        backgroundImage: wallPaper ? `url(${wallPaper.src})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...frameCssVars(wallPaper?.hex ?? wallColor, frameTone),
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Your Atelier"
    >
      <LookBook
        open={lookOpen}
        catalogue={lookCatalogue}
        ownedIds={ownedIds}
        onToggle={() => setLookOpen((v) => !v)}
        onHang={(w) => {
          const slot = active ?? slots.findIndex((s) => !s);
          if (slot >= 0) place(slot, w);
          setLookOpen(false);
        }}
        onObserve={(w) => {
          setLookOpen(false);
          onObserve?.(w);
        }}
      />
      <header className="ex-arrange-top">
        <button type="button" className="ex-arrange-text" onClick={onClose}>
          ← Garden
        </button>
        <p className="ex-arrange-name">Your Atelier</p>
        <div className="ex-arrange-modes" role="group" aria-label="Hang">
          {HANGS.map((h) => (
            <button
              key={h.n}
              type="button"
              className={`ex-arrange-mode${frames === h.n ? ' is-on' : ''}`}
              onClick={() => setFrames(h.n)}
              title={h.label}
              aria-label={h.label}
              aria-pressed={frames === h.n}
            >
              <HangGlyph n={h.n} />
              <span className="ex-arrange-mode-label">{h.label}</span>
            </button>
          ))}
          <span className="ex-arrange-sep ex-arrange-desk-only" aria-hidden>
            |
          </span>
          <button
            type="button"
            className={`ex-arrange-mode ex-arrange-desk-only${step === 0 ? ' is-on' : ''}`}
            onClick={() => setStep(0)}
          >
            Regular
          </button>
          <button
            type="button"
            className={`ex-arrange-mode ex-arrange-desk-only${step === 1 ? ' is-on' : ''}`}
            onClick={() => setStep(1)}
            title="Step back"
          >
            X1
          </button>
          <button
            type="button"
            className={`ex-arrange-mode ex-arrange-desk-only${step === 2 ? ' is-on' : ''}`}
            onClick={() => setStep(2)}
            title="Step further back"
          >
            X2
          </button>
          <span className="ex-arrange-sep ex-arrange-desk-only" aria-hidden>
            |
          </span>
          <div className="ex-arrange-frame-tones ex-arrange-desk-only" role="group" aria-label="Frame">
            {FRAME_TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ex-arrange-mode${frameTone === t.id ? ' is-on' : ''}`}
                onClick={() => setFrameTone(t.id)}
                title={`${t.label} frame`}
                aria-label={`${t.label} frame`}
                aria-pressed={frameTone === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ex-arrange-walls" role="group" aria-label="Wall colour">
          {WALLS.map((c) => (
            <button
              key={c}
              type="button"
              className={`ex-arrange-swatch${sameHex(wallColor, c) ? ' is-on' : ''}`}
              style={{ background: c }}
              aria-label={`Wall ${c}`}
              onClick={() => {
                setWallColor(c);
                setWallPaperId(null);
                setPaintsOpen(false);
              }}
            />
          ))}
          <div
            className="ex-arrange-paints-wrap"
            ref={paintsRef}
            onMouseEnter={() => window.clearTimeout(paintsLeave.current)}
            onMouseLeave={() => {
              window.clearTimeout(paintsLeave.current);
              paintsLeave.current = window.setTimeout(() => setPaintsOpen(false), 1000);
            }}
          >
            <button
              type="button"
              className={`ex-arrange-paints-toggle${paintsOpen ? ' is-on' : ''}`}
              aria-label="House paints"
              aria-expanded={paintsOpen}
              title="House paints"
              onClick={() => {
                window.clearTimeout(paintsLeave.current);
                setPaintHint(null);
                setPaintsOpen((v) => !v);
              }}
            >
              <span aria-hidden>▾</span>
            </button>
            {paintsOpen ? (
              <div className="ex-arrange-paints" role="listbox" aria-label="House paints">
                {PAINTS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    role="option"
                    aria-selected={sameHex(wallColor, p.hex)}
                    className={`ex-arrange-paint${sameHex(wallColor, p.hex) ? ' is-on' : ''}`}
                    style={{ background: p.hex }}
                    title={p.name}
                    aria-label={p.name}
                    onMouseEnter={() => setPaintHint(p.name)}
                    onMouseLeave={() => setPaintHint(null)}
                    onFocus={() => setPaintHint(p.name)}
                    onBlur={() => setPaintHint(null)}
                    onClick={() => {
                      setWallColor(p.hex);
                      setWallPaperId(null);
                    }}
                  />
                ))}
                <p className="ex-arrange-paints-name">{paintHint ?? paintName ?? 'House paints'}</p>
              </div>
            ) : null}
          </div>
          <span className="ex-arrange-sep" aria-hidden>
            |
          </span>
          <div className="ex-arrange-papers" role="group" aria-label="Wall papers">
            {WALL_PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ex-arrange-paper${wallPaperId === p.id ? ' is-on' : ''}`}
                style={{ backgroundImage: `url(${p.src})`, backgroundColor: p.hex }}
                title={p.name}
                aria-label={p.name}
                aria-pressed={wallPaperId === p.id}
                onClick={() => {
                  setWallPaperId(p.id);
                  setWallColor(p.hex);
                  setPaintsOpen(false);
                }}
              />
            ))}
          </div>
        </div>
        <div className="ex-arrange-save">
          <button
            type="button"
            className={`ex-arrange-share${hangReady ? ' is-ready' : ''}${saveErr ? ' is-err' : ''}`}
            disabled={!hangReady || sharing}
            onClick={() => void shareHang()}
            title={
              saveErr
                ? saveErr
                : hangReady
                  ? hangHasMotion
                    ? 'Save a 1080p MP4 of this hang (X-ready) to Downloads'
                    : 'Save a high-res image of this hang to Downloads'
                  : 'Hang a work in every frame to save'
            }
          >
            {sharing ? (hangHasMotion ? 'Encoding…' : 'Saving…') : saveErr ? 'Retry' : 'Save'}
          </button>
          {saveErr ? (
            <span className="ex-arrange-save-err" role="status">
              {saveErr}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className={`ex-arrange-room${roomOpen ? ' is-on' : ''}`}
          onClick={() => setRoomOpen((v) => !v)}
          aria-pressed={roomOpen}
          aria-label={roomOpen ? 'Close room settings' : 'Room settings'}
          title="Wall & frame"
        >
          ▤
        </button>
        <button
          type="button"
          className="ex-arrange-fs"
          onClick={() => void toggleImmersive()}
          aria-pressed={immersive}
          aria-label={immersive ? 'Exit fullscreen' : 'Fullscreen'}
          title={immersive ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {immersive ? '✕' : '▣'}
        </button>
        <button type="button" className="ex-arrange-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      {roomOpen ? (
        <aside className="ex-arrange-room-panel" aria-label="Room">
          <p className="ex-arrange-room-label">Wall</p>
          <div className="ex-arrange-room-row" role="group" aria-label="Wall papers">
            {WALL_PAPERS.filter((p) => p.id !== 'umber').map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ex-arrange-paper${wallPaperId === p.id ? ' is-on' : ''}`}
                style={{ backgroundImage: `url(${p.src})`, backgroundColor: p.hex }}
                title={p.name}
                aria-label={p.name}
                aria-pressed={wallPaperId === p.id}
                onClick={() => {
                  setWallPaperId(p.id);
                  setWallColor(p.hex);
                }}
              />
            ))}
          </div>
          <p className="ex-arrange-room-label">Frame</p>
          <div className="ex-arrange-room-row" role="group" aria-label="Frame">
            {FRAME_TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ex-arrange-mode${frameTone === t.id ? ' is-on' : ''}`}
                onClick={() => setFrameTone(t.id)}
                aria-pressed={frameTone === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="ex-arrange-room-label">Step</p>
          <div className="ex-arrange-room-row" role="group" aria-label="Step back">
            <button
              type="button"
              className={`ex-arrange-mode${step === 0 ? ' is-on' : ''}`}
              onClick={() => setStep(0)}
            >
              Regular
            </button>
            <button
              type="button"
              className={`ex-arrange-mode${step === 1 ? ' is-on' : ''}`}
              onClick={() => setStep(1)}
              title="Step back"
            >
              X1
            </button>
          </div>
        </aside>
      ) : null}

      <div
        className={`ex-arrange-wall is-${frames} is-step-${step} is-frame-${frameTone}${autoFrame ? ' is-auto' : ''}${deepMat ? ' is-mat' : ''}`}
        style={{
          ['--hang' as string]: String(hang),
          ['--sum-ar' as string]: String(sumAr),
          ['--n' as string]: String(frames),
          ['--gap-n' as string]: String(Math.max(0, frames - 1)),
        }}
        onPointerDown={(e) => {
          if (!hangReady) return;
          const t = e.target as HTMLElement;
          if (t.closest('.ex-arrange-slot, .ex-arrange-auto, .ex-arrange-tight, button, a, input, label')) {
            return;
          }
          window.clearTimeout(trayClose.current);
          setTrayOpen(false);
        }}
      >
        <button
          type="button"
          className={`ex-arrange-auto${deepMat ? ' is-on' : ''}`}
          onClick={() => setDeepMat((v) => !v)}
          title="Widen the mat between the work and the frame"
          aria-pressed={deepMat}
          aria-label="Reframe mat"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
            <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <rect x="4.2" y="4.2" width="7.6" height="7.6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
        <div
          className={`ex-arrange-cluster${hangHasMotion ? ' has-q' : ''}${slots.some((w) => w && qShow[w.id]) ? ' is-q-show' : ''}`}
          ref={hangRef}
        >
          {slots.map((work, i) => {
            const ar = slotArs[i] ?? EMPTY_AR;
            const tiers = work ? mediaTiersFor(work) : [];
            const video = Boolean(work && isVideoWork(work) && tiers.some((t) => t.kind === 'video'));
            const tierId = work ? quality[work.id] || defaultTierId(tiers) : '1080';
            return (
              <div
                key={i}
                data-slot={i}
                className={`ex-arrange-slot${active === i ? ' is-active' : ''}${work ? ' has-art' : ''}${dragFromSlot === i ? ' is-dragging' : ''}`}
                aria-current={active === i ? 'true' : undefined}
                onDragOver={(e) => {
                  e.preventDefault();
                  setActive(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromRaw = e.dataTransfer.getData('text/slot-index');
                  const from =
                    fromRaw !== '' ? Number(fromRaw) : dragFromSlot;
                  const id = e.dataTransfer.getData('text/work-id') || dragId;
                  const found = uniqueWorks.find((w) => w.id === id);
                  if (!found) return;
                  if (from != null && Number.isInteger(from) && from !== i) {
                    swapSlots(from, i);
                  } else {
                    place(i, found);
                  }
                }}
                onClick={() => {
                  if (skipSlotClick.current) {
                    skipSlotClick.current = false;
                    return;
                  }
                  setActive(i);
                  openTray();
                  if (work) flashQuality(work.id);
                }}
                onPointerDown={(e) => {
                  if (!work) return;
                  if ((e.target as HTMLElement).closest('button')) return;
                  hangDrag.current = { from: i, x: e.clientX, y: e.clientY, moved: false };
                }}
                onPointerMove={(e) => {
                  if (work) flashQuality(work.id);
                  const drag = hangDrag.current;
                  if (!drag) return;
                  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 14) {
                    drag.moved = true;
                    setDragFromSlot(drag.from);
                    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                  }
                  if (!drag.moved) return;
                  const under = document.elementFromPoint(e.clientX, e.clientY);
                  const slot = under?.closest('[data-slot]') as HTMLElement | null;
                  const idx = slot ? Number(slot.dataset.slot) : NaN;
                  if (Number.isInteger(idx)) setActive(idx);
                }}
                onPointerUp={(e) => {
                  const drag = hangDrag.current;
                  hangDrag.current = null;
                  setDragFromSlot(null);
                  if (!drag?.moved) return;
                  skipSlotClick.current = true;
                  const under = document.elementFromPoint(e.clientX, e.clientY);
                  const slot = under?.closest('[data-slot]') as HTMLElement | null;
                  const to = slot ? Number(slot.dataset.slot) : NaN;
                  if (Number.isInteger(to) && to !== drag.from) swapSlots(drag.from, to);
                }}
                onPointerCancel={() => {
                  hangDrag.current = null;
                  setDragFromSlot(null);
                }}
              >
                <div
                  className="ex-arrange-frame"
                  style={{ ['--ar' as string]: String(ar) }}
                >
                  <div className="ex-arrange-mat">
                    {work ? (
                      (() => {
                        const activeTier = tiers.find((t) => t.id === tierId) || tiers[0];
                        const noteRatio = (w: number, h: number) => {
                          if (!w || !h) return;
                          setRatios((prev) => {
                            const cur = prev[work.id];
                            if (cur && cur.w === w && cur.h === h) return prev;
                            return { ...prev, [work.id]: { w, h } };
                          });
                        };
                        return video && activeTier ? (
                          <video
                            key={activeTier.url}
                            src={activeTier.url}
                            poster={
                              work.originCoverUrl && !/\.gif(\?|$)/i.test(work.originCoverUrl)
                                ? catalogueThumbUrl(work.originCoverUrl, 900) || work.originCoverUrl
                                : stillCoverSrc(work) || undefined
                            }
                            muted
                            loop
                            autoPlay
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                              const v = e.currentTarget;
                              noteRatio(v.videoWidth, v.videoHeight);
                            }}
                            onError={() => {
                              const lower = lowerTierId(tiers, tierId);
                              if (lower) {
                                setQuality((prev) => ({ ...prev, [work.id]: lower }));
                              }
                            }}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={hangStill(work)}
                            alt={work.title}
                            draggable={false}
                            loading="eager"
                            decoding="async"
                            onLoad={(e) => {
                              const img = e.currentTarget;
                              noteRatio(img.naturalWidth, img.naturalHeight);
                            }}
                          />
                        );
                      })()
                    ) : (
                      <span className="ex-arrange-empty">
                        {i === active ? 'Selected — choose a work below' : 'Click to select'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {slots.map((work, i) => {
            const tiers = work ? mediaTiersFor(work) : [];
            const workId = work?.id;
            const show = Boolean(work && workId && isVideoWork(work) && tiers.length > 1);
            const tierId = workId ? quality[workId] || defaultTierId(tiers) : '1080';
            return (
              <div
                key={`q-${i}`}
                className="ex-arrange-q-cell"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {show && workId ? (
                  <div className="ex-arrange-q" role="group" aria-label="Playback quality">
                    {tiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        className={`ex-arrange-q-btn${tierId === tier.id ? ' is-on' : ''}`}
                        onClick={() => {
                          setQuality((prev) => ({ ...prev, [workId]: tier.id }));
                          flashQuality(workId);
                        }}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <label
          className="ex-arrange-tight"
          title="Hang tightness — larger frames, closer together"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(hang * 100)}
            aria-label="Hang tightness"
            onChange={(e) => setHang(Number(e.target.value) / 100)}
          />
        </label>
      </div>

      <div
        ref={trayRef}
        className={`ex-arrange-tray${trayOpen ? ' is-open' : ''}${active != null ? ' has-spot' : ''}`}
      >
        <span className="ex-arrange-spot" aria-hidden />
        <p className="ex-arrange-cue">Click a frame to select it, then choose a work.</p>
        <button
          type="button"
          className="ex-arrange-tray-toggle"
          onClick={() => {
            if (trayOpen) {
              window.clearTimeout(trayClose.current);
              setTrayOpen(false);
            } else {
              openTray();
            }
          }}
          aria-expanded={trayOpen}
        >
          {trayOpen ? 'Hide works' : 'Change works'}
        </button>
        <div className="ex-arrange-tray-body">
          <p className="ex-arrange-hint">
            {active == null
              ? 'Drag a work onto a frame, or drag a hung work onto another frame to swap.'
              : `Placing in frame ${active + 1} of ${frames} — drag hung works to rearrange.`}
          </p>
          <div className="ex-arrange-strip" role="list">
            {uniqueWorks.map((work) => {
              const used = slots.some((s) => s?.id === work.id);
              return (
                <button
                  key={work.id}
                  type="button"
                  className={`ex-arrange-thumb${used ? ' is-used' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setDragId(work.id);
                    setDragFromSlot(null);
                    e.dataTransfer.setData('text/work-id', work.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => {
                    const slot = active ?? slots.findIndex((s) => !s);
                    if (slot >= 0) place(slot, work);
                  }}
                  title={work.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover(work)} alt="" draggable={false} loading="lazy" decoding="async" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
