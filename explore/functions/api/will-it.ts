/**
 * GET /api/will-it
 * Live panel status for Will It.. (tokens 806–820 on A Familiar Burn).
 * Raster listings + Alchemy owners. OpenSea asks when OPENSEA_API_KEY is set.
 */

import {
  WOULD_IT_CONTRACT,
  WOULD_IT_LIST_ETH,
  WOULD_IT_OPENSEA,
  WOULD_IT_RASTER,
  WOULD_IT_TREASURY,
  WOULD_PANELS,
  WOULD_SETS,
  wouldItOpenSeaItem,
  wouldItTokenId,
  wouldPanelListed,
  wouldPanelRevealed,
  wouldPanelSoonLabel,
  type WouldPanelRow,
  type WouldPanelStatus,
  type WouldSetLetter,
} from '../../config/would-it';

type Env = {
  RASTER_API_KEY?: string;
  OPENSEA_API_KEY?: string;
  GARDEN_EGG?: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> };
};

const CACHE_KEY = 'will-it:status:v4';
const CACHE_TTL = 90;
const TREASURY = new Set(WOULD_IT_TREASURY.map((a) => a.toLowerCase()));
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=45',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: {
  env: Env;
}): Promise<Response> => {
  const kv = context.env.GARDEN_EGG;
  if (kv) {
    try {
      const hit = await kv.get(CACHE_KEY);
      if (hit) return json(JSON.parse(hit));
    } catch {
      /* continue */
    }
  }

  const payload = await buildStatus(context.env);
  if (kv) {
    try {
      await kv.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: CACHE_TTL });
    } catch {
      /* ignore */
    }
  }
  return json(payload);
};

async function buildStatus(env: Env) {
  const keys: { letter: WouldSetLetter; panel: number; tokenId: number }[] = [];
  for (const letter of WOULD_SETS) {
    for (const panel of WOULD_PANELS) {
      keys.push({ letter, panel, tokenId: wouldItTokenId(letter, panel) });
    }
  }

  const [owners, raster, opensea, offers] = await Promise.all([
    fetchOwners(keys.map((k) => k.tokenId)),
    fetchRasterListings(keys.map((k) => k.tokenId), env.RASTER_API_KEY),
    fetchOpenSeaListings(keys.map((k) => k.tokenId), env.OPENSEA_API_KEY),
    fetchOpenSeaOffers(keys.map((k) => k.tokenId), env.OPENSEA_API_KEY),
  ]);

  const panels: Record<string, WouldPanelRow> = {};
  for (const row of keys) {
    const key = `${row.letter}${row.panel}`;
    const owner = owners.get(row.tokenId);
    const listing = raster.get(row.tokenId) || opensea.get(row.tokenId);
    const listed = wouldPanelListed(row.panel);
    const heldByStudio = !owner || TREASURY.has(owner);
    let status: WouldPanelStatus;
    let label: string;
    if (!heldByStudio) {
      status = 'sold';
      label = 'Sold';
    } else if (!listed) {
      status = 'soon';
      label = wouldPanelSoonLabel(row.panel);
    } else {
      status = 'available';
      label = listing?.price ? `Listed · ${listing.price}` : `Listed · ${WOULD_IT_LIST_ETH} ETH`;
    }
    const offer = offers.get(row.tokenId);
    if (offer && status !== 'sold') {
      label = `${label} · Offer ${offer}`;
    }
    panels[key] = {
      key,
      letter: row.letter,
      panel: row.panel,
      tokenId: row.tokenId,
      status,
      label,
      price: listing?.price,
      offer,
      href: wouldItOpenSeaItem(row.tokenId),
      source: listing?.source,
    };
  }

  return {
    ok: true,
    contract: WOULD_IT_CONTRACT,
    raster: WOULD_IT_RASTER,
    openSea: WOULD_IT_OPENSEA,
    panels,
  };
}

async function fetchOwners(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const url =
          `https://eth-mainnet.g.alchemy.com/nft/v3/demo/getOwnersForNFT` +
          `?contractAddress=${WOULD_IT_CONTRACT}&tokenId=${id}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const body = (await res.json()) as { owners?: string[] };
        const owner = body.owners?.[0];
        if (owner) out.set(id, owner.toLowerCase());
      } catch {
        /* skip */
      }
    }),
  );
  return out;
}

type Listing = { price?: string; href?: string; source: string };

async function fetchRasterListings(
  ids: number[],
  apiKey: string | undefined,
): Promise<Map<number, Listing>> {
  const out = new Map<number, Listing>();
  if (!apiKey) return out;
  const aliases = ids.map((id, i) => {
    return `t${i}: tokenByRef(ref: { chainId: "eip155:1", contractAddress: "${WOULD_IT_CONTRACT}", tokenId: "${id}" }) {
      tokenId
      bestListing { unitPrice { amount currency decimals symbol } marketplaceId }
    }`;
  });
  const query = `query { ${aliases.join('\n')} }`;
  try {
    const res = await fetch('https://api.raster.art/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return out;
    const body = (await res.json()) as {
      data?: Record<
        string,
        {
          tokenId?: string;
          bestListing?: {
            marketplaceId?: string;
            unitPrice?: { amount?: string; currency?: string; decimals?: number; symbol?: string };
          } | null;
        } | null
      >;
    };
    for (const node of Object.values(body.data || {})) {
      if (!node?.tokenId || !node.bestListing) continue;
      const tokenId = Number(node.tokenId);
      const price = formatAmount(node.bestListing.unitPrice);
      out.set(tokenId, {
        price,
        href: wouldItOpenSeaItem(tokenId),
        source: node.bestListing.marketplaceId || 'raster',
      });
    }
  } catch {
    /* skip */
  }
  return out;
}

async function fetchOpenSeaListings(
  ids: number[],
  apiKey: string | undefined,
): Promise<Map<number, Listing>> {
  const out = new Map<number, Listing>();
  if (!apiKey) return out;
  await Promise.all(
    ids.map(async (id) => {
      try {
        const url =
          `https://api.opensea.io/api/v2/orders/ethereum/seaport/listings` +
          `?asset_contract_address=${WOULD_IT_CONTRACT}&token_ids=${id}&limit=1`;
        const res = await fetch(url, {
          headers: { accept: 'application/json', 'x-api-key': apiKey },
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          orders?: {
            current_price?: string;
            price?: { current?: { value?: string; decimals?: number; currency?: string } };
          }[];
        };
        const order = body.orders?.[0];
        if (!order) return;
        const price =
          formatWei(order.current_price) ||
          formatAmount({
            amount: order.price?.current?.value,
            decimals: order.price?.current?.decimals,
            symbol: order.price?.current?.currency,
          });
        out.set(id, {
          price,
          href: wouldItOpenSeaItem(id),
          source: 'opensea',
        });
      } catch {
        /* skip */
      }
    }),
  );
  return out;
}

function formatAmount(p?: {
  amount?: string;
  currency?: string;
  decimals?: number;
  symbol?: string;
}): string | undefined {
  if (!p?.amount) return undefined;
  const dec = p.decimals ?? 18;
  const n = Number(p.amount) / 10 ** dec;
  if (!Number.isFinite(n)) return undefined;
  const unit = p.symbol || p.currency || 'ETH';
  return `${n < 0.01 ? n.toFixed(4) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} ${unit}`;
}

async function fetchOpenSeaOffers(
  ids: number[],
  apiKey: string | undefined,
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (!apiKey) return out;
  await Promise.all(
    ids.map(async (id) => {
      try {
        const url =
          `https://api.opensea.io/api/v2/orders/ethereum/seaport/offers` +
          `?asset_contract_address=${WOULD_IT_CONTRACT}&token_ids=${id}&limit=1`;
        const res = await fetch(url, {
          headers: { accept: 'application/json', 'x-api-key': apiKey },
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          orders?: { current_price?: string }[];
        };
        const price = formatWei(body.orders?.[0]?.current_price);
        if (price) out.set(id, price);
      } catch {
        /* skip */
      }
    }),
  );
  return out;
}

function formatWei(wei?: string): string | undefined {
  if (!wei) return undefined;
  const n = Number(wei) / 1e18;
  if (!Number.isFinite(n)) return undefined;
  return `${n < 0.01 ? n.toFixed(4) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} ETH`;
}
