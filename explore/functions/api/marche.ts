/**
 * GET /api/marche?fresh=1
 * Live Nikxname listings from OpenSea (created + collection) and Raster.
 */

import { ARTIST_MINT_WALLET } from '../../lib/collectors';
import { NIKX_CONTRACTS, findNikxContract } from '../../lib/contracts';

type Env = {
  OPENSEA_API_KEY?: string;
  RASTER_API_KEY?: string;
  GARDEN_EGG?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  };
};

export type MarcheListing = {
  id: string;
  seriesId: string;
  seriesLabel: string;
  tokenId: string;
  contract: string;
  chain: 'ethereum' | 'base';
  title: string;
  price?: string;
  href: string;
  source: 'opensea' | 'raster';
  image?: string;
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=30',
};
const CACHE_KEY = 'marche:listings:v3';
const CACHE_TTL = 60;

const OS_SLUGS: { slug: string; chain: 'ethereum' | 'base' }[] = [
  { slug: 'a-familiar-burn', chain: 'ethereum' },
  { slug: 'the-void-nikxname', chain: 'ethereum' },
  { slug: 'life-impressions-by-nikxname', chain: 'ethereum' },
  { slug: 'for-you-nikxname', chain: 'ethereum' },
  { slug: 'nikxname-1-1-s', chain: 'ethereum' },
  { slug: 'for-her-by-nikxname', chain: 'base' },
];

const RASTER_SLUGS = [
  'a-familiar-burn-by-nikxname',
  'the-void-by-nikxname',
  'life-impressions-by-nikxname',
  'for-you-by-nikxname',
  'for-her-by-nikxname',
  'crimson-falls-by-nikxname',
  'burn-the-roses-by-nikxname',
  'the-last-dance-by-nikxname',
  'reflection-of-self-by-nikxname',
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

function formatWei(value?: string, decimals = 18, symbol = 'ETH'): string | undefined {
  if (!value) return undefined;
  const n = Number(value) / 10 ** decimals;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const body = n < 0.01 ? n.toFixed(4) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return `${body} ${symbol}`;
}

function itemHref(chain: 'ethereum' | 'base', contract: string, tokenId: string) {
  return `https://opensea.io/item/${chain}/${contract}/${tokenId}`;
}

function upsert(map: Map<string, MarcheListing>, row: MarcheListing) {
  const prev = map.get(row.id);
  if (!prev) {
    map.set(row.id, row);
    return;
  }
  map.set(row.id, {
    ...prev,
    ...row,
    price: row.price || prev.price,
    image: row.image || prev.image,
    href: prev.href || row.href,
  });
}

export const onRequestGet = async (context: { env: Env; request: Request }) => {
  const fresh = new URL(context.request.url).searchParams.get('fresh') === '1';
  const kv = context.env.GARDEN_EGG;
  if (kv && !fresh) {
    try {
      const hit = await kv.get(CACHE_KEY);
      if (hit) return json(JSON.parse(hit));
    } catch {
      /* continue */
    }
  }

  const osKey = context.env.OPENSEA_API_KEY;
  const rasterKey = context.env.RASTER_API_KEY;
  const map = new Map<string, MarcheListing>();

  await Promise.all([
    osKey ? fromOpenSeaMaker(osKey, map) : Promise.resolve(),
    osKey ? fromOpenSeaCollections(osKey, map) : Promise.resolve(),
    osKey ? fromOpenSeaContracts(osKey, map) : Promise.resolve(),
    rasterKey ? fromRaster(rasterKey, map) : Promise.resolve(),
  ]);

  const listings = [...map.values()].sort((a, b) => a.seriesLabel.localeCompare(b.seriesLabel));
  const payload = {
    ok: true,
    fetchedAt: new Date().toISOString(),
    sources: {
      opensea: Boolean(osKey) || listings.some((l) => l.source === 'opensea'),
      raster: Boolean(rasterKey),
    },
    count: listings.length,
    listings,
  };
  if (kv) {
    try {
      await kv.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: CACHE_TTL });
    } catch {
      /* ignore */
    }
  }
  return json(payload);
};

async function osGet(url: string, key: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'x-api-key': key },
  });
  if (!res.ok) return null;
  return res.json();
}

type OsOrder = {
  current_price?: string;
  price?: { current?: { value?: string; decimals?: number; currency?: string } };
  maker?: { address?: string };
  protocol_data?: {
    parameters?: {
      offer?: { token?: string; identifierOrCriteria?: string }[];
      consideration?: { token?: string; identifierOrCriteria?: string }[];
    };
  };
  maker_asset_bundle?: {
    assets?: { token_id?: string; asset_contract?: { address?: string }; image_url?: string; name?: string }[];
  };
};

function priceFromOrder(order: OsOrder): string | undefined {
  return (
    formatWei(order.current_price) ||
    formatWei(
      order.price?.current?.value,
      order.price?.current?.decimals ?? 18,
      order.price?.current?.currency || 'ETH',
    )
  );
}

function rowFromOrder(order: OsOrder & {
  nft?: { identifier?: string; contract?: string; name?: string; image_url?: string; display_image_url?: string };
  asset?: { contract?: string; identifier?: string };
}, fallbackChain: 'ethereum' | 'base'): MarcheListing | null {
  const asset = order.maker_asset_bundle?.assets?.[0];
  const offer =
    order.protocol_data?.parameters?.offer?.find((o) => o.token && o.identifierOrCriteria) ||
    order.protocol_data?.parameters?.offer?.[0];
  const nft = order.nft;
  const contract = (
    nft?.contract ||
    order.asset?.contract ||
    asset?.asset_contract?.address ||
    offer?.token ||
    ''
  ).toLowerCase();
  const tokenId = String(
    nft?.identifier || order.asset?.identifier || asset?.token_id || offer?.identifierOrCriteria || '',
  ).trim();
  const col = findNikxContract(contract);
  if (!col || !tokenId || tokenId === '0' || /^0x[0-9a-f]{40,}$/i.test(tokenId)) return null;
  const chain = col.chain === 'base' ? 'base' : fallbackChain;
  return {
    id: `${col.seriesId}-${tokenId}`,
    seriesId: col.seriesId,
    seriesLabel: col.label,
    tokenId,
    contract: col.address,
    chain,
    title: nft?.name || asset?.name || `${col.label} #${tokenId}`,
    price: priceFromOrder(order),
    href: itemHref(chain, col.address, tokenId),
    source: 'opensea',
    image: nft?.image_url || nft?.display_image_url || asset?.image_url,
  };
}

async function fromOpenSeaMaker(key: string, map: Map<string, MarcheListing>) {
  for (const chain of ['ethereum', 'base'] as const) {
    const body = (await osGet(
      `https://api.opensea.io/api/v2/orders/${chain}/seaport/listings?maker=${ARTIST_MINT_WALLET}&limit=50`,
      key,
    )) as { orders?: OsOrder[] } | null;
    for (const order of body?.orders || []) {
      const row = rowFromOrder(order, chain);
      if (row) upsert(map, row);
    }
  }
}

async function fromOpenSeaContracts(key: string, map: Map<string, MarcheListing>) {
  await Promise.all(
    NIKX_CONTRACTS.map(async (col) => {
      const chain = col.chain === 'base' ? 'base' : 'ethereum';
      const body = (await osGet(
        `https://api.opensea.io/api/v2/orders/${chain}/seaport/listings?asset_contract_address=${col.address}&limit=50&order_by=created_date`,
        key,
      )) as { orders?: OsOrder[] } | null;
      for (const order of body?.orders || []) {
        const row = rowFromOrder(order, chain);
        if (row) upsert(map, row);
      }
    }),
  );
}

async function fromOpenSeaCollections(key: string, map: Map<string, MarcheListing>) {
  await Promise.all(
    OS_SLUGS.map(async ({ slug, chain }) => {
      let next: string | undefined;
      for (let page = 0; page < 4; page++) {
        const url =
          `https://api.opensea.io/api/v2/listings/collection/${slug}/all?limit=50` +
          (next ? `&next=${encodeURIComponent(next)}` : '');
        const listed = (await osGet(url, key)) as {
          listings?: OsOrder[];
          next?: string;
        } | null;
        for (const listing of listed?.listings || []) {
          const row = rowFromOrder(listing, chain);
          if (row) upsert(map, row);
        }
        next = listed?.next;
        if (!next) break;
      }
      const bySlug = (await osGet(
        `https://api.opensea.io/api/v2/orders/${chain}/seaport/listings?collection_slug=${slug}&limit=50`,
        key,
      )) as { orders?: OsOrder[] } | null;
      for (const order of bySlug?.orders || []) {
        const row = rowFromOrder(order, chain);
        if (row) upsert(map, row);
      }
    }),
  );
}

async function fromRaster(key: string, map: Map<string, MarcheListing>) {
  await Promise.all(
    RASTER_SLUGS.map(async (slug) => {
      let after: string | null = null;
      for (let page = 0; page < 24; page++) {
        const query = `
          query Listed($slug: String!, $after: String) {
            artworkBySlug(slug: $slug) {
              tokens(first: 80, after: $after) {
                pageInfo { hasNextPage endCursor }
                nodes {
                  tokenId
                  contractAddress
                  name
                  bestListing {
                    marketplaceId
                    unitPrice { amount currency decimals symbol }
                  }
                }
              }
            }
          }
        `;
        try {
          const res = await fetch('https://api.raster.art/graphql', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `Api-Key ${key}`,
            },
            body: JSON.stringify({ query, variables: { slug, after } }),
          });
          if (!res.ok) return;
          const body = (await res.json()) as {
            errors?: unknown;
            data?: {
              artworkBySlug?: {
                tokens?: {
                  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
                  nodes?: {
                    tokenId?: string;
                    contractAddress?: string;
                    name?: string;
                    bestListing?: {
                      marketplaceId?: string;
                      unitPrice?: { amount?: string; currency?: string; decimals?: number; symbol?: string };
                    } | null;
                  }[];
                };
              } | null;
            };
          };
          if (body.errors) return;
          const conn = body.data?.artworkBySlug?.tokens;
          if (!conn) return;
          for (const n of conn.nodes || []) {
            if (!n?.bestListing) continue;
            const col = findNikxContract(n.contractAddress);
            const tokenId = String(n.tokenId || '').trim();
            if (!col || !tokenId) continue;
            const unit = n.bestListing.unitPrice;
            const unitLabel =
              unit?.symbol && !unit.symbol.startsWith('0x')
                ? unit.symbol
                : 'ETH';
            const price = unit?.amount
              ? formatWei(unit.amount, unit.decimals ?? 18, unitLabel)
              : undefined;
            const chain = col.chain === 'base' ? 'base' : 'ethereum';
            upsert(map, {
              id: `${col.seriesId}-${tokenId}`,
              seriesId: col.seriesId,
              seriesLabel: col.label,
              tokenId,
              contract: col.address,
              chain,
              title: n.name || `${col.label} #${tokenId}`,
              price,
              href: itemHref(chain, col.address, tokenId),
              source: n.bestListing.marketplaceId === 'opensea' ? 'opensea' : 'raster',
            });
          }
          if (!conn.pageInfo?.hasNextPage || !conn.pageInfo.endCursor) return;
          after = conn.pageInfo.endCursor;
        } catch {
          return;
        }
      }
    }),
  );
}
