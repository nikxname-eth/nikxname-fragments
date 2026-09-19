import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  WOULD_IT_BANNER,
  WOULD_IT_COLLECTION,
  WOULD_IT_LIST_ETH,
  WOULD_IT_RASTER,
  WOULD_IT_SHARE,
  WOULD_PANELS,
  WOULD_SETS,
  wouldItOpenSeaItem,
  wouldItTokenId,
  wouldPanelListed,
  wouldPanelRevealed,
  wouldPanelSoonLabel,
  wouldPanelThumb,
  type WouldPanelRow,
} from '../config/would-it';
import { LivePill } from '../components/LivePill';
import { CanvasLook } from '../components/CanvasLook';
import { willItLookSrc, willItPreviewSrc } from '../lib/willItWorks';

const PAGE_URL = 'https://explore.nikxart.xyz/will-it';
const PAGE_TITLE = 'Will It.. · Nikxname';
const PAGE_DESC =
  'A triptych: three canvases, one painting. To be revealed one panel at a time.';

export default function WillItPage() {
  const [dark, setDark] = useState(true);
  const [showTop, setShowTop] = useState(false);
  const [look, setLook] = useState(false);
  const [lookPanel, setLookPanel] = useState<(typeof WOULD_PANELS)[number]>(1);
  const [market, setMarket] = useState<Record<string, WouldPanelRow>>({});

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 360);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/will-it')
      .then((r) => r.json())
      .then((d: { ok?: boolean; panels?: Record<string, WouldPanelRow> }) => {
        if (alive && d?.ok && d.panels) setMarket(d.panels);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="googlebot" content="noindex,nofollow,noarchive" />
        <meta name="description" content={PAGE_DESC} key="description" />
        <meta property="og:type" content="website" key="og-type" />
        <meta property="og:url" content={PAGE_URL} key="og-url" />
        <meta property="og:title" content={PAGE_TITLE} key="og-title" />
        <meta property="og:description" content={PAGE_DESC} key="og-desc" />
        <meta property="og:image" content={WOULD_IT_SHARE} key="og-image" />
        <meta property="og:image:width" content="2400" key="og-image-w" />
        <meta property="og:image:height" content="946" key="og-image-h" />
        <meta property="og:image:type" content="image/jpeg" key="og-image-type" />
        <meta property="og:image:alt" content="Will It.. — three frames hung as a set" key="og-image-alt" />
        <meta name="twitter:card" content="summary_large_image" key="twitter-card" />
        <meta name="twitter:title" content={PAGE_TITLE} key="twitter-title" />
        <meta name="twitter:description" content={PAGE_DESC} key="twitter-desc" />
        <meta name="twitter:image" content={WOULD_IT_SHARE} key="twitter-image" />
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
          <p className="ex-series-label">A Familiar Burn · 3 canvas artwork</p>
          <h1 className="ex-series-title">Will It..</h1>
          <p className="ex-would-gold">A triptych: three canvases, one painting.</p>
          <p className="ex-series-desc">To be revealed one panel at a time</p>
        </section>

        <section className="ex-would-hero" aria-label="Triptych">
          <figure className="ex-would-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={WOULD_IT_BANNER}
              alt="Will It.. — three frames hung as a set. Canvas A is open; B and C wait."
            />
          </figure>
          <p className="ex-would-hang-note">Three frames, hung as a set. A Triptych</p>
        </section>

        <div className="ex-grid-wrap ex-would-wrap">
          <section className="ex-would-copy">
            <p>
              These are minted. Fifteen editions on the A Familiar Burn contract: five unique sets,
              labeled <strong>A, B, C, D,</strong> and <strong>E</strong>. Each set is three panels
              (1–3) that make the full canvas.
            </p>
            <p>
              Collectors may gather any three panels as a full set. Some will hunt a single letter.
              That hunt is part of the work.
            </p>
          </section>

          <section className="ex-would-sets" aria-label="Letter sets">
            {WOULD_SETS.map((letter) => (
              <div key={letter} className="ex-would-set">
                <h2>
                  Set {letter}
                  <span>Panels 1–3</span>
                </h2>
                <div className="ex-would-set-grid">
                  {WOULD_PANELS.map((panel) => {
                    const open = wouldPanelRevealed(panel);
                    const tokenId = wouldItTokenId(letter, panel);
                    const row = market[`${letter}${panel}`];
                    const listed = wouldPanelListed(panel);
                    const status = row?.status ?? (listed ? 'available' : 'soon');
                    const href = wouldItOpenSeaItem(tokenId);
                    const sub =
                      row?.label ||
                      (listed
                        ? `Listed · ${WOULD_IT_LIST_ETH} ETH`
                        : wouldPanelSoonLabel(panel));
                    return (
                      <a
                        key={panel}
                        className={`ex-card${status === 'sold' ? ' is-sold' : ''}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="ex-card-media ex-would-set-media">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={wouldPanelThumb(panel)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                          {!open && status !== 'sold' ? (
                            <span className="ex-would-veil">Unrevealed</span>
                          ) : null}
                          {status === 'sold' ? <span className="ex-would-sold">Sold</span> : null}
                        </span>
                        <span className="ex-card-meta">
                          <span className="ex-card-title">
                            {letter}
                            {panel}
                          </span>
                          <span className={`ex-would-status is-${status}`}>
                            <span className="ex-would-status-dot" aria-hidden="true" />
                            {sub}
                          </span>
                          {row?.offer ? (
                            <span className="ex-would-offer">Offer {row.offer}</span>
                          ) : null}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="ex-would-copy ex-would-copy--after">
            <p>
              A triptych as three canvases is multifold. Economical structure. Belief in the value
              of the painting — that it can exist through fractional ownership. One does not need to
              own every panel to enjoy it. Ownership brings its own value.
            </p>
            <p>
              Each panel can also stand wholly on its own, should someone desire it, and that adds
              to the story of the work.
            </p>
            <p>
              As canvases reveal, patrons are welcome to place offers on unrevealed tokens if they
              wish to get ahead of the launch. Panel 1 of each lettered set is listed at{' '}
              <strong>{WOULD_IT_LIST_ETH} ETH</strong>. Panel 2 becomes available at{' '}
              <strong>10AM EST, 14 September</strong>.
            </p>
          </section>

          <section className="ex-would-panel">
            <p className="ex-would-gold">Take a closer look..</p>
            <button
              type="button"
              className="ex-would-panel-btn"
              onClick={() => setLook(true)}
              aria-label={`Look closer at Panel 0${lookPanel}, true size`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={willItPreviewSrc(lookPanel)}
                alt={`Will It.. · Panel 0${lookPanel}`}
                loading="lazy"
                decoding="async"
              />
            </button>
            <p className="ex-would-panel-hint">click to observe</p>
            <div className="ex-would-panel-switch" role="tablist" aria-label="Panel">
              {WOULD_PANELS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="tab"
                  aria-selected={lookPanel === n}
                  className={lookPanel === n ? 'is-on' : ''}
                  onClick={() => setLookPanel(n)}
                >
                  Panel 0{n}
                </button>
              ))}
            </div>
          </section>

          <hr className="ex-would-rule" />

          <footer className="ex-would-foot">
            <a className="ex-read-more" href={WOULD_IT_COLLECTION}>
              Full Collection | A Familiar Burn
            </a>
            <a
              className="ex-read-more"
              href={WOULD_IT_RASTER}
              target="_blank"
              rel="noopener noreferrer"
            >
              Secondary Market
            </a>
            <p className="ex-would-asterisk">
              * For the keen collector, serious offers may be considered on unrevealed canvases
            </p>
          </footer>
        </div>

        {showTop ? (
          <button
            type="button"
            className="ex-garden-to-top"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 14l6-6 6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {look ? (
        <CanvasLook
          src={willItLookSrc(lookPanel)}
          alt={`Will It.. · Panel 0${lookPanel}`}
          title={`Will It.. · Panel 0${lookPanel}`}
          onClose={() => setLook(false)}
          nav={
            <div className="ex-would-panel-switch" role="tablist" aria-label="Panel">
              {WOULD_PANELS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="tab"
                  aria-selected={lookPanel === n}
                  className={lookPanel === n ? 'is-on' : ''}
                  onClick={() => setLookPanel(n)}
                >
                  Panel 0{n}
                </button>
              ))}
            </div>
          }
        />
      ) : null}
    </>
  );
}
