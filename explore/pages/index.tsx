import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ARTIST,
  SERIES,
  X_PROFILE,
  getAllWorks,
  getBlossomCanvasWork,
  getWorksBySeries,
  rasterMarketUrl,
  type ExploreWork,
  type SeriesId,
} from '../config/catalog';
import { getAfbSpecialEditions } from '../lib/chainWorks';
import { VoidCollection } from '../components/VoidCollection';
import { getFeatureCacheItems, optimizeAssetUrl, resolveFeatureMedia } from '../lib/previews';
import { WorkStage } from '../components/WorkStage';
import { WorkCard } from '../components/WorkCard';
import { AfbCanvas } from '../components/AfbCanvas';
import { AfbPuzzlingEye, AfbWillIt } from '../components/AfbPrelude';
import { collectionHref } from '../lib/sites';
import { LivePill } from '../components/LivePill';
import { SeriesCopy } from '../components/SeriesCopy';
import { AfbEmbers } from '../components/AfbEmbers';
import { ShareDownloads } from '../components/ShareDownloads';
import { getEmbersWorks } from '../lib/embersWorks';
import { allShareAssets } from '../lib/shareAssets';

/** Collection bar only (no Market) */
const COLLECTION_NAV: { id: SeriesId; label: string }[] = SERIES.filter(
  (s) => s.id !== 'market',
).map((s) => ({
  id: s.id,
  label: s.id === 'one-of-ones' ? '1 of 1' : s.label,
}));

const FEATURE_ROTATE_MS = 8_000;

function isBannerExcluded(work: { id?: string; title?: string }) {
  const title = (work.title || '').trim().toLowerCase();
  return title === 'full bouquet' || work.id === 'for-you-13';
}

type GridDensity = 's' | 'm' | 'l';

function frameHdWidth(viewport: number) {
  if (viewport < 700) return 900;
  if (viewport < 1200) return 1400;
  return 1800;
}

const DENSITY: Record<GridDensity, { label: string; min: string; icon: number }> = {
  s: { label: 'Small', min: '96px', icon: 8 },
  m: { label: 'Medium', min: '148px', icon: 12 },
  l: { label: 'Large', min: '200px', icon: 16 },
};

export default function ExploreHome() {
  const [dark, setDark] = useState(true);
  const [filter, setFilter] = useState<SeriesId>('a-familiar-burn');
  const [selected, setSelected] = useState<ExploreWork | null>(null);
  const [theatreWorks, setTheatreWorks] = useState<ExploreWork[] | null>(null);
  const [density, setDensity] = useState<GridDensity>('m');

  const [feature, setFeature] = useState<ExploreWork | null>(null);
  /** Pause banner rotation while Theatre is open or the lead frame is off-screen */
  const [bannerAway, setBannerAway] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ex-grid-density') as string | null;
      if (saved === 'xl' || saved === 'l') {
        const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;
        setDensity(mobile ? 'm' : 'l');
      } else if (saved && saved in DENSITY) setDensity(saved as GridDensity);
    } catch {
      /* ignore */
    }
  }, []);

  const archiveWorks = useMemo(
    () => getAllWorks(now).filter((w) => w.kind !== 'market' && w.seriesId !== 'market'),
    [now],
  );

  /**
   * Landing rotation pool: prefer R2 feature-cache works (pre-synced HD ≥1500px).
   * Falls back to full archive until cache is populated.
   */
  const rotatePool = useMemo(() => {
    const cached = getFeatureCacheItems();
    if (cached.length >= 2) {
      const byId = new Map(archiveWorks.map((w) => [w.id, w]));
      const mapped = cached
        .map((c) => byId.get(c.workId))
        .filter((w): w is ExploreWork => {
          if (!w) return false;
          return !isBannerExcluded(w);
        });
      if (mapped.length >= 2) return mapped;
    }
    return archiveWorks.filter((w) => !isBannerExcluded(w));
  }, [archiveWorks]);

  // Lead with a random work once pool is ready
  useEffect(() => {
    if (!rotatePool.length || feature) return;
    const pick = rotatePool[Math.floor(Math.random() * rotatePool.length)];
    setFeature(pick);
  }, [rotatePool, feature]);

  // Preload next HD, then swap - never change frame before the image is ready
  useEffect(() => {
    if (bannerAway || !rotatePool.length || selected) return;

    let cancelled = false;
    let timer: number | undefined;

    const scheduleNext = () => {
      if (rotatePool.length < 2) return;
      const current = feature;
      let next = rotatePool[Math.floor(Math.random() * rotatePool.length)];
      let guard = 0;
      while (current && next.id === current.id && guard < 12) {
        next = rotatePool[Math.floor(Math.random() * rotatePool.length)];
        guard += 1;
      }

      const pair = resolveFeatureMedia(next);
      const hd = pair.isGif
        ? pair.hd
        : optimizeAssetUrl(pair.hd, { width: frameHdWidth(window.innerWidth), quality: 84 });
      const ready = preloadImage(hd || pair.lqip);

      timer = window.setTimeout(async () => {
        if (cancelled) return;
        const ok = await ready;
        if (cancelled) return;
        if (!ok) {
          scheduleNext();
          return;
        }
        setFeature(next);
        scheduleNext();
      }, FEATURE_ROTATE_MS);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [rotatePool, bannerAway, selected, feature?.id]);

  useEffect(() => {
    const el = document.getElementById('top');
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setBannerAway(!entry.isIntersecting),
      { threshold: 0.12, rootMargin: '-58px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const setDensityPersist = (d: GridDensity) => {
    setDensity(d);
    try {
      localStorage.setItem('ex-grid-density', d);
    } catch {
      /* ignore */
    }
  };

  const works = useMemo(() => getWorksBySeries(filter, now), [filter, now]);
  const afbEditions = useMemo(
    () => (filter === 'a-familiar-burn' ? getAfbSpecialEditions() : []),
    [filter],
  );
  const embers = useMemo(
    () => (filter === 'a-familiar-burn' ? getEmbersWorks() : []),
    [filter],
  );
  const shareAssets = useMemo(() => allShareAssets(), []);

  const activeSeries = SERIES.find((s) => s.id === filter);

  const openTheatre = (work: ExploreWork, list: ExploreWork[]) => {
    setTheatreWorks(list);
    setSelected(work);
  };

  const theatreListFor = (work: ExploreWork): ExploreWork[] => {
    const list = getWorksBySeries(work.seriesId, now);
    if (work.seriesId === 'a-familiar-burn') {
      const canvas = getBlossomCanvasWork('still');
      return [canvas, ...list, ...getEmbersWorks(), ...getAfbSpecialEditions()];
    }
    return list.length ? list : [work];
  };

  const openWorkInTheatre = (work: ExploreWork) => {
    openTheatre(work, theatreListFor(work));
  };

  const openArchiveTheatre = () => {
    const seed = feature ?? archiveWorks[0];
    if (!seed) return;
    const list = getWorksBySeries(seed.seriesId, now);
    openTheatre(seed, list.length ? list : [seed]);
  };

  const openRandomInTheatre = () => {
    if (!archiveWorks.length) return;
    const pick = archiveWorks[Math.floor(Math.random() * archiveWorks.length)];
    const list = getWorksBySeries(pick.seriesId, now);
    openTheatre(pick, list.length ? list : [pick]);
  };

  const shiftSeries = (seriesId: SeriesId) => {
    const list = getWorksBySeries(seriesId, now);
    if (!list.length) return;
    openTheatre(list[0], list);
    setFilter(seriesId);
  };

  const selectCollection = (id: SeriesId) => {
    setFilter(id);
  };

  const featureSeriesLabel =
    COLLECTION_NAV.find((c) => c.id === feature?.seriesId)?.label ??
    activeSeries?.label ??
    '';
  const spineChars = Math.max(
    4,
    featureSeriesLabel.replace(/[^A-Za-z0-9]/g, '').length,
  );
  const featureSpineTight = spineChars >= 12;

  return (
    <>
      <Head>
        <title>Explore · Nikxname - Art Theatre</title>
      </Head>

      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <motion.div
        className={`ex${dark ? '' : ' theme-light'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
        style={
          {
            ['--ex-grid-min' as string]: DENSITY[density].min,
            ['--spine-chars' as string]: String(spineChars),
          } as CSSProperties
        }
      >
        <header className="ex-nav">
          <div className="ex-nav-left">
            <a className="ex-mark" href="https://nikxart.xyz">
              Nikxname
            </a>
            <nav className="ex-nav-links" aria-label="Primary">
              <a className="ex-nav-link" href="/who">
                Who?
              </a>
              <button type="button" className="ex-nav-link ex-nav-action" onClick={openArchiveTheatre}>
                Theatre
              </button>
              <button
                type="button"
                className="ex-nav-link ex-nav-collections"
                onClick={() =>
                  document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Collections
              </button>
            </nav>
          </div>
          <div className="ex-nav-right">
            <LivePill />
            <button
              type="button"
              className="ex-theme-btn"
              onClick={() => setDark((v) => !v)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21 14.5A8.5 8.5 0 1110.5 3a7 7 0 0010.5 11.5z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <a className="ex-nav-garden" href="/garden">
              Garden
            </a>
          </div>
        </header>

        {/* Above the fold: slightly lighter wall + main frame */}
        <div className="ex-above-fold">
          <section className="ex-feature" id="top" aria-label="Featured artwork">
            <div
              className="ex-feature-hang"
              style={{ ['--spine-chars' as string]: String(spineChars) } as CSSProperties}
            >
              <AnimatePresence mode="wait">
                {feature && (
                  <motion.h1
                    key={feature.seriesId}
                    className={`ex-feature-spine${featureSpineTight ? ' is-tight' : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                  >
                    {featureSeriesLabel.toUpperCase()}
                  </motion.h1>
                )}
              </AnimatePresence>
              <div className="ex-feature-stage">
                <button
                  type="button"
                  className="ex-feature-frame"
                  onClick={() => {
                    if (!feature) return;
                    openWorkInTheatre(feature);
                  }}
                  disabled={!feature}
                  aria-label={feature ? `Open ${feature.title} in Theatre` : 'Loading artwork'}
                >
                  {feature ? (
                    <FeatureFrameMedia work={feature} />
                  ) : (
                    <div className="ex-feature-placeholder">
                      <span className="ex-theatre-loading-dot" />
                    </div>
                  )}
                  {feature && <PixelCascadeSweep key={`sweep-${feature.id}`} />}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Below the fold: darker band (collections, grid, world) */}
        <div className="ex-below-fold">
        {/* Pipe collection band under art */}
        <nav className="ex-pipe-band" id="collections" aria-label="Collections">
          <div className="ex-pipe-inner" role="tablist">
            {COLLECTION_NAV.map((item, i) => (
              <span key={item.id} className="ex-pipe-item">
                {i > 0 && (
                  <span className="ex-pipe-sep" aria-hidden>
                    |
                  </span>
                )}
                <a
                  href={collectionHref(item.id)}
                  role="tab"
                  aria-selected={filter === item.id}
                  className={`ex-pipe-link${filter === item.id ? ' is-active' : ''}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    selectCollection(item.id);
                  }}
                >
                  {item.label}
                </a>
              </span>
            ))}
          </div>
          <div className="ex-pipe-tools">
            {filter !== 'a-familiar-burn' && filter !== 'the-void' && (
              <div className="ex-density" role="group" aria-label="Catalogue size">
                <span className="ex-density-label">Size</span>
                {(Object.keys(DENSITY) as GridDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-size={d}
                    className={`ex-density-btn${density === d ? ' is-active' : ''}`}
                    onClick={() => setDensityPersist(d)}
                    aria-pressed={density === d}
                    aria-label={DENSITY[d].label}
                    title={DENSITY[d].label}
                  >
                    <span
                      className="ex-density-sq"
                      style={{ width: DENSITY[d].icon, height: DENSITY[d].icon }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {activeSeries && (
          <div className="ex-series-intro">
            <p className="ex-series-label">{activeSeries.tagline}</p>
            <h2 className="ex-series-title">
              {activeSeries.id !== 'market' ? (
                <a
                  href={collectionHref(activeSeries.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {activeSeries.label}
                </a>
              ) : (
                activeSeries.label
              )}
            </h2>
            <SeriesCopy text={activeSeries.lead} className="ex-series-desc" />
          </div>
        )}

        <div className={`ex-grid-wrap${filter === 'a-familiar-burn' ? ' ex-grid-wrap--afb' : ''}`}>
          {filter === 'a-familiar-burn' && afbEditions[0] ? (
            <AfbPuzzlingEye
              work={afbEditions[0]}
              isActive={feature?.id === afbEditions[0].id}
              onOpen={openWorkInTheatre}
            />
          ) : null}
          {filter === 'a-familiar-burn' ? <hr className="ex-afb-break" /> : null}
          {filter === 'a-familiar-burn' && (
            <AfbCanvas
              onOpen={(mode) => {
                const canvas = getBlossomCanvasWork(mode);
                openTheatre(canvas, [canvas, ...works, ...embers, ...afbEditions]);
              }}
            />
          )}
          {works.length === 0 ? (
            <p className="ex-empty">Works for this collection will appear once synced.</p>
          ) : filter === 'the-void' ? (
            <VoidCollection
              works={works}
              activeId={feature?.id}
              onSelect={openWorkInTheatre}
            />
          ) : (
            <div className={`ex-grid${filter === 'a-familiar-burn' ? ' ex-grid--afb' : ''}`}>
              {works.map((work, i) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  index={i}
                  isActive={feature?.id === work.id}
                  compact={filter === 'a-familiar-burn'}
                  onSelect={openWorkInTheatre}
                />
              ))}
            </div>
          )}
          {filter === 'a-familiar-burn' ? <hr className="ex-afb-break" /> : null}
          {filter === 'a-familiar-burn' ? <AfbWillIt /> : null}
          {filter === 'a-familiar-burn' && embers.length ? (
            <>
              <hr className="ex-afb-break" />
              <AfbEmbers
                works={embers}
                activeId={feature?.id}
                onSelect={openWorkInTheatre}
              />
            </>
          ) : null}
        </div>

        <ShareDownloads
          assets={shareAssets}
          filterable
          defaultCollection={filter === 'market' ? 'all' : filter}
        />

        <section className="ex-ethos" id="ethos">
          <blockquote className="ex-ethos-quote">
            <p>&ldquo;{ARTIST.ethos}&rdquo;</p>
            <footer>- {ARTIST.name}</footer>
          </blockquote>
          <p className="ex-ethos-note">
            Explore slowly. Open a work into the Theatre. Let the brushstroke finish speaking.
          </p>
        </section>

        <footer className="ex-footer">
          <span className="ex-footer-copy">© {new Date().getFullYear()} Nikxname · Art Theatre</span>
          <div className="ex-footer-links">
            <LivePill />
            <a href={rasterMarketUrl()} target="_blank" rel="noopener noreferrer">
              Secondary Market
            </a>
            <a href={X_PROFILE} target="_blank" rel="noopener noreferrer">
              X · {ARTIST.handle}
            </a>
          </div>
        </footer>
        </div>
      </motion.div>

      <WorkStage
        work={selected}
        works={theatreWorks ?? works}
        onClose={() => {
          setSelected(null);
          setTheatreWorks(null);
        }}
        onNavigate={setSelected}
        onSeriesShift={shiftSeries}
        onRandom={openRandomInTheatre}
      />
    </>
  );
}

function preloadImage(url: string): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Soft progressive load for the landing frame:
 * paint LQIP first, then crossfade HD (Cloudflare resize on assets.nikxart.xyz).
 */
function FeatureFrameMedia({ work }: { work: ExploreWork }) {
  const pair = useMemo(() => resolveFeatureMedia(work), [work]);
  const [vp, setVp] = useState(1200);
  useEffect(() => {
    const sync = () => setVp(frameHdWidth(window.innerWidth));
    sync();
    window.addEventListener('resize', sync, { passive: true });
    return () => window.removeEventListener('resize', sync);
  }, []);
  const hdSrc = pair.isGif ? pair.hd : optimizeAssetUrl(pair.hd, { width: vp, quality: 84 });
  const [displaySrc, setDisplaySrc] = useState(pair.lqip);
  const [hdReady, setHdReady] = useState(pair.lqip === hdSrc);

  useEffect(() => {
    setDisplaySrc(pair.lqip);
    setHdReady(pair.lqip === hdSrc);
    if (pair.lqip === hdSrc) return;

    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (cancelled) return;
      setDisplaySrc(hdSrc);
      setHdReady(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      setHdReady(true);
    };
    img.src = hdSrc;
    return () => {
      cancelled = true;
    };
  }, [pair.lqip, hdSrc, work.id]);

  return (
    <img
      key={work.id}
      className={`ex-feature-img${pair.isGif ? ' is-gif' : ''}${hdReady ? ' is-hd' : ' is-lqip'}`}
      src={displaySrc}
      alt={work.title}
      decoding="async"
      fetchPriority="high"
      sizes="(max-width: 720px) 92vw, min(1100px, 88vw)"
    />
  );
}

/** Subtle TL→BR cascading pixel veil when the featured work changes */
/** Fewer cells = cheaper paint; still reads as a cascade */
const PIXEL_COLS = 12;
const PIXEL_ROWS = 8;

function PixelCascadeSweep() {
  const cells = useMemo(() => {
    const list: { i: number; col: number; row: number }[] = [];
    for (let row = 0; row < PIXEL_ROWS; row++) {
      for (let col = 0; col < PIXEL_COLS; col++) {
        list.push({ i: row * PIXEL_COLS + col, col, row });
      }
    }
    return list;
  }, []);

  return (
    <div className="ex-pixel-sweep" aria-hidden="true">
      {cells.map((c) => (
        <span
          key={c.i}
          className="ex-pixel-cell"
          style={
            {
              ['--px-col' as string]: c.col,
              ['--px-row' as string]: c.row,
              ['--px-diag' as string]: c.col + c.row,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}


