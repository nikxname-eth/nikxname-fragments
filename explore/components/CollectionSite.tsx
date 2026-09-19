import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  X_PROFILE,
  rasterMarketUrl,
  getBlossomCanvasWork,
  getSeriesById,
  getWorksBySeries,
  type ExploreWork,
  type SeriesId,
} from '../config/catalog';
import { getAfbSpecialEditions } from '../lib/chainWorks';
import { getEmbersWorks } from '../lib/embersWorks';
import { AfbEmbers } from './AfbEmbers';
import { VoidCollection } from './VoidCollection';
import { HOST_TO_SERIES, SERIES_IDS, collectionHref } from '../lib/sites';
import { canonicalSlug, findWorkBySlug } from '../lib/workSlug';
import { shareAssetsForSeries } from '../lib/shareAssets';
import { WorkStage } from './WorkStage';
import { WorkCard } from './WorkCard';
import { AfbCanvas } from './AfbCanvas';
import { AfbPuzzlingEye, AfbWillIt } from './AfbPrelude';
import { ShareDownloads } from './ShareDownloads';
import { LivePill } from './LivePill';
import { SeriesCopy } from './SeriesCopy';

type Props = {
  seriesId: SeriesId;
  itemSlug?: string | null;
};

export function CollectionSite({ seriesId, itemSlug }: Props) {
  const [dark, setDark] = useState(true);
  const [selected, setSelected] = useState<ExploreWork | null>(null);
  const [now] = useState(() => Date.now());

  const series = getSeriesById(seriesId);
  const works = useMemo(() => getWorksBySeries(seriesId, now), [seriesId, now]);
  const afbEditions = useMemo(
    () => (seriesId === 'a-familiar-burn' ? getAfbSpecialEditions() : []),
    [seriesId],
  );
  const embers = useMemo(
    () => (seriesId === 'a-familiar-burn' ? getEmbersWorks() : []),
    [seriesId],
  );
  const theatreList = useMemo(() => {
    if (seriesId === 'a-familiar-burn') {
      return [getBlossomCanvasWork('still'), ...works, ...embers, ...afbEditions];
    }
    return works;
  }, [seriesId, works, embers, afbEditions]);
  const shareAssets = useMemo(() => shareAssetsForSeries(seriesId), [seriesId]);

  const onCollectionHost = () =>
    typeof window !== 'undefined' && Boolean(HOST_TO_SERIES[window.location.hostname.replace(/^www\./, '')]);

  const openWork = useCallback(
    (work: ExploreWork, replace = false) => {
      setSelected(work);
      const slug = canonicalSlug(work);
      const href = onCollectionHost() ? `/${slug}` : `/${seriesId}/${slug}`;
      window.history[replace ? 'replaceState' : 'pushState'](null, '', href);
    },
    [seriesId],
  );

  const closeTheatre = useCallback(() => {
    setSelected(null);
    const href = onCollectionHost() ? '/' : `/${seriesId}`;
    window.history.replaceState(null, '', href);
  }, [seriesId]);

  useEffect(() => {
    if (!itemSlug) return;
    const hit = findWorkBySlug(theatreList, itemSlug);
    if (hit) openWork(hit, true);
  }, [itemSlug, theatreList, openWork]);

  const landingWork = itemSlug ? findWorkBySlug(theatreList, itemSlug) : undefined;
  const ogImage =
    landingWork?.coverUrl ||
    works[0]?.coverUrl ||
    'https://assets.nikxart.xyz/og/life-impression-02.jpg';
  const pageUrl = itemSlug
    ? collectionHref(seriesId, landingWork ? canonicalSlug(landingWork) : itemSlug)
    : collectionHref(seriesId);
  const title = landingWork
    ? `${landingWork.title} · ${series?.label ?? seriesId}`
    : `${series?.label ?? seriesId} · Nikxname`;
  const description =
    landingWork?.blurb || series?.description || 'A collection from Nikxname.';
  const compact = seriesId === 'a-familiar-burn';
  const collectionOrder = SERIES_IDS;
  const collectionIdx = collectionOrder.indexOf(seriesId as (typeof collectionOrder)[number]);
  const nextSeriesId =
    collectionIdx >= 0 ? collectionOrder[(collectionIdx + 1) % collectionOrder.length] : null;
  const nextSeries = nextSeriesId ? getSeriesById(nextSeriesId) : null;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} key="description" />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" key="og-type" />
        <meta property="og:url" content={pageUrl} key="og-url" />
        <meta property="og:title" content={title} key="og-title" />
        <meta property="og:description" content={description} key="og-desc" />
        <meta property="og:image" content={ogImage} key="og-image" />
        <meta name="twitter:card" content="summary_large_image" key="twitter-card" />
        <meta name="twitter:title" content={title} key="twitter-title" />
        <meta name="twitter:description" content={description} key="twitter-desc" />
        <meta name="twitter:image" content={ogImage} key="twitter-image" />
      </Head>

      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <div className={`ex${dark ? '' : ' theme-light'}`}>
        <header className="ex-nav">
          <div className="ex-nav-left">
            <a className="ex-mark" href="https://nikxart.xyz">
              Nikxname
            </a>
            <nav className="ex-nav-links" aria-label="Primary">
              <a className="ex-nav-link" href="https://explore.nikxart.xyz">
                Explore
              </a>
              <a className="ex-nav-link" href="https://explore.nikxart.xyz/who">
                Who?
              </a>
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
              {dark ? '☀' : '☾'}
            </button>
            <a className="ex-nav-garden" href="https://explore.nikxart.xyz/garden">
              Garden
            </a>
          </div>
        </header>

        <section className="ex-series-intro ex-collection-hero">
          <p className="ex-series-label">{series?.tagline}</p>
          <h1 className="ex-series-title">{series?.label}</h1>
          {series?.description ? (
            <SeriesCopy text={series.description} className="ex-series-desc" />
          ) : null}
        </section>

        <div className={`ex-grid-wrap${compact ? ' ex-grid-wrap--afb' : ''}`}>
          {seriesId === 'a-familiar-burn' && afbEditions[0] ? (
            <AfbPuzzlingEye
              work={afbEditions[0]}
              isActive={selected?.id === afbEditions[0].id}
              onOpen={(w) => openWork(w)}
            />
          ) : null}
          {seriesId === 'a-familiar-burn' ? <hr className="ex-afb-break" /> : null}
          {seriesId === 'a-familiar-burn' && (
            <AfbCanvas
              onOpen={(mode) => {
                const canvas = getBlossomCanvasWork(mode);
                setSelected(canvas);
              }}
            />
          )}
          {works.length === 0 ? (
            <p className="ex-empty">Works for this collection will appear once synced.</p>
          ) : seriesId === 'the-void' ? (
            <VoidCollection
              works={works}
              activeId={selected?.id}
              onSelect={(w) => openWork(w)}
            />
          ) : (
            <div className={`ex-grid${compact ? ' ex-grid--afb' : ''}`}>
              {works.map((work, i) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  index={i}
                  compact={compact}
                  isActive={selected?.id === work.id}
                  onSelect={(w) => openWork(w)}
                />
              ))}
            </div>
          )}
          {seriesId === 'a-familiar-burn' ? <hr className="ex-afb-break" /> : null}
          {seriesId === 'a-familiar-burn' ? <AfbWillIt /> : null}
          {seriesId === 'a-familiar-burn' && embers.length ? (
            <>
              <hr className="ex-afb-break" />
              <AfbEmbers
                works={embers}
                activeId={selected?.id}
                onSelect={(w) => openWork(w)}
              />
            </>
          ) : null}
        </div>

        <ShareDownloads assets={shareAssets} />

        {nextSeries && nextSeriesId ? (
          <nav className="ex-collection-next" aria-label="Next collection">
            <a href={collectionHref(nextSeriesId)}>
              <span className="ex-collection-next-kicker">Next collection</span>
              <span className="ex-collection-next-name">{nextSeries.label}</span>
              <span className="ex-collection-next-arrow" aria-hidden>
                →
              </span>
            </a>
          </nav>
        ) : null}

        <footer className="ex-footer">
          <span className="ex-footer-copy">© {new Date().getFullYear()} Nikxname · {series?.label}</span>
          <div className="ex-footer-links">
            <LivePill />
            <a href={rasterMarketUrl(seriesId)} target="_blank" rel="noopener noreferrer">
              Secondary Market
            </a>
            <a href={X_PROFILE} target="_blank" rel="noopener noreferrer">
              X
            </a>
          </div>
        </footer>
      </div>

      <WorkStage
        work={selected}
        works={theatreList}
        onClose={closeTheatre}
        onNavigate={(w) => openWork(w)}
      />
    </>
  );
}
