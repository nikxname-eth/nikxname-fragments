import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllWorks, getBlossomCanvasWork, type ExploreWork, type SeriesId } from '../config/catalog';
import { collectorFor, isAtelierAdmin, type CollectorProfile } from '../lib/collectors';
import { getWillItWorks, matchWillItWork } from '../lib/willItWorks';
import { getEmbersWorks, matchEmberWork } from '../lib/embersWorks';
import { editionIdentity } from '../lib/editionIdentity';
import { getAfbSpecialEditions } from '../lib/chainWorks';
import { WorkStage } from '../components/WorkStage';
import { ArrangeWall } from '../components/ArrangeWall';
import { CatalogueBook } from '../components/CatalogueBook';
import { LookBook } from '../components/LookBook';
import { CanvasLook } from '../components/CanvasLook';
import { LivePill } from '../components/LivePill';
import { observeStillUrl } from '../lib/mediaUrl';
import { rasterMarketUrl } from '../config/catalog';

type GardenToken = {
  seriesId: SeriesId;
  collection: string;
  contract: string;
  chain: string;
  tokenId: string;
  name: string;
  quantity: number;
  previewUrl?: string;
  contentUrl?: string;
};

type Bed = { seriesId: SeriesId; label: string; tokens: GardenToken[] };

type GardenPayload = {
  ok: boolean;
  wallet?: string;
  source?: string;
  total?: number;
  beds?: Bed[];
  error?: string;
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function walletFromPath(path: string): string | null {
  const m = path.split('?')[0].match(/\/garden\/(0x[a-fA-F0-9]{40})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

function gardenShareUrl(address: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://explore.nikxart.xyz';
  return `${origin}/garden/${address.toLowerCase()}`;
}

function matchWork(token: GardenToken, catalog: ExploreWork[]): ExploreWork | null {
  const id = `${token.seriesId}-${token.tokenId}`;
  const byId = catalog.find((w) => w.id === id);
  if (byId) return byId;
  const ember = matchEmberWork(token.name, token.tokenId);
  if (ember) return ember;
  const will = matchWillItWork(token.name, token.tokenId);
  if (will) return will;
  const title = token.name.trim().toLowerCase();
  if (title.includes('blossom fragment')) {
    return getBlossomCanvasWork(title.includes('anim') ? 'animated' : 'still');
  }
  const byTitle = catalog.find(
    (w) => w.seriesId === token.seriesId && w.title.trim().toLowerCase() === title,
  );
  if (byTitle) return byTitle;
  if (token.seriesId === 'a-familiar-burn') {
    const m = token.name.match(/fragment\s*0*(\d{1,2})/i);
    if (m) {
      const n = Number(m[1]);
      return catalog.find((w) => w.pieceNumber === n) ?? null;
    }
  }
  return null;
}

function asTheatreWork(token: GardenToken, catalog: ExploreWork[]): ExploreWork {
  const matched = matchWork(token, catalog);
  if (matched) {
    return {
      ...matched,
      title: matched.title || token.name,
      collectionLabel: token.collection || matched.collectionLabel,
      mediaUrl: matched.mediaUrl || token.contentUrl,
      originCoverUrl:
        matched.originCoverUrl && !matched.originCoverUrl.includes('/explore/previews/')
          ? matched.originCoverUrl
          : token.contentUrl || matched.originCoverUrl,
    };
  }
  const video = /\.(mp4|webm)(\?|$)/i.test(token.contentUrl || '');
  const content = token.contentUrl || '';
  const preview = token.previewUrl || '';
  return {
    id: `garden-${token.seriesId}-${token.tokenId}`,
    seriesId: token.seriesId,
    title: token.name,
    collectionLabel: token.collection,
    kind: 'edition',
    coverUrl: preview || content,
    originCoverUrl: video ? preview : content || preview,
    mediaUrl: content || preview,
    mediaType: video ? 'video' : 'image',
    contractAddress: token.contract,
    tokenId: Number(token.tokenId),
    sort: Number(token.tokenId) || 0,
  };
}

export default function GardenPage() {
  const [dark, setDark] = useState(true);
  const [viewWallet, setViewWallet] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'loading' | 'ready' | 'empty' | 'error'>(
    'idle',
  );
  const [note, setNote] = useState('');
  const [payload, setPayload] = useState<GardenPayload | null>(null);
  const [selected, setSelected] = useState<ExploreWork | null>(null);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [eggOpen, setEggOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [bookMode, setBookMode] = useState<null | 'book' | 'offers'>(null);
  const [lookOpen, setLookOpen] = useState(false);
  const [observeOpen, setObserveOpen] = useState(false);
  const [observeWork, setObserveWork] = useState<ExploreWork | null>(null);
  const [hangSeed, setHangSeed] = useState<ExploreWork | null>(null);
  const [collapsedBeds, setCollapsedBeds] = useState<string[]>([]);
  const catalog = useMemo(() => {
    const seen = new Set<string>();
    const out: ExploreWork[] = [];
    for (const w of [
      ...getAfbSpecialEditions(),
      ...getAllWorks(),
      ...getWillItWorks(),
      ...getEmbersWorks(),
    ]) {
      if (w.kind === 'market' || seen.has(w.id)) continue;
      seen.add(w.id);
      out.push(w);
    }
    return out;
  }, []);
  const viewOnly = Boolean(viewWallet);
  const gardenWallet = viewWallet || wallet;
  const inGarden = status === 'ready' || status === 'empty';
  const [bookProfile, setBookProfile] = useState<CollectorProfile | null>(null);
  const curator = bookProfile ?? collectorFor(gardenWallet);

  const onEggClick = useCallback(() => {
    setEggOpen(true);
  }, []);

  const loadGarden = useCallback(async (address: string, quiet = false) => {
    if (!quiet) {
      setStatus('loading');
      setNote('Walking the beds…');
    }
    try {
      const res = await fetch(`/api/garden?wallet=${encodeURIComponent(address)}`);
      const data = (await res.json()) as GardenPayload;
      if (!data.ok) {
        if (!quiet) {
          setStatus('error');
          setNote('The garden could not be read just now. Try again in a moment.');
        }
        return;
      }
      setPayload(data);
      setStatus((data.total || 0) > 0 ? 'ready' : 'empty');
      if (!quiet) setNote('');
    } catch {
      if (!quiet) {
        setStatus('error');
        setNote('The garden could not be reached.');
      }
    }
  }, []);

  const connect = async () => {
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string[]> } })
      .ethereum;
    if (!eth) {
      setStatus('error');
      setNote('Open this page in a wallet browser, or install a browser wallet to enter.');
      return;
    }
    setStatus('connecting');
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const next = accounts?.[0]?.toLowerCase();
      if (!next) throw new Error('no account');
      setWallet(next);
      await loadGarden(next);
    } catch {
      setStatus('idle');
      setNote('Connection was cancelled.');
    }
  };

  useEffect(() => {
    const fromPath = walletFromPath(window.location.pathname);
    if (fromPath) {
      setViewWallet(fromPath);
      void loadGarden(fromPath);
      return;
    }
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string[]> } })
      .ethereum;
    if (!eth) return;
    void eth.request({ method: 'eth_accounts' }).then((accs) => {
      const a = accs?.[0]?.toLowerCase();
      if (a) {
        setWallet(a);
        void loadGarden(a);
      }
    });
  }, [loadGarden]);

  useEffect(() => {
    if (!gardenWallet) {
      setBookProfile(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/collectors?wallet=${encodeURIComponent(gardenWallet)}`)
      .then((r) => r.json())
      .then((d: { profile?: CollectorProfile | null }) => {
        if (!cancelled) setBookProfile(d.profile ?? collectorFor(gardenWallet));
      })
      .catch(() => {
        if (!cancelled) setBookProfile(collectorFor(gardenWallet));
      });
    return () => {
      cancelled = true;
    };
  }, [gardenWallet]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('ex-garden-beds-collapsed');
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) setCollapsedBeds(parsed.map(String));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (viewOnly || !wallet || (status !== 'ready' && status !== 'empty')) return;
    const id = window.setInterval(() => {
      void loadGarden(wallet, true);
    }, 20_000);
    return () => window.clearInterval(id);
  }, [wallet, status, loadGarden, viewOnly]);

  const copyGardenLink = useCallback(async () => {
    if (!gardenWallet) return;
    const url = gardenShareUrl(gardenWallet);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [gardenWallet]);

  const displayBeds = useMemo(() => {
    return (payload?.beds || []).map((bed) => {
      const map = new Map<string, GardenToken>();
      for (const t of bed.tokens) {
        const matched = matchWork(t, catalog);
        const key = matched
          ? matched.kind === 'fragment' && matched.pieceNumber != null
            ? `fragment-${matched.pieceNumber}`
            : matched.id
          : editionIdentity(t.name, bed.seriesId).key;
        const qty = t.quantity || 1;
        const existing = map.get(key);
        const label = matched?.title || editionIdentity(t.name, bed.seriesId).label;
        if (!existing) {
          map.set(key, { ...t, name: label, quantity: qty });
          continue;
        }
        const keep = Number(t.tokenId) < Number(existing.tokenId) ? t : existing;
        map.set(key, {
          ...keep,
          name: label,
          quantity: existing.quantity + qty,
        });
      }
      return { ...bed, tokens: [...map.values()] };
    });
  }, [payload, catalog]);
  const ownedWorks = useMemo(
    () => displayBeds.flatMap((b) => b.tokens.map((t) => asTheatreWork(t, catalog))),
    [displayBeds, catalog],
  );
  const ownedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bed of payload?.beds || []) {
      for (const t of bed.tokens || []) ids.add(`${bed.seriesId}-${t.tokenId}`);
    }
    for (const w of ownedWorks) {
      ids.add(w.id);
      if (w.tokenId != null) ids.add(`${w.seriesId}-${w.tokenId}`);
    }
    return ids;
  }, [payload, ownedWorks]);
  const theatreList = useMemo(() => {
    if (ownedWorks.length) return ownedWorks;
    return catalog;
  }, [ownedWorks, catalog]);
  const observeList = ownedWorks.length ? ownedWorks : catalog;

  const tokenTotal = payload?.total ?? 0;
  const total = ownedWorks.length;

  return (
    <>
      <Head>
        <title>
          {viewOnly
            ? `${curator?.name ?? 'A garden'} · Looking · Nikxname`
            : 'The Garden · Nikxname'}
        </title>
        <meta
          name="description"
          content={
            viewOnly
              ? 'A looking garden — works held, shown as they are.'
              : 'A quiet sanctuary for works you hold — six collections, one garden.'
          }
        />
      </Head>

      <div className="glow glow-r" />
      <div className="glow glow-b" />

      <div className={`ex ex-garden${dark ? '' : ' theme-light'}`}>
        <header className="ex-nav">
          <div className="ex-nav-left">
            <a className="ex-mark" href="https://nikxart.xyz">
              Nikxname
            </a>
            <nav className="ex-nav-links" aria-label="Primary">
              <a className="ex-nav-link" href="/">
                Explore
              </a>
              <a className="ex-nav-link" href="/who">
                Who?
              </a>
            </nav>
          </div>
          <div className="ex-nav-right">
            <LivePill />
            {gardenWallet && (
              <span className="ex-garden-addr" title={gardenWallet}>
                {curator ? (
                  <>
                    <span className="ex-garden-addr-name">{curator.name}</span>
                    <span className="ex-garden-addr-title">
                      {viewOnly ? 'Looking' : curator.title}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="ex-garden-addr-name">{shortAddr(gardenWallet)}</span>
                    {viewOnly ? <span className="ex-garden-addr-title">Looking</span> : null}
                  </>
                )}
              </span>
            )}
            <button
              type="button"
              className="ex-theme-btn"
              onClick={() => setDark((v) => !v)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀' : '☾'}
            </button>
            {!viewOnly && isAtelierAdmin(gardenWallet) ? (
              <a className="ex-nav-link" href="/atelier">
                Atelier
              </a>
            ) : null}
            <a className="ex-nav-garden is-active" href="/garden">
              Garden
            </a>
          </div>
        </header>

        <section className="ex-garden-hero">
          <p className="ex-garden-kicker">
            {viewOnly ? curator?.kicker ?? 'A private garden' : curator?.kicker ?? 'Collector sanctuary'}
          </p>
          <h1 className="ex-garden-title">
            The{' '}
            <span className="ex-garden-title-garden">
              Gard
              <span className="ex-garden-title-en">
                en
                {inGarden && !viewOnly ? (
                  <button
                    type="button"
                    className="ex-garden-fly"
                    onClick={() => void onEggClick()}
                    aria-label="A quiet mark"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dark ? '/garden/butterfly-dark.png' : '/garden/butterfly-light.png'}
                      alt=""
                      draggable={false}
                    />
                  </button>
                ) : (
                  <span className="ex-garden-fly" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dark ? '/garden/butterfly-dark.png' : '/garden/butterfly-light.png'}
                      alt=""
                      draggable={false}
                    />
                  </span>
                )}
              </span>
            </span>
          </h1>
          <p className="ex-garden-lead">
            {viewOnly
              ? curator?.lead ?? 'Works held, shown as they are — looking only. No Atelier.'
              : curator?.lead ?? 'Not a dashboard. A quiet bed of works you actually hold.'}
          </p>

          {viewOnly && status === 'error' ? (
            <a className="ex-garden-enter is-quiet" href="/garden">
              Enter your garden
            </a>
          ) : null}

          {!viewOnly && (status === 'idle' || status === 'connecting' || status === 'error') ? (
            <button
              type="button"
              className="ex-garden-enter"
              onClick={() => void connect()}
              disabled={status === 'connecting'}
            >
              {status === 'connecting' ? 'Opening the gate…' : 'Enter with wallet'}
            </button>
          ) : null}

          {status === 'loading' && <p className="ex-garden-status">{note || 'Walking the beds…'}</p>}
          {note && status !== 'loading' && <p className="ex-garden-status">{note}</p>}
        </section>

        {status === 'empty' && (
          <div className="ex-garden-grounds">
            <div className="ex-garden-toolbar">
              <p className="ex-garden-count">{viewOnly ? 'Looking' : 'Studio book'}</p>
              <div className="ex-garden-toolbar-actions">
                {isAtelierAdmin(gardenWallet) && !viewOnly ? (
                  <>
                    <button type="button" className="ex-garden-arrange-btn" onClick={() => setBookMode('book')}>
                      Catalogue
                    </button>
                    <button type="button" className="ex-garden-arrange-btn" onClick={() => setBookMode('offers')}>
                      Offers
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className={`ex-garden-arrange-btn${observeOpen && !observeWork ? ' is-open' : ''}`}
                  onClick={() => {
                    setObserveOpen(true);
                    setObserveWork(null);
                    setArrangeOpen(false);
                  }}
                >
                  Observation
                </button>
                {!viewOnly ? (
                  <button
                    type="button"
                    className={`ex-garden-arrange-btn${arrangeOpen ? ' is-open' : ''}`}
                    onClick={() => {
                      setArrangeOpen(true);
                      setObserveOpen(false);
                    }}
                  >
                    Your Atelier
                  </button>
                ) : null}
              </div>
            </div>
            <p className="ex-garden-empty">This garden is still waiting for its first planting.</p>
          </div>
        )}

        {status === 'ready' && payload?.beds && (
          <div className="ex-garden-grounds">
            <div className="ex-garden-toolbar">
              <p className="ex-garden-count">
                {total} work{total === 1 ? '' : 's'} in the soil
                {tokenTotal > total ? ` · ${tokenTotal} tokens` : ''}
                {viewOnly ? ' · looking' : ''}
              </p>
              {viewOnly ? (
                <div className="ex-garden-toolbar-actions">
                  <span className="ex-garden-looking">View only</span>
                  <button
                    type="button"
                    className={`ex-garden-arrange-btn${observeOpen && !observeWork ? ' is-open' : ''}`}
                    onClick={() => {
                      setObserveOpen(true);
                      setObserveWork(null);
                    }}
                  >
                    Observation
                  </button>
                </div>
              ) : (
                <div className="ex-garden-toolbar-actions">
                  {isAtelierAdmin(gardenWallet) ? (
                    <>
                      <button type="button" className="ex-garden-arrange-btn" onClick={() => setBookMode('book')}>
                        Catalogue
                      </button>
                      <button type="button" className="ex-garden-arrange-btn" onClick={() => setBookMode('offers')}>
                        Offers
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className={`ex-garden-arrange-btn${observeOpen && !observeWork ? ' is-open' : ''}`}
                    onClick={() => {
                      setObserveOpen(true);
                      setObserveWork(null);
                      setArrangeOpen(false);
                    }}
                  >
                    Observation
                  </button>
                  <button
                    type="button"
                    className={`ex-garden-arrange-btn${arrangeOpen ? ' is-open' : ''}`}
                    onClick={() => {
                      setArrangeOpen(true);
                      setObserveOpen(false);
                    }}
                  >
                    Your Atelier
                  </button>
                </div>
              )}
            </div>
            {displayBeds.map((bed) => (
              <section
                key={bed.seriesId}
                className={`ex-garden-bed${collapsedBeds.includes(bed.seriesId) ? ' is-closed' : ''}`}
              >
                <button
                  type="button"
                  className="ex-garden-bed-head"
                  aria-expanded={!collapsedBeds.includes(bed.seriesId)}
                  onClick={() => {
                    setCollapsedBeds((prev) => {
                      const next = prev.includes(bed.seriesId)
                        ? prev.filter((id) => id !== bed.seriesId)
                        : [...prev, bed.seriesId];
                      try {
                        window.localStorage.setItem('ex-garden-beds-collapsed', JSON.stringify(next));
                      } catch {
                        /* ignore */
                      }
                      return next;
                    });
                  }}
                >
                  <h2>{bed.label}</h2>
                  <span>
                    {bed.tokens.length}
                    <i aria-hidden="true">{collapsedBeds.includes(bed.seriesId) ? '+' : '–'}</i>
                  </span>
                </button>
                <div className="ex-garden-row">
                  {bed.tokens.map((token) => {
                    const work = asTheatreWork(token, catalog);
                    const thumb = work.coverUrl || token.previewUrl;
                    return (
                    <motion.button
                      key={`${token.contract}-${token.tokenId}`}
                      type="button"
                      className={`ex-garden-bloom${work.tags?.includes('embers') ? ' is-ember' : ''}`}
                      onClick={() => setSelected(work)}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span className="ex-garden-bloom-media">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const img = e.currentTarget;
                              const src = img.src;
                              if (token.previewUrl && src !== token.previewUrl) {
                                img.src = token.previewUrl;
                                return;
                              }
                              if (src.includes('-anim.gif')) {
                                img.src = src.replace('-anim.gif', '.avif');
                                return;
                              }
                              if (src.includes('-anim.avif')) {
                                img.src = src.replace('-anim.avif', '.avif');
                                return;
                              }
                              img.onerror = null;
                              img.removeAttribute('src');
                            }}
                          />
                        ) : (
                          <span className="ex-garden-bloom-fallback" />
                        )}
                      </span>
                      <span className="ex-garden-bloom-name">{work.title || token.name}</span>
                      {token.quantity > 1 && (
                        <span className="ex-garden-bloom-qty">×{token.quantity}</span>
                      )}
                    </motion.button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {gardenWallet && inGarden ? (
          <div className="ex-garden-share">
            <p className="ex-garden-share-kicker">
              {viewOnly ? 'This garden’s looking link' : 'Your looking link'}
            </p>
            <p className="ex-garden-share-lead">
              {viewOnly
                ? 'Works can be opened. This garden is looking only — no Atelier.'
                : 'Open this on a phone, or share it. Friends can look at the works. They cannot hang.'}
            </p>
            <div className="ex-garden-share-row">
              <code className="ex-garden-share-url">{gardenShareUrl(gardenWallet)}</code>
              <button type="button" className="ex-garden-share-copy" onClick={() => void copyGardenLink()}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            {viewOnly ? (
              <p className="ex-garden-share-note">
                This is yours? <a href="/garden">Enter with wallet</a> to hang.
              </p>
            ) : null}
          </div>
        ) : null}

        <footer className="ex-garden-foot">
          <LivePill />
          <a className="ex-garden-market" href={rasterMarketUrl()} target="_blank" rel="noopener noreferrer">
            Secondary Market
          </a>
          <span>— Sit For A Moment With Art —</span>
        </footer>

        <AnimatePresence>
          {showTop && inGarden && (
            <motion.button
              type="button"
              className="ex-garden-to-top"
              aria-label="Back to top"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {eggOpen && (
          <motion.div
            className="ex-garden-egg-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEggOpen(false)}
          >
            <motion.p
              className="ex-garden-egg-note"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              the first person to screenshot this message & send to me directly is eligible to
              receive a GIFT
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {inGarden && !viewOnly && !arrangeOpen ? (
        <LookBook
          open={lookOpen}
          catalogue={catalog}
          ownedIds={ownedIds}
          onToggle={() => setLookOpen((v) => !v)}
          onHang={(w) => {
            setHangSeed(w);
            setArrangeOpen(true);
            setLookOpen(false);
          }}
          onObserve={(w) => {
            setObserveWork(w);
            setObserveOpen(false);
            setLookOpen(false);
          }}
        />
      ) : null}

      {observeOpen && !observeWork ? (
        <div className="ex-observe-room" role="dialog" aria-modal="true" aria-label="Observation">
          <header>
            <p>Observation</p>
            <button type="button" className="ex-look-close" onClick={() => setObserveOpen(false)} aria-label="Close">
              ✕
            </button>
          </header>
          <p className="ex-observe-lead">Choose a work to look at closely.</p>
          <div className="ex-observe-grid">
            {observeList.slice(0, 120).map((w) => (
              <button key={w.id} type="button" onClick={() => { setObserveWork(w); setObserveOpen(false); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.coverUrl} alt="" loading="lazy" />
                <span>{w.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {observeWork ? (
        <CanvasLook
          src={observeStillUrl(observeWork)}
          alt={observeWork.title}
          title={observeWork.title}
          onClose={() => setObserveWork(null)}
        />
      ) : null}

      {bookMode && gardenWallet && !viewOnly ? (
        <CatalogueBook
          mode={bookMode}
          wallet={gardenWallet}
          holdings={(payload?.beds || []).flatMap((b) => b.tokens)}
          onClose={() => setBookMode(null)}
        />
      ) : null}

      <AnimatePresence>
        {!viewOnly && arrangeOpen && (
          <ArrangeWall
            key="arrange"
            works={ownedWorks}
            catalogue={catalog}
            seed={hangSeed}
            onClose={() => {
              setArrangeOpen(false);
              setHangSeed(null);
            }}
            onObserve={(w) => {
              setArrangeOpen(false);
              setObserveWork(w);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <WorkStage
            work={selected}
            works={theatreList}
            onClose={() => setSelected(null)}
            onNavigate={setSelected}
          />
        )}
      </AnimatePresence>
    </>
  );
}
