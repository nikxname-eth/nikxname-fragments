import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  BLOCK_DESC,
  BLOCK_LISTING,
  BLOCK_PAGE,
  BLOCK_PANELS,
  BLOCK_PLACEHOLDER,
  BLOCK_TITLE,
  BLOCK_WORK_TITLE,
  blockOpenSeaItem,
  blockStatusAt,
  blockStatusLabel,
  type BlockPanel,
} from '../config/on-the-block';
import { WOULD_IT_COLLECTION } from '../config/would-it';
import { CanvasLook } from '../components/CanvasLook';

type Market = {
  status?: string;
  statusLabel?: string;
  currentBid?: string | null;
  bidCount?: number;
  listing?: { reserveEth?: string | null; endsAt?: string | null; startsAt?: string | null };
};

function formatRemain(endsAt: string | null | undefined, now: number): string {
  if (!endsAt) return 'Not scheduled';
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return 'Not scheduled';
  const ms = end - now;
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export default function OnTheBlockPage() {
  const [dark, setDark] = useState(true);
  const [showTop, setShowTop] = useState(false);
  const [look, setLook] = useState(false);
  const [lookPanel, setLookPanel] = useState<BlockPanel['panel']>(1);
  const [market, setMarket] = useState<Market>({});
  const [now, setNow] = useState(() => Date.now());

  const status = market.status || blockStatusAt(now);
  const statusLabel = market.statusLabel || blockStatusLabel(status as ReturnType<typeof blockStatusAt>);
  const live = status === 'live';
  const panel = BLOCK_PANELS.find((p) => p.panel === lookPanel) || BLOCK_PANELS[0];
  const remain = useMemo(
    () => formatRemain(market.listing?.endsAt || BLOCK_LISTING.endsAt, now),
    [market.listing?.endsAt, now],
  );

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 360);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/on-the-block')
      .then((r) => r.json())
      .then((d: Market & { ok?: boolean }) => {
        if (alive && d?.ok) setMarket(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <Head>
        <title>{BLOCK_TITLE}</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="googlebot" content="noindex,nofollow,noarchive" />
        <meta name="description" content={BLOCK_DESC} key="description" />
        <meta property="og:type" content="website" key="og-type" />
        <meta property="og:url" content={BLOCK_PAGE} key="og-url" />
        <meta property="og:title" content={BLOCK_TITLE} key="og-title" />
        <meta property="og:description" content={BLOCK_DESC} key="og-desc" />
        <meta name="twitter:card" content="summary_large_image" key="twitter-card" />
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
              <a className="ex-nav-link" href="/">
                Explore
              </a>
              <a className="ex-nav-link ex-nav-who" href="/who">
                Who?
              </a>
              <a className="ex-nav-link" href="/marche">
                Marché
              </a>
            </nav>
          </div>
          <div className="ex-nav-right">
            <button
              type="button"
              className="ex-theme-btn"
              onClick={() => setDark((v) => !v)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀' : '☾'}
            </button>
            <a className="ex-nav-garden" href="/garden">
              Garden
            </a>
          </div>
        </header>

        <section className="ex-series-intro ex-collection-hero">
          <p className="ex-series-label">A Familiar Burn · 1 of 1 triptych</p>
          <h1 className="ex-series-title">On The Block</h1>
          <p className="ex-would-gold">Three canvases, one painting. Auctioned as one.</p>
          <p className="ex-series-desc">
            {BLOCK_WORK_TITLE}
            {BLOCK_PLACEHOLDER ? ' · stand-in' : ''}
          </p>
        </section>

        <section className="ex-would-hero" aria-label="Triptych">
          <div className="ex-block-hang" aria-hidden="true">
            {BLOCK_PANELS.map((p) => (
              <span key={p.panel} className={`ex-block-hang-cell${p.revealed ? '' : ' is-veil'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" />
                <em>{String(p.panel).padStart(2, '0')}</em>
                {!p.revealed ? <span className="ex-would-veil">Awarded</span> : null}
              </span>
            ))}
          </div>
          <p className="ex-would-hang-note">Three frames, hung as a set. A 1 of 1.</p>
        </section>

        <div className="ex-grid-wrap ex-would-wrap">
          <section className="ex-would-copy">
            <p>
              <em>Will It..</em> let a painting exist through fractional ownership — five lettered
              sets, panels gathered over time. This is the other thesis. The painting does not
              fraction. One panel is called. The other two follow it home.
            </p>
            <p>
              Panel <strong>01</strong> is on the block. Panels <strong>02</strong> and{' '}
              <strong>03</strong> stay with the studio until the bid settles, then transfer to the
              winning wallet — so all three canvases leave together, one owner.
            </p>
          </section>

          <section className="ex-block-desk" aria-label="Auction">
            <p className="ex-would-gold">Panel 01 is on the block</p>
            <p className={`ex-block-live is-${status}`}>{statusLabel}</p>
            <dl className="ex-block-stats">
              <div>
                <dt>Current bid</dt>
                <dd>{market.currentBid || '—'}</dd>
              </div>
              <div>
                <dt>Reserve</dt>
                <dd>{market.listing?.reserveEth || BLOCK_LISTING.reserveEth || 'To be set'}</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{remain}</dd>
              </div>
            </dl>
            <button type="button" className="ex-garden-enter" disabled={!live}>
              {live ? 'Place bid' : 'Not live'}
            </button>
            <p className="ex-block-note">
              Winning wallet receives panels 02 and 03 from the studio. Token 825 (TORCHED) stands
              in for panel 01 until the painting is minted.
            </p>
          </section>

          <section className="ex-would-sets" aria-label="Panels">
            <div className="ex-would-set">
              <h2>
                The set
                <span>1 of 1</span>
              </h2>
              <div className="ex-would-set-grid">
                {BLOCK_PANELS.map((p) => {
                  const href = blockOpenSeaItem(p.tokenId);
                  const inner = (
                    <>
                      <span className="ex-card-media ex-would-set-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.thumb} alt="" loading="lazy" decoding="async" />
                        {!p.revealed ? <span className="ex-would-veil">Unrevealed</span> : null}
                      </span>
                      <span className="ex-card-meta">
                        <span className="ex-card-title">
                          {String(p.panel).padStart(2, '0')}
                          {p.tokenId != null ? ` · #${p.tokenId}` : ''}
                        </span>
                        <span className={`ex-would-status is-${p.role === 'auction' ? 'available' : 'soon'}`}>
                          <span className="ex-would-status-dot" aria-hidden="true" />
                          {p.role === 'auction' ? 'On the block' : 'Awarded with the win'}
                        </span>
                      </span>
                    </>
                  );
                  return href ? (
                    <a
                      key={p.panel}
                      className="ex-card"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={p.panel} className="ex-card">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ex-would-copy ex-would-copy--after">
            <p>
              A triptych as three canvases is still the form — economical structure, belief in the
              painting as a whole. Here the rarity is the whole. There is no second letter, no
              hunt across sets. One bid. One wallet. The three panels hang as they were painted.
            </p>
          </section>

          <section className="ex-would-panel">
            <p className="ex-would-gold">Take a closer look..</p>
            <button
              type="button"
              className="ex-would-panel-btn"
              onClick={() => setLook(true)}
              aria-label={`Look closer at Panel 0${lookPanel}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={panel.look} alt={`${BLOCK_WORK_TITLE} · Panel 0${lookPanel}`} loading="lazy" decoding="async" />
            </button>
            <p className="ex-would-panel-hint">click to observe</p>
            <div className="ex-would-panel-switch" role="tablist" aria-label="Panel">
              {BLOCK_PANELS.map((p) => (
                <button
                  key={p.panel}
                  type="button"
                  role="tab"
                  aria-selected={lookPanel === p.panel}
                  className={lookPanel === p.panel ? 'is-on' : ''}
                  onClick={() => setLookPanel(p.panel)}
                >
                  Panel 0{p.panel}
                </button>
              ))}
            </div>
          </section>

          <hr className="ex-would-rule" />

          <footer className="ex-would-foot">
            <a className="ex-read-more" href={WOULD_IT_COLLECTION}>
              Full Collection | A Familiar Burn
            </a>
            <a className="ex-read-more" href="/marche">
              Marché
            </a>
            <p className="ex-would-asterisk">
              * Preview frame. Art, token IDs, reserve, and listing swap in when the painting is
              ready. TORCHED is not for sale here.
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
          src={panel.look}
          alt={`${BLOCK_WORK_TITLE} · Panel 0${lookPanel}`}
          title={`${BLOCK_WORK_TITLE} · Panel 0${lookPanel}`}
          onClose={() => setLook(false)}
          nav={
            <div className="ex-would-panel-switch" role="tablist" aria-label="Panel">
              {BLOCK_PANELS.map((p) => (
                <button
                  key={p.panel}
                  type="button"
                  role="tab"
                  aria-selected={lookPanel === p.panel}
                  className={lookPanel === p.panel ? 'is-on' : ''}
                  onClick={() => setLookPanel(p.panel)}
                >
                  Panel 0{p.panel}
                </button>
              ))}
            </div>
          }
        />
      ) : null}
    </>
  );
}
