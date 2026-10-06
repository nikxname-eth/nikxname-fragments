import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  BLOCK_AUCTION_HOURS,
  BLOCK_BID_OPENS_AT,
  BLOCK_BLIP,
  BLOCK_COLLECTION_HREF,
  BLOCK_COLLECTION_LABEL,
  BLOCK_DESC,
  BLOCK_LISTING,
  BLOCK_PAGE,
  BLOCK_PANELS,
  BLOCK_REVEAL_AT,
  BLOCK_SHARE,
  BLOCK_SHARE_H,
  BLOCK_SHARE_W,
  BLOCK_TIERS,
  BLOCK_TITLE,
  BLOCK_WORK_TITLE,
  blockManifoldItem,
  blockPanelRevealed,
  blockStatusAt,
  blockStatusLabel,
  formatEastern,
  panelVideo,
  type BlockPanel,
  type BlockTier,
} from '../config/on-the-block';
import { CanvasLook } from '../components/CanvasLook';
import { LivePill } from '../components/LivePill';
import { parseEth } from '../lib/blockAuction';
import { sendAuctionBid } from '../lib/blockBidTx';

type Market = {
  status?: string;
  statusLabel?: string;
  currentBid?: string | null;
  currentBidWei?: string;
  bidder?: string | null;
  bidCount?: number;
  listing?: {
    reserveEth?: string | null;
    endsAt?: string | null;
    startsAt?: string | null;
    minBid?: string | null;
    minBidWei?: string | null;
  };
};

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, fn: (accounts: string[]) => void) => void;
  removeListener?: (event: string, fn: (accounts: string[]) => void) => void;
};

function formatRemain(endsAt: string | null | undefined, now: number): string {
  if (!endsAt) return `${BLOCK_AUCTION_HOURS}h from first bid`;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return `${BLOCK_AUCTION_HOURS}h from first bid`;
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

function shortWallet(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function HangMedia({
  panel,
  still,
  revealed,
}: {
  panel: BlockPanel;
  still: boolean;
  revealed: boolean;
}) {
  const video = !still && revealed ? panel.video : undefined;
  const poster = revealed ? panel.look || panel.still : panel.still;
  const img = !revealed ? panel.still : still ? poster : panel.thumb;
  return (
    <>
      {video ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={video} poster={poster} autoPlay muted loop playsInline />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" />
      )}
      <em>{String(panel.panel).padStart(2, '0')}</em>
      {!revealed ? <span className="ex-would-veil">Unrevealed</span> : null}
    </>
  );
}

export default function OnTheBlockPage() {
  const [dark, setDark] = useState(true);
  const [showTop, setShowTop] = useState(false);
  const [look, setLook] = useState(false);
  const [lookTier, setLookTier] = useState<BlockTier>('1080');
  const [lookPanel, setLookPanel] = useState<BlockPanel['panel']>(2);
  const [market, setMarket] = useState<Market>({});
  const [now, setNow] = useState(() => Date.now());
  const [quiet, setQuiet] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletNote, setWalletNote] = useState<string | null>(null);
  const [bidEth, setBidEth] = useState('');
  const [bidTouched, setBidTouched] = useState(false);
  const [bidding, setBidding] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);

  const status = market.status || blockStatusAt(now);
  const statusLabel = market.statusLabel || blockStatusLabel(status as ReturnType<typeof blockStatusAt>);
  const live = status === 'live';
  const minBidEth = market.listing?.minBid || BLOCK_LISTING.reserveEth.replace(' ETH', '');
  const panel = BLOCK_PANELS.find((p) => p.panel === lookPanel) || BLOCK_PANELS[0];
  const panelOpen = blockPanelRevealed(panel, now);
  const centerOpen = blockPanelRevealed(BLOCK_PANELS[1], now);
  const remain = useMemo(
    () => formatRemain(market.listing?.endsAt || BLOCK_LISTING.endsAt, now),
    [market.listing?.endsAt, now],
  );
  const observeSrc = panelOpen
    ? panelVideo(panel, lookTier) || panel.look
    : panel.still;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setQuiet(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 360);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch('/api/on-the-block')
        .then((r) => r.json())
        .then((d: Market & { ok?: boolean }) => {
          if (alive && d?.ok) setMarket(d);
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 20000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!bidTouched && minBidEth) setBidEth(minBidEth);
  }, [bidTouched, minBidEth]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth?.on) return;
    const onAccounts = (accounts: string[]) => setWallet(accounts?.[0]?.toLowerCase() || null);
    eth.on('accountsChanged', onAccounts);
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts);
    };
  }, []);

  const connectWallet = async () => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) {
      setWalletNote('Open this page in a wallet browser, or install a wallet.');
      return;
    }
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      const next = accounts?.[0]?.toLowerCase() || null;
      setWallet(next);
      setWalletNote(null);
    } catch {
      setWalletNote('Connection was cancelled.');
    }
  };

  const placeBid = async () => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    let from = wallet;
    if (!from) {
      await connectWallet();
      const accounts = eth
        ? ((await eth.request({ method: 'eth_accounts' })) as string[])
        : [];
      from = accounts?.[0]?.toLowerCase() || null;
      if (!from) return;
    }
    if (!eth) {
      setWalletNote('Open this page in a wallet browser, or install a wallet.');
      return;
    }
    const total = parseEth(bidEth);
    const min = parseEth(minBidEth);
    if (total == null) {
      setWalletNote('Enter the bid in ETH.');
      return;
    }
    if (min != null && total < min) {
      setWalletNote(`The next bid must be at least ${minBidEth} ETH.`);
      return;
    }
    setBidding(true);
    setWalletNote(null);
    try {
      await sendAuctionBid(
        eth,
        from,
        total,
        BigInt(market.currentBidWei || '0'),
        market.bidder || null,
      );
      setThanks(bidEth.trim());
      setBidTouched(false);
      setWalletNote(null);
    } catch (err) {
      const code = (err as { code?: number })?.code;
      const raw = err instanceof Error ? err.message : String((err as { message?: string })?.message || '');
      const declined = code === 4001 || /reject|denied|cancel/i.test(raw);
      setWalletNote(declined ? 'The bid was not placed.' : 'The bid could not be placed. Please try again.');
    } finally {
      setBidding(false);
    }
  };

  const openLook = (n: BlockPanel['panel']) => {
    setLookPanel(n);
    setLookTier('1080');
    setLook(true);
  };

  const bidLabel = bidding ? 'Placing…' : live ? 'Place bid' : 'Not live';
  const revealAt = Date.parse(BLOCK_REVEAL_AT);
  const opensAt = Date.parse(BLOCK_BID_OPENS_AT);

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
        <meta property="og:image" content={`https://explore.nikxart.xyz${BLOCK_SHARE}`} key="og-image" />
        <meta property="og:image:width" content={BLOCK_SHARE_W} key="og-image-w" />
        <meta property="og:image:height" content={BLOCK_SHARE_H} key="og-image-h" />
        <meta property="og:image:type" content="image/jpeg" key="og-image-type" />
        <meta property="og:image:alt" content="Voices Of Time hung as a triptych" key="og-image-alt" />
        <meta name="twitter:card" content="summary_large_image" key="twitter-card" />
        <meta name="twitter:title" content={BLOCK_TITLE} key="twitter-title" />
        <meta name="twitter:description" content={BLOCK_DESC} key="twitter-desc" />
        <meta name="twitter:image" content={`https://explore.nikxart.xyz${BLOCK_SHARE}`} key="twitter-image" />
      </Head>

      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <div className={`ex ex-block${dark ? '' : ' theme-light'}`}>
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
            <LivePill />
            <a className="ex-nav-garden" href="/garden">
              Garden
            </a>
          </div>
        </header>

        <section className="ex-series-intro ex-collection-hero">
          <p className="ex-series-label">On The Block · 1 of 1s · triptych</p>
          <h1 className="ex-series-title">{BLOCK_WORK_TITLE}</h1>
          <p className="ex-would-gold">{BLOCK_BLIP}</p>
          <p className="ex-series-desc">Three canvases, one painting. Auctioned as one.</p>
        </section>

        <section className="ex-would-hero" aria-label="Triptych">
          <div className="ex-block-hang">
            {BLOCK_PANELS.map((p) => {
              const open = blockPanelRevealed(p, now);
              return (
                <button
                  key={p.panel}
                  type="button"
                  className={`ex-block-hang-cell${open ? '' : ' is-veil'}`}
                  onClick={() => openLook(p.panel)}
                  aria-label={`${p.name}, panel ${String(p.panel).padStart(2, '0')}. Look closer.`}
                >
                  <HangMedia panel={p} still={quiet} revealed={open} />
                </button>
              );
            })}
          </div>
          <p className="ex-would-hang-note">Three frames, hung as a set. A 1 of 1.</p>
        </section>

        <div className="ex-grid-wrap ex-would-wrap">
          <section className="ex-would-copy">
            <p>
              <em>Voices Of Time</em> is a 1 of 1 on the 1 of 1s contract. Three canvases, one
              painting, auctioned as one. The painting does not fraction. The center is called. The
              wings follow it home.
            </p>
            <p>
              Panel <strong>02</strong>
              {centerOpen ? ', Pendant,' : ' — the unrevealed middle —'} is on the block. Panel{' '}
              <strong>01</strong>, Devil, and panel <strong>03</strong>, Angel, stay with the studio
              until the bid settles, then transfer to the winning wallet. All three canvases leave
              together. One owner.
            </p>
          </section>

          <section className="ex-block-desk" aria-label="Auction">
            <p className="ex-would-gold">Panel 02 is on the block</p>
            <p className={`ex-block-live is-${status}`}>{statusLabel}</p>
            <ul className="ex-block-schedule">
              {now < revealAt ? (
                <li>
                  Center unveils <strong>{formatEastern(BLOCK_REVEAL_AT)}</strong>
                </li>
              ) : null}
              {now < opensAt ? (
                <li>
                  Bidding opens <strong>{formatEastern(BLOCK_BID_OPENS_AT)}</strong>
                </li>
              ) : null}
              <li>
                <strong>{BLOCK_AUCTION_HOURS} hours</strong> from the first bid
              </li>
              <li>
                Each new bid rises by <strong>{BLOCK_LISTING.minIncrement}</strong>
              </li>
              <li>
                A bid in the final {BLOCK_LISTING.extension} adds{' '}
                <strong>{BLOCK_LISTING.extension}</strong>
              </li>
            </ul>
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
            {thanks ? (
              <div className="ex-block-thanks" role="status">
                <em>Thank you.</em>
                <span>Your bid of {thanks} ETH is with the work. Best of luck.</span>
                <button
                  type="button"
                  className="ex-block-again"
                  onClick={() => {
                    setThanks(null);
                    setWalletNote(null);
                  }}
                >
                  Place another bid
                </button>
              </div>
            ) : (
              <form
                className="ex-block-bid"
                onSubmit={(e) => {
                  e.preventDefault();
                  void placeBid();
                }}
              >
                <label htmlFor="block-bid">Your bid</label>
                <div className="ex-block-bid-row">
                  <input
                    id="block-bid"
                    inputMode="decimal"
                    autoComplete="off"
                    value={bidEth}
                    placeholder={minBidEth}
                    disabled={!live || bidding}
                    onChange={(e) => {
                      setBidTouched(true);
                      setBidEth(e.target.value);
                    }}
                  />
                  <span>ETH</span>
                </div>
                <p className="ex-block-bid-min">Minimum {minBidEth} ETH</p>
                <div className="ex-block-actions">
                  {wallet ? (
                    <span className="ex-block-wallet">{shortWallet(wallet)}</span>
                  ) : (
                    <button type="button" className="ex-read-more" onClick={() => void connectWallet()}>
                      Connect wallet
                    </button>
                  )}
                  <button type="submit" className="ex-garden-enter" disabled={!live || bidding}>
                    {bidLabel}
                  </button>
                </div>
              </form>
            )}
            {walletNote && !thanks ? <p className="ex-block-note">{walletNote}</p> : null}
            <p className="ex-block-note">
              The bid stays on this desk. The winning wallet receives Devil and Angel from the
              studio. One bid. One set.
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
                  const open = blockPanelRevealed(p, now);
                  const href = blockManifoldItem(p.tokenId);
                  const inner = (
                    <>
                      <span className="ex-card-media ex-would-set-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={!open ? p.still : quiet ? p.look || p.still : p.thumb}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                        {!open ? <span className="ex-would-veil">Unrevealed</span> : null}
                      </span>
                      <span className="ex-card-meta">
                        <span className="ex-card-title">
                          {String(p.panel).padStart(2, '0')} · {p.name}
                        </span>
                        <span className={`ex-would-status is-${p.role === 'auction' ? 'available' : 'soon'}`}>
                          <span className="ex-would-status-dot" aria-hidden="true" />
                          {p.role === 'auction' ? 'On the block' : 'Awarded with the win'}
                          {p.tokenId != null ? ` · #${p.tokenId}` : ''}
                        </span>
                      </span>
                    </>
                  );
                  if (href) {
                    return (
                      <a
                        key={p.panel}
                        className="ex-card"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {inner}
                      </a>
                    );
                  }
                  return (
                    <button
                      key={p.panel}
                      type="button"
                      className="ex-card ex-block-card"
                      onClick={() => openLook(p.panel)}
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ex-would-copy ex-would-copy--after">
            <p>
              A triptych as three canvases is still the form — economical structure, belief in the
              painting as a whole. Here the rarity is the whole. One bid. One wallet. The three
              panels hang as they were painted.
            </p>
          </section>

          <section className="ex-would-panel">
            <p className="ex-would-gold">Take a closer look..</p>
            <button
              type="button"
              className="ex-would-panel-btn"
              onClick={() => openLook(lookPanel)}
              aria-label={`Look closer at ${panel.name}, panel ${String(lookPanel).padStart(2, '0')}`}
            >
              {panel.video && panelOpen && !quiet ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  key={panel.video}
                  src={panel.video}
                  poster={panel.look || panel.still}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    !panelOpen
                      ? panel.still
                      : quiet
                        ? panel.look || panel.still
                        : panel.thumb
                  }
                  alt={`${BLOCK_WORK_TITLE} · ${panel.name}`}
                  loading="lazy"
                  decoding="async"
                />
              )}
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
                  onClick={() => {
                    setLookPanel(p.panel);
                    setLookTier('1080');
                  }}
                >
                  {String(p.panel).padStart(2, '0')} · {p.name}
                </button>
              ))}
            </div>
          </section>

          <hr className="ex-would-rule" />

          <footer className="ex-would-foot">
            <LivePill />
            <a className="ex-read-more" href={BLOCK_COLLECTION_HREF}>
              {BLOCK_COLLECTION_LABEL}
            </a>
            <a className="ex-read-more" href="/marche">
              Marché
            </a>
            {centerOpen ? null : (
              <p className="ex-would-asterisk">
                * The center remains veiled until it is called. Devil and Angel are shown so the set
                can be known as a painting, not as three listings.
              </p>
            )}
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
          src={observeSrc}
          poster={panelOpen ? panel.look || panel.still : panel.still}
          alt={`${BLOCK_WORK_TITLE} · ${panel.name}`}
          title={`${BLOCK_WORK_TITLE} · ${String(lookPanel).padStart(2, '0')} ${panel.name}`}
          onClose={() => setLook(false)}
          hint={
            panelOpen && panel.video
              ? `${lookTier.toUpperCase()} motion · drag to move · pinch or scroll to zoom`
              : undefined
          }
          nav={
            <div className="ex-would-panel-switch" role="tablist" aria-label="Panel">
              {BLOCK_PANELS.map((p) => (
                <button
                  key={p.panel}
                  type="button"
                  role="tab"
                  aria-selected={lookPanel === p.panel}
                  className={lookPanel === p.panel ? 'is-on' : ''}
                  onClick={() => {
                    setLookPanel(p.panel);
                    setLookTier('1080');
                  }}
                >
                  {String(p.panel).padStart(2, '0')} · {p.name}
                </button>
              ))}
              {panelOpen && panel.video
                ? BLOCK_TIERS.filter((t) => panelVideo(panel, t.id)).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={lookTier === t.id ? 'is-on' : ''}
                      onClick={() => setLookTier(t.id)}
                    >
                      {t.label}
                    </button>
                  ))
                : null}
            </div>
          }
        />
      ) : null}
    </>
  );
}
