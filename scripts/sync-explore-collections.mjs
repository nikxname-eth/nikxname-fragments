#!/usr/bin/env node
/**
 * Fetch ERC-721 / ERC-1155 catalogs for Explore on-chain collections.
 * Writes explore/data/collections/<seriesId>.json
 *
 * Usage:
 *   npm run sync:explore
 *   node scripts/sync-explore-collections.mjs for-her
 *   node scripts/sync-explore-collections.mjs the-void life-impressions
 */
import { createPublicClient, http, parseAbi } from 'viem';
import { mainnet, base } from 'viem/chains';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'explore/data/collections');

/** Keep in sync with explore/config/collections.ts */
const ON_CHAIN_COLLECTIONS = [
  {
    seriesId: 'the-void',
    label: 'The Void',
    address: '0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    standard: 'erc721',
    chain: 'ethereum',
    scanMaxId: 200,
  },
  {
    seriesId: 'life-impressions',
    label: 'Life Impressions',
    address: '0xb00b42b5baa62f6ce800fb919b3d090b51c4463c',
    standard: 'erc721',
    chain: 'ethereum',
    scanMaxId: 200,
  },
  {
    seriesId: 'for-you',
    label: 'For You..',
    address: '0x5174ed5f363ef4df2823f42be54de5fd61294e49',
    standard: 'erc1155',
    chain: 'ethereum',
    scanMaxId: 100,
  },
  {
    seriesId: 'for-her',
    label: 'For Her..',
    address: '0x9813ff20c99525922b3538fce8c2c9e5db93866c',
    standard: 'erc1155',
    chain: 'base',
    scanMaxId: 100,
  },
  {
    seriesId: 'a-familiar-burn',
    label: 'A Familiar Burn',
    address: '0x1641b09e11d19e6f6b9f80273158f9da28555593',
    standard: 'erc721',
    chain: 'ethereum',
    scanMaxId: 1500,
  },
];

const CHAINS = {
  ethereum: {
    chainId: 1,
    chain: mainnet,
    rpc: process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com',
    openSea: 'ethereum',
  },
  base: {
    chainId: 8453,
    chain: base,
    rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    openSea: 'base',
  },
};

const clients = {};
function getClient(chainKey) {
  if (!clients[chainKey]) {
    const cfg = CHAINS[chainKey];
    if (!cfg) throw new Error(`Unknown chain: ${chainKey}`);
    clients[chainKey] = createPublicClient({
      chain: cfg.chain,
      transport: http(cfg.rpc),
      batch: { multicall: true },
    });
  }
  return clients[chainKey];
}

const abi721 = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
]);

const abi1155 = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function uri(uint256 id) view returns (string)',
]);

function resolveTokenUri(uri) {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`;
  return uri;
}

function expand1155Uri(uri, id) {
  if (!uri) return uri;
  if (uri.includes('{id}')) {
    const hex = BigInt(id).toString(16).padStart(64, '0');
    return uri.replace(/\{id\}/gi, hex);
  }
  return uri;
}

function inferMediaType(url) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'image';
}

async function findExisting721Ids(client, address, scanMax) {
  const existing = [];
  const BATCH = 50;
  let emptyStreak = 0;
  for (let start = 1; start <= scanMax; start += BATCH) {
    const chunk = [];
    for (let id = start; id < start + BATCH && id <= scanMax; id++) chunk.push(id);
    const batch = await client.multicall({
      contracts: chunk.map((id) => ({
        address,
        abi: abi721,
        functionName: 'ownerOf',
        args: [BigInt(id)],
      })),
      allowFailure: true,
    });
    let foundInBatch = 0;
    batch.forEach((row, j) => {
      if (row.status === 'success') {
        existing.push(chunk[j]);
        foundInBatch++;
      }
    });
    if (foundInBatch === 0) emptyStreak += chunk.length;
    else emptyStreak = 0;
    if (existing.length > 0 && emptyStreak >= 100) break;
  }
  return existing;
}

async function findExisting1155Ids(client, address, scanMax) {
  const existing = [];
  const BATCH = 40;
  let emptyStreak = 0;
  for (let start = 1; start <= scanMax; start += BATCH) {
    const chunk = [];
    for (let id = start; id < start + BATCH && id <= scanMax; id++) chunk.push(id);
    const batch = await client.multicall({
      contracts: chunk.map((id) => ({
        address,
        abi: abi1155,
        functionName: 'uri',
        args: [BigInt(id)],
      })),
      allowFailure: true,
    });
    let foundInBatch = 0;
    batch.forEach((row, j) => {
      if (row.status === 'success' && typeof row.result === 'string' && row.result.length > 0) {
        existing.push({ tokenId: chunk[j], tokenUri: expand1155Uri(row.result, chunk[j]) });
        foundInBatch++;
      }
    });
    if (foundInBatch === 0) emptyStreak += chunk.length;
    else emptyStreak = 0;
    if (existing.length > 0 && emptyStreak >= 40) break;
  }
  return existing;
}

async function fetch721Uris(client, address, ids) {
  const results = [];
  const BATCH = 40;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const batch = await client.multicall({
      contracts: chunk.map((id) => ({
        address,
        abi: abi721,
        functionName: 'tokenURI',
        args: [BigInt(id)],
      })),
      allowFailure: true,
    });
    batch.forEach((row, j) => {
      if (row.status === 'success' && typeof row.result === 'string') {
        results.push({ tokenId: chunk[j], tokenUri: row.result });
      }
    });
  }
  return results;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()));
  return out;
}

async function syncCollection(entry) {
  const address = entry.address;
  const chainKey = entry.chain || 'ethereum';
  const chainCfg = CHAINS[chainKey];
  const client = getClient(chainKey);

  console.log(`\n→ ${entry.label} (${address}) [${entry.standard}] @ ${chainKey}`);

  const code = await client.getBytecode({ address });
  if (!code || code === '0x') {
    console.warn(`  ! no contract bytecode on ${chainKey} — skipping`);
    return null;
  }

  let name = entry.label;
  let symbol = '';
  const nameAbi = entry.standard === 'erc1155' ? abi1155 : abi721;
  try {
    name = await client.readContract({ address, abi: nameAbi, functionName: 'name' });
  } catch {
    /* keep label */
  }
  try {
    symbol = await client.readContract({ address, abi: nameAbi, functionName: 'symbol' });
  } catch {
    /* optional */
  }

  let uris = [];
  if (entry.standard === 'erc1155') {
    uris = await findExisting1155Ids(client, address, entry.scanMaxId ?? 100);
    console.log(`  1155 uris: ${uris.length}`);
  } else {
    const ids = await findExisting721Ids(client, address, entry.scanMaxId ?? 500);
    console.log(`  721 existing: ${ids.length}${ids.length ? ` (max ${ids[ids.length - 1]})` : ''}`);
    uris = await fetch721Uris(client, address, ids);
    console.log(`  tokenURI ok: ${uris.length}`);
  }

  const tokens = await mapPool(uris, 10, async ({ tokenId, tokenUri }) => {
    const resolved = resolveTokenUri(tokenUri);
    try {
      const json = await fetchJson(resolved);
      const animationRaw = json.animation_url ?? json.animationUrl;
      const imageRaw = json.image ?? json.image_url ?? '';
      const animationUrl = animationRaw ? resolveTokenUri(String(animationRaw)) : undefined;
      const image = imageRaw ? resolveTokenUri(String(imageRaw)) : '';
      const mediaUrl = animationUrl || image;
      return {
        tokenId,
        name: (json.name || `Token #${tokenId}`).trim(),
        description: typeof json.description === 'string' ? json.description : undefined,
        image,
        animationUrl,
        mediaUrl,
        mediaType: animationUrl ? 'video' : inferMediaType(image),
        tokenUri: resolved,
      };
    } catch (e) {
      console.warn(`  ! metadata fail #${tokenId}: ${e.message}`);
      return null;
    }
  });

  const works = tokens.filter(Boolean).sort((a, b) => a.tokenId - b.tokenId);

  const byName = new Map();
  for (const t of works) {
    const key = t.name.trim().toLowerCase();
    byName.set(key, (byName.get(key) || 0) + 1);
  }
  for (const t of works) {
    t.editionCount = byName.get(t.name.trim().toLowerCase()) || 1;
  }

  const payload = {
    seriesId: entry.seriesId,
    label: entry.label,
    contract: address,
    standard: entry.standard,
    chain: chainKey,
    name,
    symbol,
    chainId: chainCfg.chainId,
    openSeaSlug: chainCfg.openSea,
    fetchedAt: new Date().toISOString(),
    count: works.length,
    tokens: works,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${entry.seriesId}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`  wrote ${outPath} (${works.length} tokens)`);
  return payload;
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const list = only.length
    ? ON_CHAIN_COLLECTIONS.filter((c) => only.includes(c.seriesId))
    : ON_CHAIN_COLLECTIONS;

  if (!list.length) {
    console.error('No matching collections. Known:', ON_CHAIN_COLLECTIONS.map((c) => c.seriesId).join(', '));
    process.exit(1);
  }

  console.log('Syncing Explore on-chain collections…');
  for (const entry of list) {
    await syncCollection(entry);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
