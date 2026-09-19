import { decodeEventLog, formatEther, verifyMessage } from 'viem';
import { ARTIST_MINT_WALLET } from '../../../lib/collectors';
import { findNikxContract } from '../../../lib/contracts';
import { listingFamily } from '../../../lib/listingFamily';
import { verifyArtistSig } from '../../../lib/atelierAuth';
import { hashOrderComponents, recoverOrderOfferer } from '../../../lib/seaport/hash';
import { jsonComponents, parseComponents } from '../../../lib/seaport/codec';
import {
  assertListing,
  assertOffer,
  listingPriceWei,
  nftFromListing,
  nftFromOffer,
  offerPriceWei,
} from '../../../lib/seaport/validate';
import { CANCEL_ACK_PREFIX, SEAPORT_1_6 } from '../../../lib/seaport/constants';
import {
  balanceOf1155,
  chainIdOf,
  getCounter,
  getOrderStatus,
  ownerOf721,
  publicClientFor,
} from '../../../lib/seaport/client';
import { seaportAbi } from '../../../lib/seaport/abi';
import {
  bustCaches,
  casIndex,
  dropRef,
  readFlags,
  readIndex,
  readOrder,
  writeOrder,
  type Kv,
} from '../../../lib/marketKv';
import type { StoredOrder } from '../../../lib/marketTypes';
import type { OrderComponents } from '../../../lib/seaport/types';

type Env = { GARDEN_EGG?: Kv };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Atelier-Address, X-Atelier-Signature',
  'Cache-Control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);
  const url = new URL(context.request.url);
  const workId = url.searchParams.get('work') || '';
  const full = url.searchParams.get('full') === 'offers';
  const index = await readIndex(kv);
  const listingRef = index.listings.find((r) => r.workId === workId);
  const offerRefs = index.offers.filter((r) => r.workId === workId);
  let listing = null;
  if (listingRef) {
    const o = await readOrder(kv, listingRef.orderHash);
    if (o?.status === 'active') {
      listing = {
        orderHash: o.orderHash,
        priceWei: o.priceWei,
        priceEth: formatEther(BigInt(o.priceWei)),
        parameters: o.parameters,
        signature: o.signature,
        chain: o.chain,
      };
    }
  }
  let artist = false;
  if (full) {
    artist = Boolean(
      await verifyArtistSig(
        url.searchParams.get('address') || context.request.headers.get('X-Atelier-Address'),
        url.searchParams.get('signature') || context.request.headers.get('X-Atelier-Signature'),
      ),
    );
  }
  const offers = [];
  for (const ref of offerRefs) {
    const o = await readOrder(kv, ref.orderHash);
    if (o?.status !== 'active') continue;
    if (artist) {
      offers.push({
        orderHash: o.orderHash,
        priceWei: o.priceWei,
        priceEth: formatEther(BigInt(o.priceWei)),
        offerer: o.offerer,
        parameters: o.parameters,
        signature: o.signature,
        chain: o.chain,
      });
    } else {
      offers.push({
        orderHash: o.orderHash,
        priceWei: o.priceWei,
        priceEth: formatEther(BigInt(o.priceWei)),
        offererShort: `${o.offerer.slice(0, 6)}…${o.offerer.slice(-4)}`,
        endTime: Number((parseComponents(o.parameters) as OrderComponents).endTime),
      });
    }
  }
  return json({ ok: true, listing, offers });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const url = new URL(context.request.url);
  if (url.searchParams.get('action') === 'cancel-ack') {
    return cancelAck(context);
  }
  return postOrder(context);
};

async function postOrder(context: { request: Request; env: Env }) {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);
  let body: {
    address?: string;
    signatureAtelier?: string;
    kind?: string;
    chain?: string;
    parameters?: unknown;
    signature?: string;
    title?: string;
  };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const chain = body.chain === 'base' ? 'base' : 'ethereum';
  const flags = await readFlags(kv);
  if (!flags.chainReady.includes(chain)) return json({ ok: false, error: 'chain' }, 400);
  let components: OrderComponents;
  try {
    components = parseComponents(body.parameters);
  } catch {
    return json({ ok: false, error: 'components' }, 400);
  }
  const kind = body.kind === 'offer' ? 'offer' : 'listing';
  const shape = kind === 'listing' ? assertListing(components, chain) : assertOffer(components, chain);
  if (shape) return json({ ok: false, error: shape }, 400);
  const nft = kind === 'listing' ? nftFromListing(components) : nftFromOffer(components);
  if (!nft) return json({ ok: false, error: 'nft' }, 400);
  const col = findNikxContract(nft.token);
  if (!col) return json({ ok: false, error: 'contract' }, 400);
  if (!flags.standardsReady.includes(col.standard)) return json({ ok: false, error: 'standard' }, 400);

  const chainId = chainIdOf(chain);
  const sig = String(body.signature || '') as `0x${string}`;
  if (!sig.startsWith('0x')) return json({ ok: false, error: 'signature' }, 400);
  const recovered = await recoverOrderOfferer(components, sig, chainId);
  if (recovered.toLowerCase() !== components.offerer.toLowerCase()) {
    return json({ ok: false, error: 'recover' }, 400);
  }
  const orderHash = hashOrderComponents(components, chainId);

  if (kind === 'listing') {
    const artist = await verifyArtistSig(body.address, body.signatureAtelier);
    if (!artist) return json({ ok: false, error: 'unauthorized' }, 401);
    if (col.standard === 'erc721') {
      const owner = await ownerOf721(chain, nft.token, nft.tokenId);
      if (owner.toLowerCase() !== ARTIST_MINT_WALLET) return json({ ok: false, error: 'not_held' }, 400);
    } else {
      const bal = await balanceOf1155(chain, nft.token, ARTIST_MINT_WALLET, nft.tokenId);
      if (bal < nft.qty) return json({ ok: false, error: 'not_held' }, 400);
    }
  } else {
    const workIdGuess = `${col.seriesId}-${nft.tokenId.toString()}`;
    const idx = await readIndex(kv);
    const win = (idx.windows || []).find((w) => w.workId === workIdGuess);
    const now = Math.floor(Date.now() / 1000);
    const windowOpen = Boolean(win && now >= win.startTime && now <= win.endTime);
    if (!flags.publicOfferEnabled && !windowOpen) return json({ ok: false, error: 'offers_off' }, 403);
    if (body.address?.toLowerCase() !== components.offerer.toLowerCase()) {
      return json({ ok: false, error: 'offerer' }, 400);
    }
    if (win?.reserveWei && offerPriceWei(components) < BigInt(win.reserveWei)) {
      return json({ ok: false, error: 'below_reserve' }, 400);
    }
  }

  const workId = `${col.seriesId}-${nft.tokenId.toString()}`;
  const index = await readIndex(kv);
  if (kind === 'listing') {
    const existing = index.listings.find((r) => r.workId === workId);
    if (existing) {
      const cur = await readOrder(kv, existing.orderHash);
      if (cur?.status === 'active') return json({ ok: false, error: 'already_listed' }, 409);
    }
    const family = listingFamily(String(body.title || workId));
    const policy = (index.policies || []).find((p) => p.familyId === family.id);
    const maxLive = policy?.maxLive ?? (family.id.startsWith('will-it-panel-') ? 1 : 0);
    if (maxLive > 0) {
      const live = index.listings.filter(
        (r) => r.familyId === family.id || listingFamily(r.title || '').id === family.id,
      ).length;
      if (live >= maxLive) {
        return json(
          {
            ok: false,
            error: 'family_cap',
            hint: `Only ${maxLive} live listing(s) allowed in ${family.label}. Cancel or wait for a sale, then list the next.`,
          },
          409,
        );
      }
    }
  } else {
    const live = [];
    for (const ref of index.offers.filter((r) => r.workId === workId)) {
      const o = await readOrder(kv, ref.orderHash);
      if (o?.status === 'active') live.push(o);
    }
    if (live.some((o) => o.offerer.toLowerCase() === components.offerer.toLowerCase())) {
      return json({ ok: false, error: 'duplicate_offer' }, 409);
    }
    if (live.length >= 8) return json({ ok: false, error: 'offer_cap' }, 400);
  }

  const stored: StoredOrder = {
    orderHash,
    kind,
    chain,
    status: 'active',
    workId,
    seriesId: col.seriesId,
    contract: col.address,
    tokenId: nft.tokenId.toString(),
    priceWei: (kind === 'listing' ? listingPriceWei(components) : offerPriceWei(components)).toString(),
    offerer: components.offerer,
    parameters: components as unknown as StoredOrder['parameters'],
    signature: sig,
  };
  // Store JSON-safe parameters
  stored.parameters = jsonComponents(components);

  await writeOrder(kv, stored);
  const next = await casIndex(kv, (idx) => {
    const family = listingFamily(String(body.title || workId));
    const ref = {
      orderHash,
      kind: kind as 'listing' | 'offer',
      workId,
      offerer: components.offerer,
      chain: chain as 'ethereum' | 'base',
      familyId: family.id,
      title: String(body.title || ''),
    };
    if (kind === 'listing') idx.listings = [...idx.listings.filter((r) => r.workId !== workId), ref];
    else idx.offers = [...idx.offers.filter((r) => r.orderHash !== orderHash), ref];
    return idx;
  });
  if (!next) return json({ ok: false, error: 'index' }, 409);
  await bustCaches(kv);
  return json({ ok: true, orderHash, workId });
}

async function cancelAck(context: { request: Request; env: Env }) {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);
  let body: { orderHash?: string; address?: string; signatureAtelier?: string; txHash?: string; signature?: string };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const hash = String(body.orderHash || '').toLowerCase() as `0x${string}`;
  const order = await readOrder(kv, hash);
  if (!order) return json({ ok: false, error: 'missing' }, 404);
  const components = parseComponents(order.parameters);
  const status = await getOrderStatus(order.chain, order.orderHash);
  const counter = await getCounter(order.chain, order.offerer);
  let proved = status.isCancelled || counter !== components.counter;
  if (!proved && body.txHash) {
    const client = publicClientFor(order.chain);
    const receipt = await client.getTransactionReceipt({ hash: body.txHash as `0x${string}` });
    if (receipt.status === 'success') {
      const cancelled = decodeEventLogSafe(receipt.logs, 'OrderCancelled', hash);
      const bumped = decodeEventLogSafe(receipt.logs, 'CounterIncremented', order.offerer);
      proved = cancelled || bumped;
    }
  }
  if (!proved) return json({ ok: false, error: 'not_cancelled' }, 409);

  if (order.kind === 'listing') {
    const artist = await verifyArtistSig(body.address, body.signatureAtelier);
    const fromArtist = body.txHash
      ? await txFrom(order.chain, body.txHash, ARTIST_MINT_WALLET)
      : false;
    if (!artist && !fromArtist) return json({ ok: false, error: 'unauthorized' }, 401);
  } else {
    const fromOfferer = body.txHash ? await txFrom(order.chain, body.txHash, order.offerer) : false;
    let signed = false;
    if (body.signature && body.address) {
      const msg = `${CANCEL_ACK_PREFIX}:${chainIdOf(order.chain)}:${order.orderHash}:${components.salt.toString()}`;
      try {
        signed = await verifyMessage({
          address: body.address as `0x${string}`,
          message: msg,
          signature: body.signature as `0x${string}`,
        });
        signed = signed && body.address.toLowerCase() === order.offerer.toLowerCase();
      } catch {
        signed = false;
      }
    }
    if (!fromOfferer && !signed) return json({ ok: false, error: 'unauthorized' }, 401);
  }

  order.status = 'cancelled';
  await writeOrder(kv, order);
  if (counter !== components.counter) {
    await casIndex(kv, (idx) => {
      const mine = [...idx.listings, ...idx.offers].filter(
        (r) => r.offerer.toLowerCase() === order.offerer.toLowerCase() && r.chain === order.chain,
      );
      for (const ref of mine) {
        idx.listings = dropRef(idx.listings, ref.orderHash);
        idx.offers = dropRef(idx.offers, ref.orderHash);
      }
      return idx;
    });
  } else {
    await casIndex(kv, (idx) => {
      idx.listings = dropRef(idx.listings, order.orderHash);
      idx.offers = dropRef(idx.offers, order.orderHash);
      return idx;
    });
  }
  await bustCaches(kv);
  return json({ ok: true });
}

async function txFrom(chain: 'ethereum' | 'base', txHash: string, who: string) {
  try {
    const client = publicClientFor(chain);
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    return tx.from.toLowerCase() === who.toLowerCase();
  } catch {
    return false;
  }
}

function decodeEventLogSafe(
  logs: { address: string; data: string; topics: readonly `0x${string}`[] }[],
  name: 'OrderCancelled' | 'CounterIncremented',
  match: string,
): boolean {
  for (const log of logs) {
    if (log.address.toLowerCase() !== SEAPORT_1_6.toLowerCase()) continue;
    try {
      const parsed = decodeEventLog({
        abi: seaportAbi,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      if (parsed.eventName !== name) continue;
      const args = parsed.args as Record<string, unknown>;
      if (name === 'OrderCancelled' && String(args.orderHash).toLowerCase() === match.toLowerCase()) return true;
      if (name === 'CounterIncremented' && String(args.offerer).toLowerCase() === match.toLowerCase()) return true;
    } catch {
      /* next */
    }
  }
  return false;
}
