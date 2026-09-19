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

const CACHE_KEY = 'lookbook:v1';
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
  'nikxname-1-1s-by-nikxname',
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
  const kv = context.env.GARDEN_EGG;
  if (kv) {
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

type ListedRow = { id: string; href: string };

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
        });
      }
    }),
  );

  return out;
}

async function rasterListed(
  slug: string,
  apiKey: string,
): Promise<{ tokenId?: string; contractAddress?: string }[]> {
  const query = `
    query Listed($slug: String!) {
      artwork(slug: $slug) {
        tokens(first: 80) {
          nodes {
            tokenId
            contractAddress
            bestListing { marketplaceId }
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
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({ query, variables: { slug } }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      errors?: unknown;
      data?: {
        artwork?: {
          tokens?: {
            nodes?: {
              tokenId?: string;
              contractAddress?: string;
              bestListing?: { marketplaceId?: string } | null;
            }[];
          };
        };
      };
    };
    if (body.errors) return [];
    return (body.data?.artwork?.tokens?.nodes || []).filter((n) => n?.bestListing);
  } catch {
    return [];
  }
}
