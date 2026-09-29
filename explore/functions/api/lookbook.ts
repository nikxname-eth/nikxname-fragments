/**
 * GET /api/lookbook
 * Studio inventory (artist mint wallet) + live listings across Nikxname contracts.
 * Used by the Garden / Atelier catalogue drawer.
 */

import { ARTIST_MINT_WALLET } from '../../lib/collectors';
import { findNikxContract } from '../../lib/contracts';
import { WOULD_IT_CONTRACT, wouldItOpenSeaItem } from '../../config/would-it';

type Env = {
  RASTER_API_KEY?: string;
  GARDEN_EGG?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  };
};

const CACHE_KEY = 'lookbook:v2';
const CACHE_TTL = 90;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=45',
};

const ARTWORK_SLUGS = [
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

export const onRequestGet = async (context: { env: Env; request: Request }): Promise<Response> => {
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

  const origin = new URL(context.request.url).origin;
  const [studio, listed] = await Promise.all([
    fetchStudio(origin),
    fetchListed(context.env.RASTER_API_KEY),
  ]);

  const payload = { ok: true, studio, listed };
  if (kv) {
    try {
      await kv.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: CACHE_TTL });
    } catch {
      /* ignore */
    }
  }
  return json(payload);
};

async function fetchStudio(origin: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${origin}/api/garden?wallet=${encodeURIComponent(ARTIST_MINT_WALLET)}`,
    );
    const data = (await res.json()) as {
      beds?: { seriesId: string; tokens: { tokenId: string }[] }[];
    };
    const ids: string[] = [];
    for (const bed of data.beds || []) {
      for (const t of bed.tokens || []) ids.push(`${bed.seriesId}-${t.tokenId}`);
    }
    return ids;
  } catch {
    return [];
  }
}

type ListedRow = { id: string; href: string; price?: string };

async function fetchListed(apiKey: string | undefined): Promise<ListedRow[]> {
  if (!apiKey) return [];
  const out: ListedRow[] = [];
  const seen = new Set<string>();

  await Promise.all(
    ARTWORK_SLUGS.map(async (slug) => {
      const nodes = await rasterListed(slug, apiKey);
      for (const node of nodes) {
        const col = findNikxContract(node.contractAddress);
        const tokenId = String(node.tokenId || '').trim();
        if (!col || !tokenId) continue;
        const id = `${col.seriesId}-${tokenId}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const chain = col.chain === 'base' ? 'base' : 'ethereum';
        out.push({
          id,
          href:
            col.address.toLowerCase() === WOULD_IT_CONTRACT
              ? wouldItOpenSeaItem(Number(tokenId))
              : `https://opensea.io/item/${chain}/${col.address}/${tokenId}`,
          price: node.price,
        });
      }
    }),
  );

  return out;
}

async function rasterListed(
  slug: string,
  apiKey: string,
): Promise<{ tokenId?: string; contractAddress?: string; price?: string }[]> {
  const out: { tokenId?: string; contractAddress?: string; price?: string }[] = [];
  let after: string | null = null;
  const query = `
    query Listed($slug: String!, $after: String) {
      artworkBySlug(slug: $slug) {
        tokens(first: 80, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            tokenId
            contractAddress
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
    for (let page = 0; page < 24; page++) {
      const res = await fetch('https://api.raster.art/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Api-Key ${apiKey}`,
        },
        body: JSON.stringify({ query, variables: { slug, after } }),
      });
      if (!res.ok) return out;
      const body = (await res.json()) as {
        errors?: unknown;
        data?: {
          artworkBySlug?: {
            tokens?: {
              pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
              nodes?: {
                tokenId?: string;
                contractAddress?: string;
                bestListing?: {
                  unitPrice?: { amount?: string; currency?: string; decimals?: number; symbol?: string };
                } | null;
              }[];
            };
          } | null;
        };
      };
      if (body.errors) return out;
      const conn = body.data?.artworkBySlug?.tokens;
      if (!conn) return out;
      for (const n of conn.nodes || []) {
        if (!n?.bestListing) continue;
        const unit = n.bestListing.unitPrice;
        let price: string | undefined;
        if (unit?.amount) {
          const dec = unit.decimals ?? 18;
          const val = Number(unit.amount) / 10 ** dec;
          if (Number.isFinite(val) && val > 0) {
            const bodyAmt =
              val < 0.01 ? val.toFixed(4) : val.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
            price = `${bodyAmt} ${unit.symbol || unit.currency || 'ETH'}`;
          }
        }
        out.push({
          tokenId: n.tokenId,
          contractAddress: n.contractAddress,
          price,
        });
      }
      if (!conn.pageInfo?.hasNextPage || !conn.pageInfo.endCursor) return out;
      after = conn.pageInfo.endCursor;
    }
  } catch {
    return out;
  }
  return out;
}
