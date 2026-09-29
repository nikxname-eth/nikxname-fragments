import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { composePainting } from '../lib/studio/generate';
import { isStudioOpen } from '../lib/studio/gate';
import { preload, renderPainting, type PaintPhase } from '../lib/studio/render';
import { seedFromClick } from '../lib/studio/rng';
import { addHold, dropHold, HOLD_MAX, HOLD_MS, pruneHolds, remainingMs, type HeldStudy } from '../lib/studio/hold';
import { dropStar, findStar, loadStars, mergeStars, replaceStars, STAR_MAX, syncStarToDisk, upsertStar, type StarredStudy } from '../lib/studio/stars';
import { claimUniqueSeed, usedSeedCount } from '../lib/studio/seeds';
import type { Catalog, CountBand, Family, Flow, GradeKind, Ground, Mode, Painting } from '../lib/studio/types';
import { GRADE_KINDS, GRADE_LABELS, MINT_LONG } from '../lib/studio/types';

const LAST_KEY = 'fob-last';

function isCompactView() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 900;
}

function liveSize() {
  return isCompactView() ? 640 : 1100;
}

function makeThumb(src: HTMLCanvasElement, long = 360) {
  const { w, h } = src.width >= src.height
    ? { w: long, h: Math.max(1, Math.round((long * src.height) / src.width)) }
    : { h: long, w: Math.max(1, Math.round((long * src.width) / src.height)) };
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(src, 0, 0, w, h);
  try {
    return off.toDataURL('image/jpeg', 0.55);
  } catch {
    return '';
  }
}

function slimPainting(p: Painting): Painting {
  return { ...p, placements: [], branches: [] };
}

type CompareSlot = { thumb: string; note: string; seed: number } | null;

function formatHold(ms: number) {
  const sec = Math.ceil(ms / 1000);
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (sec > 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

type LastStudy = {
  seed: number;
  mode: Mode;
  family: Family;
  ground: Ground;
  band?: CountBand;
  flow?: Flow;
  grade?: GradeKind;
  thumb: string;
  note?: string;
  rarity?: number;
  passes?: number;
  count?: number;
};

function paintingFromLast(last: LastStudy): Painting {
  return {
    seed: last.seed,
    mode: last.mode,
    family: last.family,
    ground: last.ground,
    count: last.count ?? 0,
    countRarity: 'normal',
    kind: 'field',
    view: 'flat',
    vanish: { x: 0.5, y: 0.38 },
    rarity: last.rarity ?? 1,
    passes: last.passes ?? 4,
    aspect: '1:1',
    path: 'ltr',
    harmony: 'full',
    grade: last.grade,
    placements: [],
    branches: [],
    note: last.note ?? '',
  };
}

function loadLast(): LastStudy | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as LastStudy) : null;
  } catch {
    return null;
  }
}

function saveLast(study: LastStudy) {
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify(study));
  } catch {
    /* quota / private */
  }
}

function readUrlSeed(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('s');
    if (!raw) return null;
    const n = parseInt(raw, 16);
    return Number.isFinite(n) ? n >>> 0 : null;
  } catch {
    return null;
  }
}

function writeUrlSeed(seed: number) {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set('s', (seed >>> 0).toString(16));
    history.replaceState(null, '', u);
  } catch {
    /* */
  }
}

export default function StudioPage() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(isStudioOpen());
  }, []);
  if (!open) {
    return (
      <>
        <Head>
          <title>Blossoms</title>
          <meta name="robots" content="noindex, nofollow, noarchive" />
        </Head>
      </>
    );
  }
  return <StudioApp />;
}

function StudioApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const extraRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [size, setSize] = useState(1100);
  const [compactUi, setCompactUi] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [painting, setPainting] = useState<Painting | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<GradeKind | 'auto'>('auto');
  const [blockLine, setBlockLine] = useState('click to grow a study');
  const [seen, setSeen] = useState(0);
  const [holds, setHolds] = useState<HeldStudy[]>([]);
  const [now, setNow] = useState(0);
  const [holdMsg, setHoldMsg] = useState<string | null>(null);
  const [library, setLibrary] = useState<StarredStudy[]>([]);
  const [currentStars, setCurrentStars] = useState(0);
  const [libMsg, setLibMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<PaintPhase | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [slots, setSlots] = useState<[CompareSlot, CompareSlot, CompareSlot]>([null, null, null]);
  const bootSeed = useRef<number | null>(null);
  const stateRef = useRef({ catalog, busy, grade });
  stateRef.current = { catalog, busy, grade };

  const fillSlot = useCallback((item: NonNullable<CompareSlot>, at?: number) => {
    setSlots((prev) => {
      const next = [...prev] as [CompareSlot, CompareSlot, CompareSlot];
      const i = at ?? next.findIndex((s) => !s);
      next[i < 0 ? 2 : i] = item;
      return next;
    });
    setCompareOn(true);
  }, []);

  useEffect(() => {
    setSize(liveSize());
    setCompactUi(isCompactView());
    setNow(Date.now());
    document.documentElement.classList.add('st-lock');
    return () => {
      document.documentElement.classList.remove('st-lock');
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch('/library/catalog.json');
        if (!res.ok) throw new Error('catalog missing — run prepare-studio-library.mjs');
        const cat = (await res.json()) as Catalog;
        if (cancel) return;
        const compact = isCompactView();
        const blades = cat.marks.filter((m) => m.id.startsWith('blade-'));
        const warmMarks = compact ? [...blades, ...cat.marks.slice(0, 24)] : cat.marks;
        await preload(
          [...cat.heroes, ...warmMarks, ...(cat.branches ?? [])].map((p) => p.src),
          compact ? 6 : 10,
        );
        if (cancel) return;
        setCatalog(cat);
        setSeen(usedSeedCount());
        setHolds(pruneHolds());
        let stars = loadStars();
        try {
          const disk = await fetch('/api/stars?thumbs=1');
          if (disk.ok) {
            const body = (await disk.json()) as { items?: StarredStudy[]; wipe?: boolean };
            if (body.wipe) stars = replaceStars([]);
            else if (Array.isArray(body.items) && body.items.length) stars = mergeStars(body.items);
          }
        } catch {
          /* localStorage only */
        }
        if (cancel) return;
        setLibrary(stars);
        const urlSeed = readUrlSeed();
        if (urlSeed != null) {
          bootSeed.current = urlSeed;
          return;
        }
        const last = loadLast();
        const canvas = canvasRef.current;
        if (last && canvas) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = last.thumb;
          if (!cancel) {
            setPainting(paintingFromLast(last));
            setCurrentStars(findStar(last.seed)?.stars ?? 0);
          }
        }
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : 'load failed');
      }
    })();
    fetch('https://ethereum-rpc.publicnode.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['finalized', false] }),
    })
      .then((r) => r.json())
      .then((j) => {
        const n = parseInt(j?.result?.number, 16);
        const h = String(j?.result?.hash ?? '');
        if (Number.isFinite(n) && h) setBlockLine(`finalized #${n} · ${h.slice(0, 10)}…`);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!holds.length) return;
    const tick = window.setInterval(() => {
      setNow(Date.now());
      setHolds((prev) => {
        const next = pruneHolds();
        return next.length === prev.length ? prev : next;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [holds.length]);

  const paintSeed = useCallback(async (seed: number) => {
    const s = stateRef.current;
    if (!s.catalog) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setPhase({ pass: 1, of: 6 });
    setError(null);
    try {
      const compact = isCompactView();
      const next = composePainting(s.catalog, seed, {
        grade: s.grade === 'auto' ? undefined : s.grade,
        aspect: '1:1',
      });
      setPainting(slimPainting(next));
      setCurrentStars(findStar(next.seed)?.stars ?? 0);
      setSeen(usedSeedCount());
      writeUrlSeed(next.seed);
      await renderPainting(canvas, next, ac.signal, { sit: true, compact, onPhase: setPhase });
      const stopped = ac.signal.aborted;
      if (stopped && abortRef.current !== ac) return;
      const meta = slimPainting(next);
      if (stopped) meta.note = `${next.note} · stopped`;
      next.placements = [];
      next.branches = [];
      setPainting(meta);
      saveLast({
        seed: next.seed,
        mode: next.mode,
        family: next.family,
        ground: next.ground,
        grade: next.grade,
        thumb: makeThumb(canvas, compact ? 280 : 360),
        note: meta.note,
        rarity: next.rarity,
        passes: next.passes,
        count: next.count,
      });
    } catch (e) {
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : 'render failed');
    } finally {
      if (abortRef.current === ac) {
        setBusy(false);
        setPhase(null);
      }
    }
  }, []);

  const grow = useCallback(async (clientX: number, clientY: number) => {
    extraRef.current += 1;
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const raw = seedFromClick(
      Date.now(),
      Math.round(clientX - (rect?.left ?? 0)),
      Math.round(clientY - (rect?.top ?? 0)),
      extraRef.current,
    );
    await paintSeed(claimUniqueSeed(raw));
  }, [paintSeed]);

  useEffect(() => {
    if (!catalog) return;
    const seed = bootSeed.current;
    if (seed == null) return;
    bootSeed.current = null;
    void paintSeed(seed);
  }, [catalog, paintSeed]);

  const saveStudy = useCallback(
    async (mult: 1 | 2) => {
      const s = stateRef.current;
      if (!s.catalog || !painting || s.busy) return;
      setBusy(true);
      setLibMsg(mult === 1 ? 'Saving 1×…' : 'Saving 2×…');
      try {
        const long = liveSize() * mult;
        const off = document.createElement('canvas');
        off.width = long;
        off.height = long;
        const next = composePainting(s.catalog, painting.seed, {
          grade: painting.grade,
          aspect: '1:1',
        });
        await renderPainting(off, next, undefined, { sit: false, compact: false });
        const a = document.createElement('a');
        a.download = `field-of-blooms-${painting.seed.toString(16)}-${mult}x.png`;
        a.href = off.toDataURL('image/png');
        a.click();
        setLibMsg(`Saved ${mult}× · ${long}px`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'save failed');
      } finally {
        setBusy(false);
      }
    },
    [painting],
  );

  const stopPaint = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const starCurrent = useCallback(
    (n: number) => {
      const canvas = canvasRef.current;
      if (!painting || !canvas) return;
      if (currentStars === n) {
        const existing = findStar(painting.seed);
        if (existing) {
          const next = dropStar(existing.id);
          setLibrary(next);
          setCurrentStars(0);
          setLibMsg('Removed from the library.');
          syncStarToDisk({ id: existing.id, drop: true });
        }
        return;
      }
      const compact = isCompactView();
      const row = {
        seed: painting.seed,
        stars: n,
        note: painting.note,
        thumb: makeThumb(canvas, compact ? 220 : 280),
        mode: painting.mode,
        family: painting.family,
        ground: painting.ground,
        harmony: painting.harmony,
        rarity: painting.rarity,
      };
      const next = upsertStar(row);
      const saved = next.find((s) => s.seed === painting.seed);
      setLibrary(next);
      setCurrentStars(n);
      setLibMsg(`Starred ${n} · ${next.length}/${STAR_MAX} in the library`);
      if (saved) syncStarToDisk(saved);
    },
    [painting, currentStars],
  );

  const restoreStar = useCallback(
    async (s: StarredStudy) => {
      if (!catalog) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setBusy(true);
      setPhase({ pass: 1, of: 6 });
      setError(null);
      try {
        const compact = isCompactView();
        const next = composePainting(catalog, s.seed, {
          aspect: '1:1',
        });
        setPainting(slimPainting(next));
        setCurrentStars(s.stars);
        await renderPainting(canvas, next, ac.signal, { sit: true, compact, onPhase: setPhase });
        next.placements = [];
        next.branches = [];
        if (!ac.signal.aborted) {
          setPainting(slimPainting(next));
          setLibMsg(`Returned to a ${s.stars}-star study.`);
        }
      } catch (e) {
        if (!ac.signal.aborted) setError(e instanceof Error ? e.message : 'restore failed');
      } finally {
        if (abortRef.current === ac) {
          setBusy(false);
          setPhase(null);
        }
      }
    },
    [catalog],
  );

  const holdCurrent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!painting || !canvas) return;
    const locks = {
      mode: painting.mode,
      family: painting.family,
      ground: painting.ground,
      band: 'auto' as CountBand,
    };
    const next = addHold({
      seed: painting.seed,
      note: `${painting.note} · rarity ${painting.rarity}%`,
      thumb: makeThumb(canvas),
      ...locks,
    });
    if (next === 'full') {
      setHoldMsg(`Ten held. Let one fall (${HOLD_MAX} max).`);
      return;
    }
    setHolds(next);
    setHoldMsg('Held — it will fall in three hours.');
  }, [painting]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'g' && e.key !== 'G') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      if (stateRef.current.busy) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      void grow(r.left + r.width / 2, r.top + r.height / 2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [grow]);

  const restoreHold = useCallback(
    async (h: HeldStudy) => {
      if (!catalog) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setBusy(true);
      setPhase({ pass: 1, of: 6 });
      setError(null);
      try {
        const compact = isCompactView();
        const next = composePainting(catalog, h.seed, {
          aspect: '1:1',
        });
        setPainting(slimPainting(next));
        await renderPainting(canvas, next, ac.signal, { sit: true, compact, onPhase: setPhase });
        next.placements = [];
        next.branches = [];
        if (!ac.signal.aborted) {
          setPainting(slimPainting(next));
          setHoldMsg('Returned to a held study.');
        }
      } catch (e) {
        if (!ac.signal.aborted) setError(e instanceof Error ? e.message : 'restore failed');
      } finally {
        if (abortRef.current === ac) {
          setBusy(false);
          setPhase(null);
        }
      }
    },
    [catalog],
  );

  return (
    <>
      <Head>
        <title>Field Of Blooms</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div className="bl">
        <main className="st">
          <header className="st-head">
            <p className="bl-kicker">Hidden studio · not a mint</p>
            <h1 className="st-title">Field Of Blooms</h1>
            <p className="st-sub">{blockLine}</p>
            <p className="st-sub">Watch it grow · sit 35–50 seconds</p>
          </header>

          <div className="st-tools">
            <label>
              Grade
              <select value={grade} onChange={(e) => setGrade(e.target.value as GradeKind | 'auto')}>
                <option value="auto">auto</option>
                {GRADE_KINDS.map((g) => (
                  <option key={g} value={g}>
                    {GRADE_LABELS[g]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="st-again"
              disabled={!catalog || busy}
              onClick={(e) => grow(e.clientX, e.clientY)}
            >
              {busy ? (phase ? `Pass ${phase.pass} / ${phase.of}` : 'Painting…') : 'Again'}
            </button>
            <button type="button" className="st-again" disabled={!painting || busy} onClick={holdCurrent}>
              Hold {holds.length}/{HOLD_MAX}
            </button>
            <button type="button" className="st-again" disabled={!busy} onClick={stopPaint}>
              Stop
            </button>
            <button type="button" className="st-again" disabled={!painting || busy} onClick={() => void saveStudy(1)}>
              Save 1×
            </button>
            <button type="button" className="st-again" disabled={!painting || busy} onClick={() => void saveStudy(2)}>
              Save 2×
            </button>
          </div>

          <div className="st-stage">
            <canvas
              ref={canvasRef}
              className="st-canvas"
              width={size}
              height={size}
              onClick={(e) => {
                if (stateRef.current.busy) return;
                grow(e.clientX, e.clientY);
              }}
            />
            {!painting && !error && <p className="st-hint">Click the canvas to begin</p>}
          </div>
          {compactUi && (
            <p className="st-sub" style={{ textAlign: 'center', marginTop: 10 }}>
              Live preview · mint is {MINT_LONG}px on the long edge
            </p>
          )}

          {error && <p className="st-err">{error}</p>}
          {holdMsg && <p className="st-note">{holdMsg}</p>}
          {libMsg && <p className="st-note">{libMsg}</p>}
          {painting && (
            <p className="st-note">
              {painting.note} · seed {painting.seed.toString(16)}
              <span className={painting.rarity >= 80 ? 'st-rarity st-rarity--hot' : 'st-rarity'}>
                {' '}
                · rarity {painting.rarity}%
              </span>
            </p>
          )}

          <div className="st-stars" aria-label="Star this study 1 to 10">
            {Array.from({ length: 10 }, (_, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  type="button"
                  className={`st-star${currentStars >= n ? ' st-star--on' : ''}`}
                  disabled={!painting}
                  onClick={() => starCurrent(n)}
                  title={`${n} star${n === 1 ? '' : 's'}`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <div className="st-holds" aria-label="Held studies">
            {Array.from({ length: HOLD_MAX }, (_, i) => {
              const h = holds[i];
              if (!h) {
                return <div key={`empty-${i}`} className="st-hold st-hold--empty" />;
              }
              const left = remainingMs(h, now);
              const pct = Math.max(0, Math.min(100, (left / HOLD_MS) * 100));
              const label = formatHold(left);
              return (
                <button
                  key={h.id}
                  type="button"
                  className="st-hold"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ thumb: h.thumb, note: h.note, seed: h.seed }),
                    );
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => restoreHold(h)}
                  title={h.note}
                >
                  <img src={h.thumb} alt="" />
                  <span className="st-hold-bar" style={{ width: `${pct}%` }} />
                  <span className="st-hold-time">{label}</span>
                  <span
                    className="st-hold-drop"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHolds(dropHold(h.id));
                    }}
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>

          {library.length > 0 && (
            <div className="st-lib" aria-label="Starred library">
              <p className="st-sub st-lib-head">
                Starred library · {library.length} · click to return
              </p>
              {[...library]
                .sort((a, b) => b.stars - a.stars || b.at - a.at)
                .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="st-lib-item"
                  onClick={() => restoreStar(s)}
                  title={`${s.stars}★ · ${s.note}`}
                >
                  <img src={s.thumb} alt="" />
                  <span className="st-lib-n">{s.stars}</span>
                  <span
                    className="st-hold-drop"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLibrary(dropStar(s.id));
                      if (painting?.seed === s.seed) setCurrentStars(0);
                      syncStarToDisk({ id: s.id, drop: true });
                    }}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="st-foot">
            {catalog
              ? `${catalog.heroes.length} heroes · ${catalog.marks.length} marks · ${catalog.branches?.length ?? 0} branches · ${seen} unique seeds · ${holds.length} held · ${library.length} starred · G to grow`
              : 'Loading library…'}
          </p>

          <div className="st-compare-toggle">
            <button
              type="button"
              className={`st-again${compareOn ? ' st-again--on' : ''}`}
              onClick={() => setCompareOn((v) => !v)}
            >
              Compare
            </button>
          </div>

          {compareOn && (
            <section className="st-compare" aria-label="Compare studies">
              <div className="st-compare-head">
                <p className="st-sub">Drop holds here · two make a diptych · three a triptych</p>
                {painting && (
                  <button
                    type="button"
                    className="st-again"
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      fillSlot({
                        thumb: makeThumb(canvas),
                        note: painting.note,
                        seed: painting.seed,
                      });
                    }}
                  >
                    Add current
                  </button>
                )}
                <button
                  type="button"
                  className="st-again"
                  onClick={() => setSlots([null, null, null])}
                >
                  Clear
                </button>
              </div>
              <div className={`st-compare-row st-compare-row--${slots.filter(Boolean).length || 1}`}>
                {slots.map((s, i) => (
                  <div
                    key={i}
                    className={`st-compare-slot${s ? '' : ' st-compare-slot--empty'}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const raw = e.dataTransfer.getData('application/json');
                        if (!raw) return;
                        const item = JSON.parse(raw) as NonNullable<CompareSlot>;
                        if (item?.thumb) fillSlot(item, i);
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    {s ? (
                      <>
                        <img src={s.thumb} alt="" />
                        <button
                          type="button"
                          className="st-hold-drop"
                          onClick={() =>
                            setSlots((prev) => {
                              const next = [...prev] as [CompareSlot, CompareSlot, CompareSlot];
                              next[i] = null;
                              return next;
                            })
                          }
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span>{i === 0 ? 'I' : i === 1 ? 'II' : 'III'}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
