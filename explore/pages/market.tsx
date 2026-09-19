import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { formatEther, parseEther } from 'viem';
import { LivePill } from '../components/LivePill';
import { NIKX_CONTRACTS } from '../lib/contracts';
import { editionIdentity } from '../lib/editionIdentity';
import { buildOffer, nowStart } from '../lib/seaport/build';
import {
  getCounter,
  getOrderStatus,
  ownerOf721,
  wethAllowance,
  wethBalance,
} from '../lib/seaport/client';
import { jsonComponents, parseComponents } from '../lib/seaport/codec';
import { OPENSEA_CONDUIT, SEAPORT_1_6, WETH } from '../lib/seaport/constants';
import { listingPriceWei } from '../lib/seaport/validate';
import {
  ensureChain,
  fulfillCalldata,
  sendTx,
  signOrderComponents,
  wethApproveCalldata,
  wethDepositCalldata,
} from '../lib/seaport/wallet';
import { ARTIST_MINT_WALLET } from '../lib/collectors';

type DeskWork = {
  id: string;
  seriesId?: string;
  title: string;
  contract: `0x${string}`;
  tokenId: string;
  chain: 'ethereum' | 'base';
  standard: 'erc721' | 'erc1155';
  quantityStudio?: number;
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
  window?: { startTime: number; endTime: number; reserveWei?: string } | null;
  copies?: number;
};

type SaleFilter = 'all' | 'listed' | 'unlisted' | 'buy-now' | 'auction';

const SALE_FILTERS: { id: SaleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'listed', label: 'Listed' },
  { id: 'unlisted', label: 'Unlisted' },
  { id: 'buy-now', label: 'Buy now' },
  { id: 'auction', label: 'Auction' },
];

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function isLiveListing(w: DeskWork, now = nowSec()) {
  return Boolean(w.listing && w.listing.startTime <= now && w.listing.endTime >= now);
}

function isScheduled(w: DeskWork, now = nowSec()) {
  return Boolean(w.listing && w.listing.startTime > now);
}

function isListed(w: DeskWork, now = nowSec()) {
  return isLiveListing(w, now) || isScheduled(w, now);
}

function isAuction(w: DeskWork, now = nowSec()) {
  return Boolean(w.window && now >= w.window.startTime && now <= w.window.endTime);
}

function collapseMarketWorks(works: DeskWork[]): DeskWork[] {
  const now = nowSec();
  const map = new Map<string, DeskWork>();
  for (const w of works) {
    const { key, label } = editionIdentity(w.title, w.seriesId || '');
    const copies = w.quantityStudio && w.quantityStudio > 1 ? w.quantityStudio : 1;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...w, title: label, copies });
      continue;
    }
    existing.copies = (existing.copies || 1) + copies;
    existing.offerCount += w.offerCount;
    if (
      w.bestOfferWei &&
      (!existing.bestOfferWei || BigInt(w.bestOfferWei) > BigInt(existing.bestOfferWei))
    ) {
      existing.bestOfferWei = w.bestOfferWei;
    }
    if (!existing.window && w.window) existing.window = w.window;
    if (isLiveListing(w, now) && !isLiveListing(existing, now)) {
      existing.id = w.id;
      existing.tokenId = w.tokenId;
      existing.listing = w.listing;
      existing.coverUrl = w.coverUrl || existing.coverUrl;
      existing.contract = w.contract;
    }
  }
  return [...map.values()];
}

type Flags = { publicBuyEnabled: boolean; publicOfferEnabled: boolean; note: string };

type Eth = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export default function MarketPage() {
  const [dark, setDark] = useState(true);
  const [works, setWorks] = useState<DeskWork[]>([]);
  const [flags, setFlags] = useState<Flags | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [offerAmt, setOfferAmt] = useState<Record<string, string>>({});
  const [saleFilter, setSaleFilter] = useState<SaleFilter>('all');
  const [collectionFilter, setCollectionFilter] = useState('all');

  const load = useCallback(async () => {
    const res = await fetch('/api/market/desk');
    const data = (await res.json()) as { ok?: boolean; works?: DeskWork[]; flags?: Flags };
    setWorks(data.works || []);
    setFlags(data.flags || null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const collapsed = useMemo(() => collapseMarketWorks(works), [works]);
  const collections = useMemo(() => {
    const ids = new Set(collapsed.map((w) => w.seriesId).filter(Boolean) as string[]);
    return NIKX_CONTRACTS.filter((c) => ids.has(c.seriesId));
  }, [collapsed]);
  const visible = useMemo(() => {
    const now = nowSec();
    return collapsed.filter((w) => {
      if (collectionFilter !== 'all' && w.seriesId !== collectionFilter) return false;
      if (saleFilter === 'listed') return isListed(w, now);
      if (saleFilter === 'unlisted') return !isListed(w, now);
      if (saleFilter === 'buy-now') return isLiveListing(w, now);
      if (saleFilter === 'auction') return isAuction(w, now);
      return true;
    });
  }, [collapsed, saleFilter, collectionFilter]);
  const grouped = useMemo(() => {
    const now = nowSec();
    const listed = visible.filter((w) => isListed(w, now));
    const auction = visible.filter((w) => isAuction(w, now) && !isListed(w, now));
    const unlisted = visible.filter((w) => !isListed(w, now) && !isAuction(w, now));
    return [
      { id: 'listed' as const, label: 'Listed', works: listed },
      { id: 'auction' as const, label: 'Auction', works: auction },
      { id: 'unlisted' as const, label: 'Unlisted', works: unlisted },
    ].filter((g) => g.works.length);
  }, [visible]);

  const connect = async () => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) {
      setNote('Open this page in a wallet browser.');
      return;
    }
    const accs = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
    setWallet(accs?.[0]?.toLowerCase() || null);
  };

  const buy = async (w: DeskWork) => {
    if (!w.listing || !flags?.publicBuyEnabled) return;
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) return;
    if (!wallet) {
      await connect();
      return;
    }
    setBusy(w.id);
    setNote('Checking the listing on-chain…');
    try {
      const chainId = w.chain === 'base' ? 8453 : 1;
      await ensureChain(eth, chainId);
      const detail = await fetch(`/api/market/orders?work=${encodeURIComponent(w.id)}`).then((r) => r.json());
      const c = parseComponents(detail.listing.parameters);
      const status = await getOrderStatus(w.chain, w.listing.orderHash);
      const counter = await getCounter(w.chain, c.offerer);
      if (status.isCancelled || status.totalFilled > 0n || counter !== c.counter) {
        throw new Error('This listing is no longer open.');
      }
      const now = Math.floor(Date.now() / 1000);
      if (Number(c.startTime) > now) throw new Error('This release has not opened yet.');
      if (Number(c.endTime) < now) throw new Error('This listing has ended.');
      if (w.standard === 'erc721') {
        const owner = await ownerOf721(w.chain, w.contract, BigInt(w.tokenId));
        if (owner.toLowerCase() !== ARTIST_MINT_WALLET) throw new Error('No longer in the studio.');
      }
      const value = listingPriceWei(c);
      setNote('Confirm in your wallet…');
      const txHash = await sendTx(
        eth,
        wallet as `0x${string}`,
        SEAPORT_1_6,
        fulfillCalldata(c, detail.listing.signature),
        value,
      );
      await fetch('/api/market/fulfill-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderHash: w.listing.orderHash, txHash }),
      });
      setNote(`Purchased ${w.title}.`);
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setBusy('');
    }
  };

  const offer = async (w: DeskWork) => {
    const now = Math.floor(Date.now() / 1000);
    const windowOpen = Boolean(w.window && now >= w.window.startTime && now <= w.window.endTime);
    if (!flags?.publicOfferEnabled && !windowOpen) return;
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth || !wallet) {
      await connect();
      return;
    }
    const amt = offerAmt[w.id]?.trim();
    if (!amt) {
      setNote('Set an offer in ETH.');
      return;
    }
    setBusy(w.id);
    try {
      const chainId = w.chain === 'base' ? 8453 : 1;
      await ensureChain(eth, chainId);
      const priceWei = parseEther(amt);
      const weth = WETH[w.chain];
      const from = wallet as `0x${string}`;
      const bal = await wethBalance(w.chain, weth, from);
      if (bal < priceWei) {
        setNote('Wrap ETH to WETH…');
        await sendTx(eth, from, weth, wethDepositCalldata(), priceWei - bal);
      }
      const deskOffers = await fetch(`/api/market/orders?work=${encodeURIComponent(w.id)}`).then((r) => r.json());
      let others = 0n;
      for (const o of deskOffers.offers || []) {
        if (String(o.offererShort || '').toLowerCase().startsWith(wallet.slice(0, 6))) continue;
      }
      const needed = priceWei + others;
      const allow = await wethAllowance(w.chain, weth, from, OPENSEA_CONDUIT);
      if (allow !== needed) {
        setNote('Approve WETH for this offer…');
        if (allow !== 0n) await sendTx(eth, from, weth, wethApproveCalldata(0n));
        await sendTx(eth, from, weth, wethApproveCalldata(needed));
      }
      const counter = await getCounter(w.chain, from);
      const start = nowStart();
      const components = buildOffer({
        offerer: from,
        contract: w.contract,
        tokenId: BigInt(w.tokenId),
        standard: w.standard,
        quantity: 1n,
        priceWei,
        weth,
        counter,
        startTime: start,
        endTime: start + 7n * 24n * 3600n,
      });
      setNote('Sign the Seaport offer…');
      const seaportSig = await signOrderComponents(eth, from, components, chainId);
      const res = await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: from,
          kind: 'offer',
          chain: w.chain,
          parameters: jsonComponents(components),
          signature: seaportSig,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || 'offer');
      setNote(`Offer of ${amt} WETH posted for ${w.title}. Cancel does not revoke WETH approval.`);
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Offer failed.');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <Head>
        <title>Market · Nikxname</title>
        <meta
          name="description"
          content="Buy and offer on unsold Nikxname works. Settles on-chain through Seaport. This site does not hold the work or your ETH."
        />
      </Head>
      <div className={`ex${dark ? '' : ' theme-light'}`}>
        <header className="ex-nav">
          <div className="ex-nav-left">
            <a className="ex-mark" href="https://nikxart.xyz">
              Nikxname
            </a>
            <a className="ex-nav-link" href="/">
              Explore
            </a>
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
            <a className="ex-nav-garden" href="/garden">
              Garden
            </a>
          </div>
        </header>

        <section className="ex-series-intro ex-collection-hero">
          <p className="ex-series-label">Studio desk</p>
          <h1 className="ex-series-title">Market</h1>
          <p className="ex-series-desc">
            The sale settles on-chain through Seaport. This site does not hold the work or your ETH.
            You pay network gas. There is no OpenSea fee on this desk.
          </p>
          <p className="ex-series-desc">
            Turning off Public Buy hides the button on this site. A listing already signed still
            settles on-chain until the artist Cancels it.
          </p>
        </section>

        <div className="ex-grid-wrap">
          {!wallet ? (
            <button type="button" className="ex-garden-enter" onClick={() => void connect()}>
              Connect wallet
            </button>
          ) : (
            <p className="ex-atelier-note">{wallet.slice(0, 6)}…{wallet.slice(-4)}</p>
          )}
          {note ? <p className="ex-atelier-note">{note}</p> : null}
          <div className="ex-market-filters" role="tablist" aria-label="Sale status">
            {SALE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={saleFilter === f.id}
                className={saleFilter === f.id ? 'is-on' : undefined}
                onClick={() => setSaleFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {collections.length > 1 ? (
            <div className="ex-market-filters ex-market-filters--collections" aria-label="Collection">
              <button
                type="button"
                className={collectionFilter === 'all' ? 'is-on' : undefined}
                onClick={() => setCollectionFilter('all')}
              >
                All collections
              </button>
              {collections.map((c) => (
                <button
                  key={c.seriesId}
                  type="button"
                  className={collectionFilter === c.seriesId ? 'is-on' : undefined}
                  onClick={() => setCollectionFilter(c.seriesId)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : null}

          {grouped.map((g) => (
            <section key={g.id} className="ex-market-section">
              <h2>
                <button
                  type="button"
                  className={saleFilter === g.id ? 'is-on' : undefined}
                  onClick={() => setSaleFilter(saleFilter === g.id ? 'all' : g.id)}
                >
                  {g.label}
                  <span>{g.works.length}</span>
                </button>
              </h2>
              <div className="ex-desk-list">
                {g.works.map((w) => {
                  const now = nowSec();
                  const live = isLiveListing(w, now);
                  const soon = isScheduled(w, now);
                  const offersOpen = Boolean(flags?.publicOfferEnabled || isAuction(w, now));
                  const copies = w.copies && w.copies > 1 ? ` · ×${w.copies}` : '';
                  return (
                    <article key={w.id} className="ex-desk-row" id={w.id}>
                      {w.coverUrl ? <img src={w.coverUrl} alt="" /> : <span className="ex-desk-ph" />}
                      <div>
                        <h3>
                          {w.title}
                          {copies}
                        </h3>
                        <p>
                          {live
                            ? `Buy now ${w.listing!.priceEth} ETH`
                            : soon
                              ? `Opens ${new Date(w.listing!.startTime * 1000).toLocaleString()} · ${w.listing!.priceEth} ETH`
                              : w.window
                                ? `Offers until ${new Date(w.window.endTime * 1000).toLocaleString()}`
                                : 'Not listed'}
                          {w.offerCount ? ` · ${w.offerCount} offer${w.offerCount === 1 ? '' : 's'}` : ''}
                          {w.bestOfferWei ? ` · best ${formatEther(BigInt(w.bestOfferWei))} WETH` : ''}
                          {w.window?.reserveWei
                            ? ` · reserve ${formatEther(BigInt(w.window.reserveWei))} ETH`
                            : ''}
                        </p>
                      </div>
                      <span className="ex-desk-price">
                        {live && flags?.publicBuyEnabled ? (
                          <button type="button" disabled={busy === w.id} onClick={() => void buy(w)}>
                            {busy === w.id ? '…' : 'Buy now'}
                          </button>
                        ) : null}
                        {offersOpen ? (
                          <>
                            <input
                              inputMode="decimal"
                              placeholder="Offer ETH"
                              value={offerAmt[w.id] || ''}
                              onChange={(e) => setOfferAmt((p) => ({ ...p, [w.id]: e.target.value }))}
                            />
                            <button type="button" disabled={busy === w.id} onClick={() => void offer(w)}>
                              {busy === w.id ? '…' : 'Make offer'}
                            </button>
                          </>
                        ) : null}
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          {!visible.length ? <p className="ex-atelier-note">Nothing in this view.</p> : null}
          {!flags?.publicBuyEnabled ? (
            <p className="ex-atelier-note">Public Buy is off. Listings can still be posted in Atelier.</p>
          ) : null}
        </div>
        <footer className="ex-footer">
          <LivePill />
        </footer>
      </div>
    </>
  );
}
