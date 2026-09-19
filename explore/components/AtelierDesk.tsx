import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { ARTIST_MINT_WALLET, isArtistWallet } from '../lib/collectors';
import { listingFamily } from '../lib/listingFamily';
import { editionIdentity } from '../lib/editionIdentity';
import { NIKX_CONTRACTS } from '../lib/contracts';
import { buildListing, nowStart } from '../lib/seaport/build';
import { getCounter, isApprovedForAll } from '../lib/seaport/client';
import { jsonComponents, parseComponents } from '../lib/seaport/codec';
import { OPENSEA_CONDUIT, SEAPORT_1_6 } from '../lib/seaport/constants';
import {
  approveConduitCalldata,
  cancelCalldata,
  ensureChain,
  fulfillCalldata,
  sendTx,
  signOrderComponents,
} from '../lib/seaport/wallet';

type SaleWindow = { workId: string; mode: 'offers'; startTime: number; endTime: number };

type DeskWork = {
  id: string;
  seriesId?: string;
  title: string;
  contract: `0x${string}`;
  tokenId: string;
  chain: 'ethereum' | 'base';
  standard: 'erc721' | 'erc1155';
  quantityStudio: number;
  coverUrl?: string;
  listing: null | {
    orderHash: `0x${string}`;
    priceWei: string;
    priceEth: string;
    startTime: number;
    endTime: number;
  };
  offerCount: number;
  bestOfferWei?: string;
  window?: (SaleWindow & { reserveWei?: string }) | null;
  family?: { id: string; label: string };
};

type Flags = {
  publicBuyEnabled: boolean;
  publicOfferEnabled: boolean;
  note: string;
  updatedAt?: string;
};

type Draft = { price: string; goLive: string; days: string; reserve: string; stagger: string };
type Policy = { familyId: string; maxLive: number };

type Eth = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

type Props = {
  wallet: string;
  signature: string;
  readOnly: boolean;
};

function whenUnix(goLive: string): bigint {
  if (!goLive) return nowStart();
  const t = Math.floor(new Date(goLive).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(t) || t <= now + 45) return nowStart();
  return BigInt(t);
}

function fmtWhen(unix: number) {
  if (!unix) return '';
  return new Date(unix * 1000).toLocaleString();
}

function groupDeskWorks(works: DeskWork[]): (DeskWork & { copies: number })[] {
  const map = new Map<string, DeskWork[]>();
  for (const w of works) {
    const { key } = editionIdentity(w.title, w.seriesId || '');
    const arr = map.get(key) || [];
    arr.push(w);
    map.set(key, arr);
  }
  return [...map.values()].map((members) => {
    const listed = members.find((m) => m.listing) || members[0];
    const { label } = editionIdentity(listed.title, listed.seriesId || '');
    return {
      ...listed,
      title: label,
      copies: members.reduce((n, m) => n + (m.quantityStudio || 1), 0),
    };
  });
}

export function AtelierDesk({ wallet, signature, readOnly }: Props) {
  const [works, setWorks] = useState<DeskWork[]>([]);
  const [flags, setFlags] = useState<Flags | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [collection, setCollection] = useState('all');

  const draftOf = (id: string): Draft =>
    drafts[id] || { price: '', goLive: '', days: '30', reserve: '', stagger: '0' };
  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...draftOf(id), ...patch } }));
  };

  const load = useCallback(async () => {
    const [d, f] = await Promise.all([fetch('/api/market/desk'), fetch('/api/market/flags')]);
    const desk = (await d.json()) as { works?: DeskWork[]; flags?: Flags; policies?: Policy[] };
    const fl = (await f.json()) as { flags?: Flags };
    setWorks(desk.works || []);
    setFlags(fl.flags || desk.flags || null);
    setPolicies(desk.policies || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const collections = useMemo(() => {
    const ids = new Set(works.map((w) => w.seriesId).filter(Boolean) as string[]);
    return NIKX_CONTRACTS.filter((c) => ids.has(c.seriesId));
  }, [works]);
  const visibleWorks = useMemo(() => {
    if (collection === 'all') return works;
    return works.filter((w) => w.seriesId === collection);
  }, [works, collection]);

  const eth = () => (window as unknown as { ethereum?: Eth }).ethereum;

  const list = async (w: DeskWork, override?: Partial<Draft>) => {
    if (readOnly) return;
    const ethereum = eth();
    if (!ethereum) return;
    const d = { ...draftOf(w.id), ...override };
    if (!d.price.trim()) {
      setNote('Set a buy-now price in ETH.');
      return;
    }
    setBusy(w.id);
    setNote('Sign the Seaport listing…');
    try {
      const chainId = w.chain === 'base' ? 8453 : 1;
      await ensureChain(ethereum, chainId);
      const approved = await isApprovedForAll(
        w.chain,
        w.contract,
        ARTIST_MINT_WALLET,
        OPENSEA_CONDUIT,
        w.standard,
      );
      if (!approved) {
        setNote('Approve the conduit for this collection (one time)…');
        await sendTx(ethereum, ARTIST_MINT_WALLET, w.contract, approveConduitCalldata());
      }
      const counter = await getCounter(w.chain, ARTIST_MINT_WALLET);
      const start = whenUnix(d.goLive);
      const days = BigInt(d.days || '30');
      const components = buildListing({
        offerer: ARTIST_MINT_WALLET,
        contract: w.contract,
        tokenId: BigInt(w.tokenId),
        standard: w.standard,
        quantity: 1n,
        priceWei: parseEther(d.price.trim()),
        counter,
        startTime: start,
        endTime: start + days * 24n * 3600n,
      });
      const seaportSig = await signOrderComponents(ethereum, ARTIST_MINT_WALLET, components, chainId);
      const res = await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet,
          signatureAtelier: signature,
          kind: 'listing',
          chain: w.chain,
          parameters: jsonComponents(components),
          signature: seaportSig,
          title: w.title,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || 'list');
      const live = Number(start) * 1000 > Date.now() + 60_000;
      setNote(
        live
          ? `Scheduled ${w.title} at ${d.price} ETH · opens ${fmtWhen(Number(start))}.`
          : `Listed ${w.title} at ${d.price} ETH.`,
      );
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Listing failed.');
    } finally {
      setBusy('');
    }
  };

  const maxLiveFor = (familyId: string) => {
    const pol = policies.find((p) => p.familyId === familyId);
    if (pol) return pol.maxLive;
    return familyId.startsWith('will-it-panel-') ? 1 : 0;
  };

  const setMaxLive = async (familyId: string, maxLive: number) => {
    const res = await fetch('/api/market/window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: wallet,
        signature,
        as: 'policy',
        familyId,
        maxLive,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!data.ok) setNote(data.error || 'Could not save family rule.');
    else await load();
  };

  const listRemaining = async (familyId: string) => {
    const fam = listingFamily(works.find((w) => listingFamily(w.title).id === familyId)?.title || '');
    const d = draftOf(`fam-${familyId}`);
    const members = works.filter((w) => listingFamily(w.title).id === familyId && !w.listing);
    const cap = maxLiveFor(familyId);
    const live = works.filter((w) => listingFamily(w.title).id === familyId && w.listing).length;
    const room = cap > 0 ? Math.max(0, cap - live) : members.length;
    const batch = members.slice(0, Math.max(1, room));
    if (!d.price.trim()) {
      setNote(`Set a buy-now price on ${fam.label} first.`);
      return;
    }
    const stagger = Number(d.stagger || '0');
    const base = d.goLive ? new Date(d.goLive).getTime() : Date.now();
    for (let i = 0; i < batch.length; i++) {
      const goLive =
        stagger > 0
          ? new Date(base + i * stagger * 86400000).toISOString().slice(0, 16)
          : d.goLive;
      setNote(`Listing ${i + 1} of ${batch.length} · ${batch[i].title}`);
      await list(batch[i], { price: d.price, days: d.days, goLive });
    }
  };

  const openOffers = async (w: DeskWork) => {
    if (readOnly) return;
    const d = draftOf(w.id);
    const start = Number(whenUnix(d.goLive));
    const days = Number(d.days || '7');
    setBusy(w.id);
    try {
      const res = await fetch('/api/market/window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet,
          signature,
          workId: w.id,
          startTime: start,
          endTime: start + Math.max(1, days) * 24 * 3600,
          reserveEth: d.reserve || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || 'window');
      setNote(
        `Opened ${w.title} for offers until ${fmtWhen(start + Math.max(1, days) * 24 * 3600)}. This is not an English auction — you accept a WETH offer.`,
      );
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not open offers.');
    } finally {
      setBusy('');
    }
  };

  const closeOffers = async (w: DeskWork) => {
    if (readOnly) return;
    setBusy(w.id);
    try {
      const res = await fetch('/api/market/window', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet, signature, workId: w.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || 'close');
      setNote(`Closed the offer window on ${w.title}.`);
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not close window.');
    } finally {
      setBusy('');
    }
  };

  const cancel = async (w: DeskWork) => {
    if (readOnly || !w.listing) return;
    const ethereum = eth();
    if (!ethereum) return;
    setBusy(w.id);
    setNote('Cancel on-chain…');
    try {
      const detail = await fetch(`/api/market/orders?work=${encodeURIComponent(w.id)}`).then((r) => r.json());
      const parameters = parseComponents(detail.listing.parameters);
      const chainId = w.chain === 'base' ? 8453 : 1;
      await ensureChain(ethereum, chainId);
      const txHash = await sendTx(ethereum, ARTIST_MINT_WALLET, SEAPORT_1_6, cancelCalldata(parameters));
      const ack = await fetch('/api/market/orders?action=cancel-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderHash: w.listing.orderHash,
          address: wallet,
          signatureAtelier: signature,
          txHash,
        }),
      });
      const data = (await ack.json()) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || 'ack');
      setNote(`Cancelled ${w.title}.`);
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Cancel failed.');
    } finally {
      setBusy('');
    }
  };

  const acceptBest = async (w: DeskWork) => {
    if (readOnly) return;
    const ethereum = eth();
    if (!ethereum) return;
    setBusy(w.id);
    setNote('Loading offer…');
    try {
      const q = new URLSearchParams({
        work: w.id,
        full: 'offers',
        address: wallet,
        signature,
      });
      const detail = await fetch(`/api/market/orders?${q}`).then((r) => r.json());
      const best = (detail.offers || []).sort(
        (a: { priceWei: string }, b: { priceWei: string }) =>
          BigInt(b.priceWei) > BigInt(a.priceWei) ? 1 : -1,
      )[0];
      if (!best) throw new Error('No offer');
      const c = parseComponents(best.parameters);
      const chainId = w.chain === 'base' ? 8453 : 1;
      await ensureChain(ethereum, chainId);
      setNote('Accept in wallet (Seaport)…');
      const txHash = await sendTx(
        ethereum,
        ARTIST_MINT_WALLET,
        SEAPORT_1_6,
        fulfillCalldata(c, best.signature),
      );
      await fetch('/api/market/fulfill-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderHash: best.orderHash, txHash }),
      });
      setNote(`Accepted offer on ${w.title}.`);
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Accept failed.');
    } finally {
      setBusy('');
    }
  };

  const saveFlags = async (patch: Partial<Flags>) => {
    if (readOnly || !flags) return;
    const res = await fetch('/api/market/flags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: wallet,
        signature,
        updatedAt: flags.updatedAt || '',
        publicBuyEnabled: patch.publicBuyEnabled ?? flags.publicBuyEnabled,
        publicOfferEnabled: patch.publicOfferEnabled ?? flags.publicOfferEnabled,
        note: flags.note,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; flags?: Flags; error?: string };
    if (data.ok && data.flags) setFlags(data.flags);
    else setNote(data.error || 'Could not save flags.');
  };

  return (
    <div className="ex-desk">
      <p className="ex-desk-lead">
        Your listing portal. Buy now settles on Seaport in ETH. Scheduled releases stay unbuyable until
        the start time. “Open for offers” collects WETH bids until you accept one — not an English
        auction. The public Market URL stays hidden until you are ready; Public Buy still has to be on
        for anyone else to purchase.
      </p>
      {flags ? (
        <div className="ex-desk-flags">
          <label>
            <input
              type="checkbox"
              checked={flags.publicBuyEnabled}
              disabled={readOnly}
              onChange={(e) => void saveFlags({ publicBuyEnabled: e.target.checked })}
            />
            Public Buy
          </label>
          <label>
            <input
              type="checkbox"
              checked={flags.publicOfferEnabled}
              disabled={readOnly}
              onChange={(e) => void saveFlags({ publicOfferEnabled: e.target.checked })}
            />
            Public Offers (all works)
          </label>
          <a className="ex-desk-preview" href="/market" target="_blank" rel="noopener noreferrer">
            Preview desk ↗
          </a>
        </div>
      ) : null}
      {note ? <p className="ex-atelier-note">{note}</p> : null}
      {collections.length > 1 ? (
        <div className="ex-share-filters" role="tablist" aria-label="Collection">
          <button
            type="button"
            className={collection === 'all' ? 'is-on' : undefined}
            onClick={() => setCollection('all')}
          >
            All
          </button>
          {collections.map((c) => (
            <button
              key={c.seriesId}
              type="button"
              className={collection === c.seriesId ? 'is-on' : undefined}
              onClick={() => setCollection(c.seriesId)}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
      {(() => {
        const groups = new Map<string, DeskWork[]>();
        for (const w of visibleWorks) {
          const f = w.family || listingFamily(w.title);
          const arr = groups.get(f.id) || [];
          arr.push(w);
          groups.set(f.id, arr);
        }
        return [...groups.entries()]
          .filter(([, list]) => list.length > 1)
          .map(([id, list]) => {
            const label = list[0].family?.label || listingFamily(list[0].title).label;
            const listed = list.filter((w) => w.listing).length;
            const open = list.filter((w) => !w.listing).length;
            const d = draftOf(`fam-${id}`);
            const cap = maxLiveFor(id);
            return (
              <section key={id} className="ex-desk-family">
                <h3>{label}</h3>
                <p>
                  {list.length} in studio · {listed} listed · {open} remaining
                  {cap === 1
                    ? ' · one live at a time (a wallet cannot buy the whole set in one sitting)'
                    : ''}
                </p>
                <div className="ex-desk-form">
                  <label>
                    Shared buy now (ETH)
                    <input
                      inputMode="decimal"
                      placeholder="0.008"
                      value={d.price}
                      disabled={readOnly}
                      onChange={(e) => setDraft(`fam-${id}`, { price: e.target.value })}
                    />
                  </label>
                  <label>
                    First go live
                    <input
                      type="datetime-local"
                      value={d.goLive}
                      disabled={readOnly}
                      onChange={(e) => setDraft(`fam-${id}`, { goLive: e.target.value })}
                    />
                  </label>
                  <label>
                    Duration
                    <select
                      value={d.days}
                      disabled={readOnly}
                      onChange={(e) => setDraft(`fam-${id}`, { days: e.target.value })}
                    >
                      <option value="3">3 days</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </label>
                  <label>
                    Stagger (days)
                    <input
                      inputMode="numeric"
                      value={d.stagger}
                      disabled={readOnly || cap === 1}
                      onChange={(e) => setDraft(`fam-${id}`, { stagger: e.target.value })}
                    />
                  </label>
                  <label>
                    One live at a time
                    <select
                      value={String(cap)}
                      disabled={readOnly}
                      onChange={(e) => void setMaxLive(id, Number(e.target.value))}
                    >
                      <option value="1">Yes — list next after a sale</option>
                      <option value="0">No — allow listing the set at once</option>
                    </select>
                  </label>
                  <div className="ex-desk-actions">
                    <button
                      type="button"
                      disabled={readOnly || !open}
                      onClick={() => void listRemaining(id)}
                    >
                      {cap === 1 ? 'List next remaining' : 'List remaining'}
                    </button>
                  </div>
                </div>
                <p className="ex-desk-hint">
                  On-chain, each Panel is its own token. The real sweep protection is only listing one
                  at a time. A hard “max 1 per wallet across the set” needs a Seaport zone contract —
                  we can add that after this desk is proven.
                </p>
              </section>
            );
          });
      })()}
      <div className="ex-desk-list">
        {groupDeskWorks(visibleWorks).map((w) => {
          const d = draftOf(w.id);
          const now = Math.floor(Date.now() / 1000);
          const scheduled = Boolean(w.listing && w.listing.startTime > now + 30);
          const offersOpen = Boolean(
            w.window && now >= w.window.startTime && now <= w.window.endTime,
          );
          return (
            <article key={w.id} className="ex-desk-card">
              <header className="ex-desk-card-head">
                {w.coverUrl ? <img src={w.coverUrl} alt="" /> : <span className="ex-desk-ph" />}
                <div>
                  <h3>
                    {w.title}
                    {w.copies > 1 ? ` · ×${w.copies}` : ''}
                  </h3>
                  <p>
                    {w.chain} · {w.standard}
                    {w.listing
                      ? scheduled
                        ? ` · buy now ${w.listing.priceEth} ETH · opens ${fmtWhen(w.listing.startTime)}`
                        : ` · buy now ${w.listing.priceEth} ETH · until ${fmtWhen(w.listing.endTime)}`
                      : ' · not listed'}
                    {offersOpen ? ` · offers until ${fmtWhen(w.window!.endTime)}` : ''}
                    {w.offerCount ? ` · ${w.offerCount} offer${w.offerCount === 1 ? '' : 's'}` : ''}
                    {w.bestOfferWei ? ` · best ${formatEther(BigInt(w.bestOfferWei))} WETH` : ''}
                  </p>
                </div>
              </header>
              {w.listing ? (
                <div className="ex-desk-actions">
                  <button type="button" disabled={readOnly || busy === w.id} onClick={() => void cancel(w)}>
                    {busy === w.id ? '…' : 'Cancel listing'}
                  </button>
                  {w.offerCount ? (
                    <button
                      type="button"
                      disabled={readOnly || busy === w.id}
                      onClick={() => void acceptBest(w)}
                    >
                      Accept best offer
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="ex-desk-form">
                  <label>
                    Buy now (ETH)
                    <input
                      inputMode="decimal"
                      placeholder="0.008"
                      value={d.price}
                      disabled={readOnly}
                      onChange={(e) => setDraft(w.id, { price: e.target.value })}
                    />
                  </label>
                  <label>
                    Go live
                    <input
                      type="datetime-local"
                      value={d.goLive}
                      disabled={readOnly}
                      onChange={(e) => setDraft(w.id, { goLive: e.target.value })}
                    />
                  </label>
                  <label>
                    Auction reserve (ETH)
                    <input
                      inputMode="decimal"
                      placeholder="optional"
                      value={d.reserve}
                      disabled={readOnly}
                      onChange={(e) => setDraft(w.id, { reserve: e.target.value })}
                    />
                  </label>
                  <label>
                    Duration
                    <select
                      value={d.days}
                      disabled={readOnly}
                      onChange={(e) => setDraft(w.id, { days: e.target.value })}
                    >
                      <option value="3">3 days</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </label>
                  <div className="ex-desk-actions">
                    <button type="button" disabled={readOnly || busy === w.id} onClick={() => void list(w)}>
                      {busy === w.id ? '…' : d.goLive ? 'Schedule buy now' : 'List buy now'}
                    </button>
                    <button
                      type="button"
                      disabled={readOnly || busy === w.id}
                      onClick={() => void openOffers(w)}
                    >
                      Start timed auction
                    </button>
                    {w.window ? (
                      <button
                        type="button"
                        disabled={readOnly || busy === w.id}
                        onClick={() => void closeOffers(w)}
                      >
                        Close offers
                      </button>
                    ) : null}
                    {w.offerCount ? (
                      <button
                        type="button"
                        disabled={readOnly || busy === w.id}
                        onClick={() => void acceptBest(w)}
                      >
                        Accept best offer
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!isArtistWallet(wallet) ? <p className="ex-atelier-note">Desk writes are artist-wallet only.</p> : null}
    </div>
  );
}
