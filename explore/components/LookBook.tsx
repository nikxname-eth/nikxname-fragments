import { useEffect, useMemo, useState } from 'react';
import type { ExploreWork } from '../config/catalog';
import { SERIES, rasterMarketUrl } from '../config/catalog';
import { ARTIST_MINT_WALLET } from '../lib/collectors';
import { catalogueThumbUrl } from '../lib/mediaUrl';

type Props = {
  open: boolean;
  catalogue: ExploreWork[];
  ownedIds: Set<string>;
  onToggle: () => void;
  onHang?: (work: ExploreWork) => void;
  onObserve?: (work: ExploreWork) => void;
};

type Stock = 'mine' | 'unsold' | 'listed' | 'offer';

const STOCK_LABEL: Record<Stock, string> = {
  mine: 'Yours',
  unsold: 'Unsold',
  listed: 'Listed',
  offer: 'Open to offers',
};

function workKeys(work: ExploreWork): string[] {
  const keys = [work.id];
  if (work.tokenId != null) keys.push(`${work.seriesId}-${work.tokenId}`);
  return keys;
}

function hasKey(set: Set<string>, work: ExploreWork) {
  return workKeys(work).some((k) => set.has(k));
}

function marketHref(work: ExploreWork, listedHref?: string) {
  if (listedHref) return listedHref;
  if (work.openSeaUrl) return work.openSeaUrl;
  if (work.contractAddress && work.tokenId != null) {
    const chain = work.seriesId === 'for-her' ? 'base' : 'ethereum';
    return `https://opensea.io/item/${chain}/${work.contractAddress}/${work.tokenId}`;
  }
  return work.rasterUrl || rasterMarketUrl(work.seriesId);
}

export function LookBook({ open, catalogue, ownedIds, onToggle, onHang, onObserve }: Props) {
  const [studioIds, setStudioIds] = useState<Set<string>>(new Set());
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [listedHref, setListedHref] = useState<Record<string, string>>({});
  const [nativeBuy, setNativeBuy] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const applyStudio = (beds: { seriesId: string; tokens: { tokenId: string }[] }[]) => {
      const ids = new Set<string>();
      for (const bed of beds || []) {
        for (const t of bed.tokens || []) ids.add(`${bed.seriesId}-${t.tokenId}`);
      }
      setStudioIds(ids);
    };
    fetch('/api/lookbook')
      .then((r) => r.json())
      .then(
        (d: {
          studio?: string[];
          listed?: { id: string; href: string }[];
        }) => {
          if (!alive) return;
          if (d.studio?.length) setStudioIds(new Set(d.studio));
          const hrefs: Record<string, string> = {};
          const ids = new Set<string>();
          for (const row of d.listed || []) {
            if (!row?.id) continue;
            ids.add(row.id);
            if (row.href) hrefs[row.id] = row.href;
          }
          setListedIds(ids);
          setListedHref(hrefs);
        },
      )
      .catch(() => {});
    fetch(`/api/garden?wallet=${ARTIST_MINT_WALLET}`)
      .then((r) => r.json())
      .then((d: { beds?: { seriesId: string; tokens: { tokenId: string }[] }[] }) => {
        if (alive && d.beds?.length) applyStudio(d.beds);
      })
      .catch(() => {});
    fetch('/api/market/desk')
      .then((r) => r.json())
      .then((d: { flags?: { publicBuyEnabled?: boolean }; works?: { id: string; listing?: { orderHash?: string } | null }[] }) => {
        if (!alive || !d.flags?.publicBuyEnabled) return;
        const ids = new Set<string>();
        for (const w of d.works || []) {
          if (w.listing?.orderHash) ids.add(w.id);
        }
        setNativeBuy(ids);
      })
      .catch(() => {});
    fetch('/api/will-it')
      .then((r) => r.json())
      .then((d: { panels?: Record<string, { tokenId: number; status?: string; href?: string }> }) => {
        if (!alive) return;
        setListedIds((prev) => {
          const next = new Set(prev);
          const hrefs: Record<string, string> = {};
          for (const p of Object.values(d.panels || {})) {
            if (p.status !== 'available' || p.tokenId == null) continue;
            const id = `a-familiar-burn-${p.tokenId}`;
            next.add(id);
            if (p.href) hrefs[id] = p.href;
          }
          if (Object.keys(hrefs).length) {
            setListedHref((cur) => ({ ...hrefs, ...cur }));
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const groups = useMemo(() => {
    return SERIES.filter((s) => s.id !== 'market')
      .map((s) => ({
        id: s.id,
        label: s.label,
        works: catalogue.filter((w) => w.seriesId === s.id),
      }))
      .filter((g) => g.works.length);
  }, [catalogue]);

  const stock = (work: ExploreWork): Stock => {
    if (hasKey(ownedIds, work)) return 'mine';
    if (hasKey(listedIds, work)) return 'listed';
    if (hasKey(studioIds, work)) return 'unsold';
    return 'offer';
  };

  const listingHref = (work: ExploreWork) => {
    for (const k of workKeys(work)) {
      if (listedHref[k]) return listedHref[k];
    }
    return undefined;
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="ex-lookbook-veil"
          aria-label="Close catalogue"
          onClick={onToggle}
        />
      ) : null}
      <button
        type="button"
        className={`ex-lookbook-tab${open ? ' is-open' : ''}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? 'Close catalogue' : 'Open Nikxname catalogue'}
      >
        {open ? '‹' : '›'}
      </button>
      <aside className={`ex-lookbook${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <header className="ex-lookbook-head">
          <p>Looking</p>
          <span>Hang · offer · observe</span>
        </header>
        <div className="ex-lookbook-scroll">
          {groups.map((g) => {
            const embers = g.works.filter((w) => w.tags?.includes('embers'));
            const will = g.works.filter((w) => /will\s*it/i.test(w.title));
            const emberIds = new Set(embers.map((w) => w.id));
            const willIds = new Set(will.map((w) => w.id));
            const rest = g.works.filter((w) => !emberIds.has(w.id) && !willIds.has(w.id));
            const blocks =
              g.id === 'a-familiar-burn'
                ? [
                    { label: null as string | null, works: rest },
                    { label: 'Flutter Into The Embers', works: embers },
                    { label: 'Will It..', works: will },
                  ].filter((b) => b.works.length)
                : [{ label: null as string | null, works: g.works }];
            return (
            <section key={g.id}>
              <h3>{g.label}</h3>
              {blocks.map((b) => (
                <div key={b.label || 'main'}>
                  {b.label ? <h4 className="ex-lookbook-sub">{b.label}</h4> : null}
                  <ul>
                    {b.works.map((w) => {
                  const st = stock(w);
                  const thumb = catalogueThumbUrl(w.coverUrl, 160) || w.coverUrl;
                  const href = marketHref(w, listingHref(w));
                  const copies = w.editionCount && w.editionCount > 1 ? ` · ×${w.editionCount}` : '';
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        className="ex-lookbook-item"
                        onClick={() => (onHang ? onHang(w) : onObserve?.(w))}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb} alt="" loading="lazy" decoding="async" />
                        <span className="ex-lookbook-name">{w.title}{copies}</span>
                        <i className={`ex-lookbook-dot is-${st}`} title={STOCK_LABEL[st]} />
                      </button>
                      <span className="ex-lookbook-acts">
                        {onHang ? (
                          <button type="button" onClick={() => onHang(w)}>
                            Hang
                          </button>
                        ) : null}
                        {onObserve ? (
                          <button type="button" onClick={() => onObserve(w)}>
                            Look
                          </button>
                        ) : null}
                        {nativeBuy.has(w.id) ? (
                          <a href={`/market#${w.id}`}>Buy</a>
                        ) : href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {st === 'listed' ? 'Buy' : 'Offer'}
                          </a>
                        ) : null}
                        {w.openSeaUrl && nativeBuy.has(w.id) ? (
                          <a href={`/market#${w.id}`}>Offer</a>
                        ) : null}
                      </span>
                    </li>
                  );
                    })}
                  </ul>
                </div>
              ))}
            </section>
            );
          })}
        </div>
        <p className="ex-lookbook-legend">
          <i className="ex-lookbook-dot is-mine" /> Yours
          <i className="ex-lookbook-dot is-unsold" /> Unsold
          <i className="ex-lookbook-dot is-listed" /> Listed
          <i className="ex-lookbook-dot is-offer" /> Offers
        </p>
      </aside>
    </>
  );
}
