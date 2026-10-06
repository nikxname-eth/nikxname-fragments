import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import Head from 'next/head';
import {
  SERIES,
  getFragmentWorks,
  getSeriesById,
  getWorksBySeries,
  type ExploreWork,
  type SeriesId,
} from '../config/catalog';
import { getAfbSpecialEditions } from '../lib/chainWorks';
import { NIKX_CONTRACTS } from '../lib/contracts';
import { getEmbersWorks, matchEmberWork } from '../lib/embersWorks';
import { fetchTokenOwner, type OwnerResult } from '../lib/owner';
import { getWillItWorks, matchWillItWork } from '../lib/willItWorks';
import { catalogueThumbUrl, observeStillUrl } from '../lib/mediaUrl';
import { BLOCK_SHARE, BLOCK_WORK_TITLE } from '../config/on-the-block';
import { LivePill } from '../components/LivePill';

type MarcheListing = {
  id: string;
  seriesId: string;
  seriesLabel: string;
  tokenId: string;
  title: string;
  price?: string;
  href: string;
  source: 'opensea' | 'raster';
  image?: string;
};

type Density = 's' | 'm';
type MarcheView = 'listed' | 'looking';
type PickedWork = {
  work?: ExploreWork;
  listed?: MarcheListing;
  intent: 'buy' | 'offer';
};

function shelfKey(item: PickedWork): string {
  return item.listed?.id || item.work?.id || '';
}

const DENSITY: Record<Density, { min: string; label: string; icon: number }> = {
  s: { min: '160px', label: 'Small', icon: 10 },
  m: { min: '240px', label: 'Medium', icon: 14 },
};

function catalogWorks(): ExploreWork[] {
  return SERIES.filter((s) => s.id !== 'market').flatMap((s) => {
    if (s.id === 'a-familiar-burn') {
      return [
        ...getAfbSpecialEditions(),
        ...getFragmentWorks(),
        ...getEmbersWorks(),
        ...getWillItWorks(),
      ];
    }
    return getWorksBySeries(s.id as SeriesId);
  });
}

function norm(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function catalogIndex(works: ExploreWork[]): Map<string, ExploreWork> {
  const m = new Map<string, ExploreWork>();
  const put = (key: string | number | undefined, work: ExploreWork) => {
    if (key == null || key === '') return;
    const k = String(key);
    if (!m.has(k)) m.set(k, work);
  };
  for (const w of works) {
    put(w.id, w);
    put(`${w.seriesId}-${w.id}`, w);
    if (w.tokenId != null) put(`${w.seriesId}-${w.tokenId}`, w);
    for (const id of w.tokenIds || []) put(`${w.seriesId}-${id}`, w);
    put(`${w.seriesId}::${norm(w.title)}`, w);
    if (w.pieceNumber != null) {
      put(`fragment-${w.pieceNumber}`, w);
      put(`${w.seriesId}::fragment ${w.pieceNumber}`, w);
      put(`${w.seriesId}::fragment ${String(w.pieceNumber).padStart(2, '0')}`, w);
    }
  }
  return m;
}

function workForListing(
  row: MarcheListing,
  index: Map<string, ExploreWork>,
): ExploreWork | undefined {
  const token = String(row.tokenId || '').trim();
  const title = norm(row.title);
  const fragment = title.match(/^fragment\s*0*(\d+)\b/);
  return (
    index.get(row.id) ||
    index.get(`${row.seriesId}-${token}`) ||
    index.get(`${row.seriesId}::${title}`) ||
    (fragment ? index.get(`fragment-${Number(fragment[1])}`) : undefined) ||
    matchEmberWork(row.title, token) ||
    matchWillItWork(row.title, token) ||
    undefined
  );
}

function workHref(work?: ExploreWork): string {
  if (!work) return '';
  if (work.openSeaUrl) return work.openSeaUrl;
  const col = NIKX_CONTRACTS.find((c) => c.seriesId === work.seriesId);
  const token = work.tokenId ?? work.tokenIds?.[0];
  if (!col || token == null) return '';
  const chain = col.chain === 'base' ? 'base' : 'ethereum';
  return `https://opensea.io/item/${chain}/${col.address}/${token}`;
}

function workIsListed(work: ExploreWork, keys: Set<string>): boolean {
  if (keys.has(work.id)) return true;
  if (work.tokenId != null && keys.has(`${work.seriesId}-${work.tokenId}`)) return true;
  return (work.tokenIds || []).some((id) => keys.has(`${work.seriesId}-${id}`));
}

/** 1/1s leave Looking when listed. Editions stay — other copies can still take an offer. */
function isUniqueWork(work: ExploreWork): boolean {
  if (work.kind === 'fragment') return false;
  if (work.tags?.includes('embers') || work.tags?.includes('1/1')) return true;
  if (work.seriesId === 'one-of-ones') return true;
  const col = NIKX_CONTRACTS.find((c) => c.seriesId === work.seriesId);
  if (col?.standard === 'erc1155') return false;
  if (work.editionCount != null && work.editionCount > 1) return false;
  return true;
}

function hideFromLooking(work: ExploreWork, keys: Set<string>): boolean {
  if (!isUniqueWork(work)) return false;
  return workIsListed(work, keys);
}

function marcheStill(work?: ExploreWork): string {
  if (!work) return '';
  return (
    catalogueThumbUrl(work.coverUrl, 720) ||
    work.coverUrl ||
    catalogueThumbUrl(work.originCoverUrl, 720) ||
    work.originCoverUrl ||
    ''
  );
}

function editionLine(work?: ExploreWork): string | null {
  if (!work) return null;
  if (work.seriesId === 'one-of-ones' || work.tags?.includes('1/1') || work.tags?.includes('embers')) {
    return '1 of 1';
  }
  if (work.kind === 'fragment') return 'Edition';
  const col = NIKX_CONTRACTS.find((c) => c.seriesId === work.seriesId);
  if (col?.standard === 'erc1155' || work.seriesId === 'for-you' || work.seriesId === 'for-her') {
    return 'Edition';
  }
  if (work.editionCount != null && work.editionCount > 1) return 'Edition';
  return '1 of 1';
}

function listingsForWork(work: ExploreWork | undefined, rows: MarcheListing[]): MarcheListing[] {
  if (!work) return [];
  return rows.filter((r) => {
    if (r.seriesId !== work.seriesId) return false;
    if (r.id === work.id) return true;
    if (work.tokenId != null && r.tokenId === String(work.tokenId)) return true;
    return (work.tokenIds || []).some((id) => r.tokenId === String(id));
  });
}

function listingCountFor(work: ExploreWork | undefined, rows: MarcheListing[]): number {
  return listingsForWork(work, rows).length;
}

function floorListing(work: ExploreWork | undefined, rows: MarcheListing[]): MarcheListing | undefined {
  const hits = listingsForWork(work, rows);
  if (!hits.length) return undefined;
  return hits.reduce((best, r) => {
    const a = parseFloat(r.price || '');
    const b = parseFloat(best.price || '');
    if (!Number.isFinite(a)) return best;
    if (!Number.isFinite(b)) return r;
    return a < b ? r : best;
  });
}

function MarcheMetaRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="ex-theatre-meta-row">
      <dt>{label}</dt>
      <dd>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function MarcheStageSide({
  work,
  listed,
  listedCount,
  intent,
  onRefresh,
  busy,
}: {
  work?: ExploreWork;
  listed?: MarcheListing;
  listedCount: number;
  intent: 'buy' | 'offer';
  onRefresh: () => void;
  busy: boolean;
}) {
  const series = work ? getSeriesById(work.seriesId) : undefined;
  const col = NIKX_CONTRACTS.find((c) => c.seriesId === (work?.seriesId || listed?.seriesId));
  const contract = work?.contractAddress || col?.address;
  const chain = col?.chain === 'base' ? 'Base' : 'Ethereum';
  const standard = col?.standard === 'erc1155' ? 'ERC-1155' : 'ERC-721';
  const statement =
    work?.blurb?.trim() ||
    series?.description ||
    '';
  const statementShort = statement.length > 160 ? `${statement.slice(0, 158).trimEnd()}…` : statement;
  const [descOpen, setDescOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const [owner, setOwner] = useState<OwnerResult | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  const loadOwner = useCallback(async () => {
    if (!contract || work?.tokenId == null) {
      setOwner(null);
      return;
    }
    setOwnerLoading(true);
    try {
      const result = await fetchTokenOwner({
        contract,
        tokenId: work.tokenId,
        chainId: col?.chain === 'base' ? 8453 : 1,
        standard: col?.standard,
      });
      setOwner(result);
    } catch {
      setOwner(null);
    } finally {
      setOwnerLoading(false);
    }
  }, [contract, work?.tokenId, col?.chain, col?.standard]);

  useEffect(() => {
    setDescOpen(false);
    setChainOpen(false);
    setOwner(null);
  }, [listed?.id, work?.id]);

  const kind = editionLine(work);
  const explorer =
    col?.chain === 'base'
      ? `https://basescan.org/address/${contract}`
      : `https://etherscan.io/address/${contract}`;
  const href = listed?.href || workHref(work);
  const seriesLabel = listed?.seriesLabel || series?.label || work?.collectionLabel || '';

  return (
    <aside className="ex-marche-stage-side">
      <p className="ex-atelier-kicker">{seriesLabel}</p>
      <h2>{work?.title || listed?.title}</h2>
      {work?.subtitle ? <p className="ex-marche-sub">{work.subtitle}</p> : null}
      {kind ? <p className="ex-marche-kind">{kind}</p> : null}
      <p className="ex-marche-price">
        {intent === 'offer' ? 'Not listed' : listed?.price || 'Listed'}
      </p>
      {kind === 'Edition' && listedCount > 1 ? (
        <p className="ex-marche-listed-n">{listedCount} listed</p>
      ) : null}
      {statement ? (
        <div className="ex-theatre-statement">
          <p className="ex-theatre-statement-label">Artist note</p>
          <p className="ex-theatre-statement-body">{descOpen || statement.length <= 160 ? statement : statementShort}</p>
          {statement.length > 160 ? (
            <button
              type="button"
              className="ex-theatre-readmore"
              onClick={() => setDescOpen((v) => !v)}
              aria-expanded={descOpen}
            >
              {descOpen ? 'Show less' : 'Read more'}
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={`ex-theatre-accordion${chainOpen ? ' is-open' : ''}`}
        onClick={() => {
          setChainOpen((v) => !v);
          if (!chainOpen) void loadOwner();
        }}
        aria-expanded={chainOpen}
      >
        Blockchain details
        <span aria-hidden>{chainOpen ? '−' : '+'}</span>
      </button>
      {chainOpen ? (
        <dl className="ex-theatre-meta">
          <MarcheMetaRow label="Collection" value={seriesLabel} />
          {(work?.tokenId != null || listed?.tokenId) && (
            <MarcheMetaRow label="Token ID" value={String(work?.tokenId ?? listed?.tokenId)} />
          )}
          {work?.kind === 'fragment' && work.pieceNumber != null && (
            <MarcheMetaRow label="Fragment" value={String(work.pieceNumber).padStart(2, '0')} />
          )}
          <MarcheMetaRow label="Token standard" value={standard} />
          <MarcheMetaRow label="Chain" value={chain} />
          {contract ? (
            <MarcheMetaRow
              label="Contract"
              value={`${contract.slice(0, 6)}…${contract.slice(-4)}`}
              href={explorer}
            />
          ) : null}
          <MarcheMetaRow
            label="Held by"
            value={ownerLoading ? 'Looking up…' : owner ? owner.label : work?.contractAddress || contract ? '—' : 'Not on-chain'}
            href={owner?.href}
          />
          <MarcheMetaRow label="Media" value={work?.mediaType === 'video' ? 'Video' : 'Image'} />
        </dl>
      ) : null}

      <div className="ex-theatre-resources">
        <p className="ex-theatre-statement-label">Other resources</p>
        <div className="ex-theatre-resource-links">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              View on OpenSea ↗
            </a>
          ) : null}
          {work?.manifoldUrl ? (
            <a href={work.manifoldUrl} target="_blank" rel="noopener noreferrer">
              View on Manifold ↗
            </a>
          ) : null}
        </div>
      </div>

      {href ? (
        <a className="ex-garden-enter" href={href} target="_blank" rel="noopener noreferrer">
          {intent === 'offer' ? 'Make an offer' : 'Acquire'}
        </a>
      ) : null}
      <button type="button" className="ex-atelier-btn" onClick={onRefresh} disabled={busy}>
        {busy ? 'Refreshing…' : 'Refresh'}
      </button>
    </aside>
  );
}

function MarcheCard({
  work,
  title,
  price,
  onPick,
}: {
  work?: ExploreWork;
  title: string;
  price?: string;
  onPick: () => void;
}) {
  const still = marcheStill(work);
  const motion = work?.motionUrl;
  const ember = Boolean(
    work?.tags?.includes('embers') || /flutter into the embers/i.test(title),
  );
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={`ex-marche-card${ember ? ' is-ember' : ''}${motion ? ' has-motion' : ''}${
        armed ? ' is-armed' : ''
      }`}
      onClick={onPick}
      onMouseEnter={() => motion && setArmed(true)}
      onFocus={() => motion && setArmed(true)}
    >
      <span className="ex-marche-media">
        {still ? <img src={still} alt="" loading="lazy" decoding="async" /> : null}
        {motion && armed ? <img className="ex-marche-gif" src={motion} alt="" /> : null}
        {motion ? (
          <span
            className="ex-motion-view"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setArmed((v) => !v);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {armed ? 'Still' : 'View'}
          </span>
        ) : null}
      </span>
      <span className="ex-marche-meta">
        <b>{work?.title || title}</b>
        <i className={price ? undefined : 'is-offer'}>{price || 'Offer'}</i>
      </span>
    </button>
  );
}

export default function MarchePage() {
  const [dark, setDark] = useState(true);
  const [listed, setListed] = useState<MarcheListing[]>([]);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<SeriesId | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [density, setDensity] = useState<Density>('m');
  const [view, setView] = useState<MarcheView>('listed');
  const [picked, setPicked] = useState<PickedWork | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState({ opensea: false, raster: false });
  const works = useMemo(() => catalogWorks(), []);
  const index = useMemo(() => catalogIndex(works), [works]);

  const load = useCallback(async (fresh = false) => {
    setBusy(true);
    setNote('');
    try {
      const res = await fetch(`/api/marche${fresh ? '?fresh=1' : ''}`);
      const data = (await res.json()) as {
        ok?: boolean;
        listings?: MarcheListing[];
        sources?: { opensea?: boolean; raster?: boolean };
        count?: number;
      };
      setListed(data.listings || []);
      setSources({ opensea: Boolean(data.sources?.opensea), raster: Boolean(data.sources?.raster) });
      setNote(
        fresh
          ? `Curation refreshed · ${data.count ?? 0} listings`
          : !data.listings?.length && !data.sources?.raster && !data.sources?.opensea
            ? 'Listing keys are not on this deploy yet — OpenSea/Raster APIs need wiring.'
            : '',
      );
    } catch {
      setNote('Could not read listings.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const listedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of listed) {
      keys.add(r.id);
      keys.add(`${r.seriesId}-${r.tokenId}`);
    }
    return keys;
  }, [listed]);

  const groups = useMemo(() => {
    return SERIES.filter((s) => s.id !== 'market')
      .map((s) => ({
        id: s.id,
        label: s.label,
        rows: listed.filter((r) => r.seriesId === s.id),
      }))
      .filter((g) => g.rows.length && (filter === 'all' || filter === g.id));
  }, [listed, filter]);

  const lookingGroups = useMemo(() => {
    return SERIES.filter((s) => s.id !== 'market')
      .map((s) => ({
        id: s.id,
        label: s.label,
        works: works.filter(
          (w) =>
            w.seriesId === s.id &&
            !hideFromLooking(w, listedKeys) &&
            Boolean(workHref(w)),
        ),
      }))
      .filter((g) => g.works.length && (filter === 'all' || filter === g.id));
  }, [works, listedKeys, filter]);

  const activeGroups = view === 'listed' ? groups : lookingGroups;
  const lookingCount = lookingGroups.reduce((n, g) => n + g.works.length, 0);

  const shelf = useMemo<PickedWork[]>(() => {
    if (view === 'listed') {
      return groups.flatMap((g) =>
        g.rows.map((row) => ({
          work: workForListing(row, index),
          listed: row,
          intent: 'buy' as const,
        })),
      );
    }
    return lookingGroups.flatMap((g) =>
      g.works.map((work) => {
        const row = floorListing(work, listed);
        return {
          work,
          listed: row,
          intent: row ? 'buy' : 'offer',
        };
      }),
    );
  }, [view, groups, lookingGroups, listed, index]);

  const step = useCallback(
    (dir: -1 | 1) => {
      if (!picked || shelf.length < 2) return;
      const i = shelf.findIndex((item) => shelfKey(item) === shelfKey(picked));
      if (i < 0) return;
      setPicked(shelf[(i + dir + shelf.length) % shelf.length]);
    },
    [picked, shelf],
  );

  useEffect(() => {
    if (!picked) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape' || ((e.key === 'x' || e.key === 'X') && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        setPicked(null);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [picked, step]);

  const onStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, video, input')) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };

  const onStagePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    step(dx < 0 ? 1 : -1);
  };

  const floor = (g: (typeof groups)[number]) => {
    const prices = g.rows.map((r) => parseFloat(r.price || '')).filter((n) => Number.isFinite(n));
    if (!prices.length) return null;
    return Math.min(...prices);
  };

  return (
    <div
      className={`ex ex-marche${dark ? '' : ' theme-light'}`}
      style={{ ['--marche-min' as string]: DENSITY[density].min }}
    >
      <Head>
        <title>Marché · Nikxname</title>
        <meta name="robots" content="noindex" />
      </Head>
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
            <a className="ex-nav-link is-active" href="/marche">
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

      <section className="ex-marche-hero">
        <p className="ex-atelier-kicker">{view === 'listed' ? 'Listings' : 'Looking'}</p>
        <h1 className="ex-atelier-title">Marché</h1>
        <p className="ex-atelier-lead">
          {view === 'listed'
            ? 'Live Nikxname listings from OpenSea and Raster. Still until hover — View on a phone. Acquire opens the active sale.'
            : 'The rest of the catalogue. A live ask shows as listed; everything else is an offer to the holder on OpenSea.'}
        </p>
        <div className="ex-atelier-toolbar">
          <span className="ex-marche-tabs" role="tablist" aria-label="Marché view">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'listed'}
              className={`ex-atelier-btn${view === 'listed' ? ' is-on' : ''}`}
              onClick={() => {
                setView('listed');
                setPicked(null);
              }}
            >
              Listed
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'looking'}
              className={`ex-atelier-btn${view === 'looking' ? ' is-on' : ''}`}
              onClick={() => {
                setView('looking');
                setPicked(null);
              }}
            >
              Looking
            </button>
          </span>
          <button type="button" className="ex-atelier-btn" onClick={() => setFilterOpen((v) => !v)}>
            Filter
          </button>
          <button
            type="button"
            className="ex-atelier-btn"
            onClick={() => setOpen(new Set(activeGroups.map((g) => g.id)))}
          >
            View all
          </button>
          <button
            type="button"
            className="ex-atelier-btn is-save"
            disabled={busy}
            onClick={() => void load(true)}
          >
            {busy ? 'Refreshing…' : 'Latest curation'}
          </button>
          <div className="ex-density" role="group" aria-label="Size">
            {(Object.keys(DENSITY) as Density[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`ex-density-btn${density === d ? ' is-active' : ''}`}
                onClick={() => setDensity(d)}
                aria-pressed={density === d}
                aria-label={DENSITY[d].label}
                title={DENSITY[d].label}
              >
                <span className="ex-density-sq" style={{ width: DENSITY[d].icon, height: DENSITY[d].icon }} />
              </button>
            ))}
          </div>
        </div>
        {filterOpen ? (
          <div className="ex-marche-filters">
            <button type="button" className={filter === 'all' ? 'is-on' : undefined} onClick={() => setFilter('all')}>
              All
            </button>
            {SERIES.filter((s) => s.id !== 'market').map((s) => (
              <button
                key={s.id}
                type="button"
                className={filter === s.id ? 'is-on' : undefined}
                onClick={() => setFilter(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}
        <p className="ex-atelier-meta">
          {view === 'listed'
            ? `${listed.length} listings${sources.opensea ? ' · OpenSea' : ''}${sources.raster ? ' · Raster' : ''}`
            : `${lookingCount} works`}
        </p>
        {note ? <p className="ex-atelier-note">{note}</p> : null}
      </section>

      <a className="ex-marche-block" href="/on-the-block">
        <span className="ex-marche-block-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BLOCK_SHARE} alt={`${BLOCK_WORK_TITLE} hung as a triptych`} />
        </span>
        <span className="ex-marche-block-meta">
          <span className="ex-nav-live is-live" aria-hidden="true">
            <span className="ex-nav-live-dot" />
            Auction
          </span>
          <span className="ex-marche-block-copy">
            <em>On The Block</em>
            <strong>{BLOCK_WORK_TITLE}</strong>
            <span>Devil · Pendant · Angel</span>
          </span>
        </span>
      </a>

      {view === 'listed' && groups.length === 0 && !busy ? (
        <p className="ex-atelier-lead" style={{ padding: '0 6vw 48px' }}>
          No live listings returned yet. Latest curation retries OpenSea and Raster.
        </p>
      ) : null}

      {view === 'listed'
        ? groups.map((g) => {
            const expanded = open.has(g.id);
            const from = floor(g);
            return (
              <section key={g.id} className="ex-marche-col">
                <button
                  type="button"
                  className="ex-marche-col-head"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.id)) next.delete(g.id);
                      else next.add(g.id);
                      return next;
                    })
                  }
                >
                  <span aria-hidden>{expanded ? '▾' : '▸'}</span>
                  <h2>{g.label}</h2>
                  {from != null ? <em>from {from} ETH</em> : <em>Listed</em>}
                  <strong>{g.rows.length}</strong>
                </button>
                {expanded ? (
                  <div className="ex-marche-grid">
                    {g.rows.map((row) => {
                      const work = workForListing(row, index);
                      return (
                        <MarcheCard
                          key={row.id}
                          work={work}
                          title={row.title}
                          price={row.price}
                          onPick={() => setPicked({ work, listed: row, intent: 'buy' })}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })
        : lookingGroups.map((g) => {
            const expanded = open.has(g.id);
            const listedHere = g.works.filter((w) => floorListing(w, listed)).length;
            return (
              <section key={g.id} className="ex-marche-col">
                <button
                  type="button"
                  className="ex-marche-col-head"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.id)) next.delete(g.id);
                      else next.add(g.id);
                      return next;
                    })
                  }
                >
                  <span aria-hidden>{expanded ? '▾' : '▸'}</span>
                  <h2>{g.label}</h2>
                  <em>
                    {listedHere
                      ? listedHere === g.works.length
                        ? 'Listed'
                        : 'Listed and offer'
                      : 'Open to an offer'}
                  </em>
                  <strong>{g.works.length}</strong>
                </button>
                {expanded ? (
                  <div className="ex-marche-grid">
                    {g.works.map((work) => {
                      const row = floorListing(work, listed);
                      return (
                        <MarcheCard
                          key={work.id}
                          work={work}
                          title={work.title}
                          price={row?.price}
                          onPick={() =>
                            setPicked({
                              work,
                              listed: row,
                              intent: row ? 'buy' : 'offer',
                            })
                          }
                        />
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}

      <footer className="ex-footer">
        <span className="ex-footer-copy">© {new Date().getFullYear()} Nikxname</span>
        <div className="ex-footer-links">
          <LivePill />
          <a className="ex-footer-who" href="/who">
            Who?
          </a>
          <a href="/garden">Garden</a>
        </div>
      </footer>

      {picked ? (
        <div
          className={`ex-marche-stage${picked.work?.tags?.includes('embers') ? ' is-ember' : ''}`}
          role="dialog"
          aria-modal="true"
          onPointerDown={onStagePointerDown}
          onPointerUp={onStagePointerUp}
          onPointerCancel={() => {
            swipe.current = null;
          }}
        >
          <button type="button" className="ex-look-close" onClick={() => setPicked(null)} aria-label="Close">
            ✕
          </button>
          <div className="ex-marche-stage-art">
            {shelf.length > 1 ? (
              <button
                type="button"
                className="ex-marche-step is-prev"
                aria-label="Previous work"
                onClick={() => step(-1)}
              >
                ‹
              </button>
            ) : null}
            {picked.work?.mediaType === 'video' && picked.work.mediaUrl ? (
              <video
                src={picked.work.mediaUrl}
                poster={picked.work.coverUrl}
                controls
                playsInline
              />
            ) : (
              <img
                src={
                  picked.work
                    ? observeStillUrl(picked.work) || picked.work.coverUrl
                    : picked.listed?.image
                }
                alt={picked.work?.title || picked.listed?.title}
              />
            )}
            {shelf.length > 1 ? (
              <button
                type="button"
                className="ex-marche-step is-next"
                aria-label="Next work"
                onClick={() => step(1)}
              >
                ›
              </button>
            ) : null}
          </div>
          <MarcheStageSide
            work={picked.work}
            listed={picked.listed}
            listedCount={listingCountFor(picked.work, listed)}
            intent={picked.intent}
            busy={busy}
            onRefresh={() => void load(true)}
          />
        </div>
      ) : null}
    </div>
  );
}
