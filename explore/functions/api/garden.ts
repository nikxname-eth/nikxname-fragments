/**
 * GET /api/garden?wallet=0x…
 * Holdings across the six Nikxname contracts.
 *
 * A listing is not a transfer — listed works stay in the garden until they
 * sell. Raster `tokensOwned` (newest first) + Alchemy `totalCount` on the six
 * contracts is the cheap pulse: polls skip a full walk unless a mint/sale
 * actually moved a token. Full walk is Alchemy (paginated, ETH + Base) union
 * Raster names/previews. Raster key: Pages secret RASTER_API_KEY.
 */

type Kv = {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

type Env = { RASTER_API_KEY?: string; GARDEN_EGG?: Kv };

const HOLD_PREFIX = 'garden:hold:';
const HOLD_TTL = 600;

const CONTRACTS = [
  {
    seriesId: 'one-of-ones',
    label: "Nikxname 1/1's",
    address: '0x07f3bfe5ca8d84108df5c020f885d1d6bf40585e',
    chain: 'ethereum',
  },
  {
    seriesId: 'life-impressions',
    label: 'Life Impressions',
    address: '0xb00b42b5baa62f6ce800fb919b3d090b51c4463c',
    chain: 'ethereum',
  },
  {
    seriesId: 'for-you',
    label: 'For You..',
    address: '0x5174ed5f363ef4df2823f42be54de5fd61294e49',
    chain: 'ethereum',
  },
  {
    seriesId: 'for-her',
    label: 'For Her..',
    address: '0x9813ff20c99525922b3538fce8c2c9e5db93866c',
    chain: 'base',
  },
  {
    seriesId: 'the-void',
    label: 'The Void',
    address: '0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    chain: 'ethereum',
  },
  {
    seriesId: 'a-familiar-burn',
    label: 'A Familiar Burn',
    address: '0x1641b09e11d19e6f6b9f80273158f9da28555593',
    chain: 'ethereum',
  },
] as const;

const BY_ADDR = new Map(CONTRACTS.map((c) => [c.address.toLowerCase(), c]));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function normalizeWallet(w: string | null): string | null {
  if (!w) return null;
  const t = w.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? t : null;
}

function tokenIdStr(id: string | number | undefined | null): string | null {
  if (id == null || id === '') return null;
  try {
    return String(BigInt(id));
  } catch {
    return String(id);
  }
}

function tokenKey(contract: string, tokenId: string) {
  return `${contract.toLowerCase()}:${tokenId}`;
}

/** Garden thumbs use the still — `700-anim.gif` 403s on some Raster hashes. */
function rasterPreview(hash: string | null | undefined): string | undefined {
  if (!hash || hash.length < 8) return undefined;
  return `https://bits.raster.art/${hash.slice(0, 4)}/${hash}/700.avif`;
}

type GardenToken = {
  seriesId: string;
  collection: string;
  contract: string;
  chain: string;
  tokenId: string;
  name: string;
  quantity: number;
  previewUrl?: string;
  contentUrl?: string;
};

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

type GardenPayload = {
  ok: true;
  wallet: string;
  source: string;
  total: number;
  beds: { seriesId: string; label: string; tokens: GardenToken[] }[];
};

type HoldCache = { pulse: string; payload: GardenPayload; at: number };

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
}): Promise<Response> => {
  const wallet = normalizeWallet(new URL(context.request.url).searchParams.get('wallet'));
  if (!wallet) return json({ ok: false, error: 'invalid_wallet' }, 400);

  const kv = context.env.GARDEN_EGG;
  const cacheKey = HOLD_PREFIX + wallet;
  let cached: HoldCache | null = null;
  if (kv) {
    try {
      const raw = await kv.get(cacheKey, { cacheTtl: 30 });
      if (raw) cached = JSON.parse(raw) as HoldCache;
    } catch {
      cached = null;
    }
  }

  const rasterKey = context.env.RASTER_API_KEY;
  let pulse: string | null = null;
  if (cached?.payload?.ok) {
    pulse = await holdingsPulse(wallet, rasterKey);
    if (pulse === cached.pulse) {
      return json({ ...cached.payload, source: `${cached.payload.source}+cache` });
    }
  }

  const [rasterResult, alchemyResult] = await Promise.allSettled([
    rasterKey ? fetchRasterHoldings(wallet, rasterKey) : Promise.resolve([] as GardenToken[]),
    fetchAlchemyHoldings(wallet),
  ]);

  const raster = rasterResult.status === 'fulfilled' ? rasterResult.value : [];
  const alchemy = alchemyResult.status === 'fulfilled' ? alchemyResult.value : [];

  if (!raster.length && !alchemy.length) {
    return json({ ok: false, error: 'lookup_failed', wallet }, 502);
  }

  const tokens = mergeHoldings(alchemy, raster);
  const source =
    alchemyResult.status === 'fulfilled' && rasterResult.status === 'fulfilled'
      ? 'alchemy+raster'
      : alchemyResult.status === 'fulfilled'
        ? 'alchemy'
        : 'raster';

  const payload: GardenPayload = {
    ok: true,
    wallet,
    source,
    total: tokens.length,
    beds: CONTRACTS.map((c) => ({
      seriesId: c.seriesId,
      label: c.label,
      tokens: tokens
        .filter((t) => t.seriesId === c.seriesId)
        .sort((a, b) => Number(a.tokenId) - Number(b.tokenId)),
    })).filter((b) => b.tokens.length > 0),
  };

  if (kv) {
    const write = (async () => {
      const p = pulse ?? (await holdingsPulse(wallet, rasterKey));
      await kv.put(
        cacheKey,
        JSON.stringify({ pulse: p, payload, at: Date.now() } satisfies HoldCache),
        { expirationTtl: HOLD_TTL },
      );
    })();
    if (typeof context.waitUntil === 'function') context.waitUntil(write);
    else await write;
  }

  return json(payload);
};

function mergeHoldings(alchemy: GardenToken[], raster: GardenToken[]): GardenToken[] {
  const map = new Map<string, GardenToken>();
  for (const t of alchemy) map.set(tokenKey(t.contract, t.tokenId), { ...t });
  for (const t of raster) {
    const k = tokenKey(t.contract, t.tokenId);
    const existing = map.get(k);
    if (!existing) {
      map.set(k, { ...t });
      continue;
    }
    map.set(k, {
      ...existing,
      name: t.name || existing.name,
      quantity: t.quantity || existing.quantity,
      previewUrl: t.previewUrl || existing.previewUrl,
      contentUrl: t.contentUrl || existing.contentUrl,
    });
  }
  return [...map.values()];
}

async function fetchRasterHoldings(wallet: string, apiKey: string): Promise<GardenToken[]> {
  const query = `
    query Garden($address: String!, $after: String) {
      address(address: $address) {
        tokensOwned(first: 80, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            quantity
            token {
              name
              tokenId
              contractAddress
              media { previewHash previewType contentUrl }
            }
          }
        }
      }
    }
  `;

  const out: GardenToken[] = [];
  let after: string | null = null;
  // Newest-first, mixed with other collections. Whales need ~14+ pages
  // (Geoff) so Alchemy-missed tokens still get picked up by the union.
  for (let page = 0; page < 20; page++) {
    const res = await fetch('https://api.raster.art/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({ query, variables: { address: wallet, after } }),
    });
    if (!res.ok) throw new Error(`raster ${res.status}`);
    const body = (await res.json()) as {
      data?: {
        address?: {
          tokensOwned?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string };
            nodes?: {
              quantity?: string | number;
              token?: {
                name?: string;
                tokenId?: string;
                contractAddress?: string;
                media?: {
                  previewHash?: string;
                  previewType?: string;
                  contentUrl?: string;
                };
              };
            }[];
          };
        };
      };
    };
    const conn = body.data?.address?.tokensOwned;
    for (const node of conn?.nodes || []) {
      const tok = node.token;
      if (!tok) continue;
      const col = findByAddr(tok.contractAddress);
      const tokenId = tokenIdStr(tok.tokenId);
      if (!col || !tokenId) continue;
      out.push({
        seriesId: col.seriesId,
        collection: col.label,
        contract: col.address,
        chain: col.chain,
        tokenId,
        name: tok.name || `${col.label} #${tokenId}`,
        quantity: Number(node.quantity) || 1,
        previewUrl: rasterPreview(tok.media?.previewHash),
        contentUrl: tok.media?.contentUrl,
      });
    }
    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor || null;
    if (!after) break;
  }
  return out;
}

function findByAddr(address: string | undefined) {
  if (!address) return undefined;
  return BY_ADDR.get(address.toLowerCase());
}

/** Cheap ownership cursor: listings do not change this; sales and mints do. */
async function holdingsPulse(wallet: string, rasterKey: string | undefined): Promise<string> {
  const eth = CONTRACTS.filter((c) => c.chain === 'ethereum').map((c) => c.address);
  const base = CONTRACTS.filter((c) => c.chain === 'base').map((c) => c.address);
  const [ethCount, baseCount, rasterHead] = await Promise.all([
    alchemyTotalCount('eth-mainnet', wallet, eth),
    alchemyTotalCount('base-mainnet', wallet, base),
    rasterKey ? rasterNewestNikx(wallet, rasterKey) : Promise.resolve(''),
  ]);
  return `e${ethCount}|b${baseCount}|${rasterHead}`;
}

async function rasterNewestNikx(wallet: string, apiKey: string): Promise<string> {
  const query = `
    query Pulse($address: String!) {
      address(address: $address) {
        tokensOwned(first: 16) {
          nodes {
            quantity
            lastAcquiredAt
            token { tokenId contractAddress }
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
      body: JSON.stringify({ query, variables: { address: wallet } }),
    });
    if (!res.ok) return '';
    const body = (await res.json()) as {
      data?: {
        address?: {
          tokensOwned?: {
            nodes?: {
              quantity?: string | number;
              lastAcquiredAt?: string;
              token?: { tokenId?: string; contractAddress?: string };
            }[];
          };
        };
      };
    };
    const parts: string[] = [];
    for (const node of body.data?.address?.tokensOwned?.nodes || []) {
      const col = findByAddr(node.token?.contractAddress);
      const tokenId = tokenIdStr(node.token?.tokenId);
      if (!col || !tokenId) continue;
      parts.push(
        `${col.address}:${tokenId}:${Number(node.quantity) || 1}:${node.lastAcquiredAt || ''}`,
      );
    }
    return parts.join(',');
  } catch {
    return '';
  }
}

async function alchemyTotalCount(
  network: 'eth-mainnet' | 'base-mainnet',
  wallet: string,
  contracts: string[],
): Promise<number> {
  if (!contracts.length) return 0;
  const params = new URLSearchParams({
    owner: wallet,
    withMetadata: 'false',
    pageSize: '1',
  });
  for (const a of contracts) params.append('contractAddresses[]', a);
  const url = `https://${network}.g.alchemy.com/nft/v3/demo/getNFTsForOwner?${params}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return -1;
    const body = (await res.json()) as { totalCount?: number };
    return Number(body.totalCount) || 0;
  } catch {
    return -1;
  }
}

async function fetchAlchemyHoldings(wallet: string): Promise<GardenToken[]> {
  const eth = CONTRACTS.filter((c) => c.chain === 'ethereum').map((c) => c.address);
  const base = CONTRACTS.filter((c) => c.chain === 'base').map((c) => c.address);
  const [ethNfts, baseNfts] = await Promise.all([
    alchemyPages('eth-mainnet', wallet, eth),
    alchemyPages('base-mainnet', wallet, base),
  ]);
  return [...ethNfts, ...baseNfts];
}

async function alchemyPages(
  network: 'eth-mainnet' | 'base-mainnet',
  wallet: string,
  contracts: string[],
): Promise<GardenToken[]> {
  if (!contracts.length) return [];
  const out: GardenToken[] = [];
  let pageKey: string | undefined;
  for (let i = 0; i < 20; i++) {
    const params = new URLSearchParams({
      owner: wallet,
      withMetadata: 'true',
      pageSize: '100',
    });
    for (const a of contracts) params.append('contractAddresses[]', a);
    if (pageKey) params.set('pageKey', pageKey);
    const url = `https://${network}.g.alchemy.com/nft/v3/demo/getNFTsForOwner?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`alchemy ${res.status}`);
    const body = (await res.json()) as {
      pageKey?: string;
      ownedNfts?: {
        tokenId?: string;
        name?: string;
        balance?: string | number;
        tokenBalance?: string | number;
        contractAddress?: string;
        contract?: { address?: string };
        image?: { cachedUrl?: string; originalUrl?: string; pngUrl?: string };
        raw?: { metadata?: { image?: string; name?: string } };
      }[];
    };
    for (const nft of body.ownedNfts || []) {
      const col = findByAddr(nft.contract?.address || nft.contractAddress);
      const tokenId = tokenIdStr(nft.tokenId);
      if (!col || !tokenId) continue;
      const qty = Number(nft.balance ?? nft.tokenBalance ?? 1) || 1;
      const preview =
        nft.image?.cachedUrl ||
        nft.image?.pngUrl ||
        nft.image?.originalUrl ||
        nft.raw?.metadata?.image;
      out.push({
        seriesId: col.seriesId,
        collection: col.label,
        contract: col.address,
        chain: col.chain,
        tokenId,
        name: nft.name || nft.raw?.metadata?.name || `${col.label} #${tokenId}`,
        quantity: qty,
        previewUrl: preview && !preview.startsWith('ipfs://') ? preview : undefined,
      });
    }
    pageKey = body.pageKey || undefined;
    if (!pageKey) break;
  }
  return out;
}
