import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  ARTIST,
  LIVE_SITE,
  MANIFOLD_CREATOR,
  RASTER_ARTIST,
  SERIES,
  X_PROFILE,
  getLiveFragmentNote,
  getWorksBySeries,
  type ExploreWork,
  type SeriesId,
} from '../config/catalog';
import { getVoidSectionLabel, type VoidSubgroup } from '../lib/chainWorks';
import { WorkStage } from '../components/WorkStage';

type FilterId = 'all' | SeriesId;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  ...SERIES.map((s) => ({ id: s.id as FilterId, label: s.label })),
];

export default function ExploreHome() {
  const [dark, setDark] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [selected, setSelected] = useState<ExploreWork | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const works = useMemo(() => getWorksBySeries(filter, now), [filter, now]);
  const live = useMemo(() => getLiveFragmentNote(now), [now]);
  const activeSeries = filter === 'all' ? null : SERIES.find((s) => s.id === filter);

  return (
    <>
      <Head>
        <title>Explore · Nikxname</title>
      </Head>

      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <motion.div
        className={`ex${dark ? '' : ' theme-light'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <header className="ex-nav">
          <div className="ex-nav-left">
            <a className="ex-mark" href="#top">
              Nikxname
            </a>
            <span className="ex-nav-link is-active" aria-current="page">
              Explore
            </span>
          </div>
          <div className="ex-nav-right">
            <a className="ex-nav-link ex-nav-live" href={LIVE_SITE} target="_blank" rel="noopener noreferrer">
              Live drop
            </a>
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
          </div>
        </header>

        <section className="ex-hero" id="top">
          <div className="ex-hero-grid">
            <div className="ex-portrait">
              <img src={ARTIST.portrait} alt={ARTIST.name} />
            </div>
            <div>
              <p className="ex-hero-kicker">Body of work</p>
              <h1 className="ex-hero-title">{ARTIST.name}</h1>
              <p className="ex-hero-tag">{ARTIST.tagline}</p>
              <p className="ex-hero-bio">{ARTIST.bio}</p>
              <p className="ex-hero-ethos">&ldquo;{ARTIST.ethos}&rdquo;</p>
              <div className="ex-hero-actions">
                <a className="ex-pill ex-pill--accent" href={MANIFOLD_CREATOR} target="_blank" rel="noopener noreferrer">
                  Manifold catalog ↗
                </a>
                <a className="ex-pill" href={RASTER_ARTIST} target="_blank" rel="noopener noreferrer">
                  Raster portfolio ↗
                </a>
                <a className="ex-pill" href={X_PROFILE} target="_blank" rel="noopener noreferrer">
                  Social · X ↗
                </a>
              </div>
              {live && (
                <div className="ex-live-banner">
                  <p>
                    Fragment {String(live.piece).padStart(2, '0')} is live on the drop site
                  </p>
                  <a href={LIVE_SITE} target="_blank" rel="noopener noreferrer">
                    Open nikxart.xyz ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="ex-filters" role="tablist" aria-label="Filter by series">
          <div className="ex-filters-inner">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`ex-chip${filter === f.id ? ' is-active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {activeSeries && (
          <div className="ex-series-intro">
            <p className="ex-series-label">{activeSeries.tagline}</p>
            <h2 className="ex-series-title">{activeSeries.label}</h2>
            <p className="ex-series-desc">{activeSeries.description}</p>
          </div>
        )}

        <div className="ex-grid-wrap">
          {works.length === 0 ? (
            <p className="ex-empty">
              Works for this series will appear once the contract is synced
              {filter === 'for-her' ? ' (For Her address may need verification on mainnet)' : ''}.
            </p>
          ) : filter === 'the-void' ? (
            (['artwork', 'flutter-editions', 'guardians'] as VoidSubgroup[]).map((group) => {
              const sectionWorks = works.filter((w) => (w.voidSubgroup ?? 'artwork') === group);
              if (!sectionWorks.length) return null;
              return (
                <section key={group} className="ex-section" aria-label={getVoidSectionLabel(group)}>
                  <div className="ex-section-head">
                    <h3 className="ex-section-title">{getVoidSectionLabel(group)}</h3>
                    <span className="ex-section-count">{sectionWorks.length}</span>
                  </div>
                  <div className="ex-grid">
                    {sectionWorks.map((work, i) => (
                      <WorkCard key={work.id} work={work} index={i} onOpen={setSelected} />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="ex-grid">
              {works.map((work, i) => (
                <WorkCard key={work.id} work={work} index={i} onOpen={setSelected} />
              ))}
            </div>
          )}
        </div>

        <footer className="ex-footer">
          <span className="ex-footer-copy">© {new Date().getFullYear()} Nikxname</span>
          <div className="ex-footer-links">
            <a href={LIVE_SITE} target="_blank" rel="noopener noreferrer">
              Live drop
            </a>
            <a href={MANIFOLD_CREATOR} target="_blank" rel="noopener noreferrer">
              Manifold
            </a>
            <a href={RASTER_ARTIST} target="_blank" rel="noopener noreferrer">
              Raster
            </a>
            <a href={X_PROFILE} target="_blank" rel="noopener noreferrer">
              X
            </a>
          </div>
        </footer>
      </motion.div>

      <WorkStage
        work={selected}
        works={works}
        onClose={() => setSelected(null)}
        onNavigate={setSelected}
      />
    </>
  );
}

function WorkCard({
  work,
  index,
  onOpen,
}: {
  work: ExploreWork;
  index: number;
  onOpen: (w: ExploreWork) => void;
}) {
  const editions = work.editionCount && work.editionCount > 1 ? work.editionCount : null;
  return (
    <motion.button
      type="button"
      className="ex-card"
      onClick={() => onOpen(work)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.45 }}
      aria-label={`Open ${work.title}${editions ? `, ${editions} editions` : ''}`}
    >
      <div className="ex-card-media">
        <img src={work.coverUrl} alt="" loading="lazy" decoding="async" />
        {work.tags?.includes('live') && <span className="ex-card-badge live">Live</span>}
        {work.kind === 'series' && <span className="ex-card-badge">Series</span>}
        {work.kind === 'market' && <span className="ex-card-badge">Market</span>}
        {editions != null && <span className="ex-card-badge editions">x{editions}</span>}
      </div>
      <div className="ex-card-meta">
        <p className="ex-card-title">{work.title}</p>
        <p className="ex-card-sub">
          {work.subtitle ?? SERIES.find((s) => s.id === work.seriesId)?.label}
        </p>
      </div>
    </motion.button>
  );
}
