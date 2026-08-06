#!/usr/bin/env node
/**
 * Fetch ERC-721 catalogs for Explore on-chain collections.
 * Writes explore/data/collections/<seriesId>.json
 *
 * Usage: node scripts/sync-explore-collections.mjs
 *        npm run sync:explore
 */
import { createPublicClient, http, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'explore/data/collections');

/** Mirrors explore/config/collections.ts — keep in sync when adding contracts. */
const ON_CHAIN_COLLECTIONS = [
  {
    seriesId: 'the-void',
    label: 'The Void',
    address: '0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    scanMaxId: 500,
  },
];

const RPC = process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com';

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC),
  batch: { multicall: true },
});

const abi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
]);

function resolveTokenUri(uri) {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`;
  return uri;
}

function inferMediaType(url) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'image';
}

async function ownerExists(address, id) {
  try {
    await client.readContract({
      address,
      abi,
      functionName: 'ownerOf',
      args: [BigInt(id)],
    });
    return true;
  } catch {
    return false;
  }
}

async function tryTotalSupply(address) {
  try {
    const n = await client.readContract({ address, abi, functionName: 'totalSupply' });
    return Number(n);
  } catch {
    return null;
  }
}

/** Scan a range of token ids via multicall (handles sparse / non-enumerable collections). */
async function findExistingTokenIds(address, scanMax) {
  const existing = [];
  const BATCH = 50;
  for (let start = 1; start <= scanMax; start += BATCH) {
    const chunk = [];
    for (let id = start; id < start + BATCH && id <= scanMax; id++) chunk.push(id);
    const batch = await client.multicall({
      contracts: chunk.map((id) => ({
        address,
        abi,
        functionName: 'ownerOf',
        args: [BigInt(id)],
      })),
      allowFailure: true,
    });
    batch.forEach((row, j) => {
      if (row.status === 'success') existing.push(chunk[j]);
    });
    // Early stop after a long empty tail (saves RPC for huge scanMax)
    if (chunk[chunk.length - 1] > 20 && existing.length > 0) {
      const lastExisting = existing[existing.length - 1];
      if (chunk[0] > lastExisting + 80) break;
    }
  }
  return existing;
}

async function fetchTokenUris(address, ids) {
  const results = [];
  const BATCH = 40;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const batch = await client.multicall({
      contracts: chunk.map((id) => ({
        address,
        abi,
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
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

async function syncCollection(entry) {
  const address = entry.address;
  console.log(`\n→ ${entry.label} (${address})`);

  let name = entry.label;
  let symbol = '';
  try {
    name = await client.readContract({ address, abi, functionName: 'name' });
  } catch {
    /* keep label */
  }
  try {
    symbol = await client.readContract({ address, abi, functionName: 'symbol' });
  } catch {
    /* optional */
  }

  const supply = await tryTotalSupply(address);
  const scanMax = Math.max(entry.scanMaxId ?? 500, supply ? supply + 50 : 0);
  // Always scan by ownerOf — collections may be sparse (gaps in token ids)
  let ids = await findExistingTokenIds(address, scanMax);
  if (ids.length === 0 && supply && supply > 0) {
    ids = Array.from({ length: supply }, (_, i) => i + 1);
  }
  console.log(
    `  totalSupply=${supply ?? 'n/a'}, scanned 1–${scanMax}, existing=${ids.length}` +
      (ids.length ? ` (max id ${ids[ids.length - 1]})` : ''),
  );

  const uris = await fetchTokenUris(address, ids);
  console.log(`  tokenURI ok: ${uris.length}`);

  const tokens = await mapPool(uris, 8, async ({ tokenId, tokenUri }) => {
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
        name: json.name || `Token #${tokenId}`,
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

  const payload = {
    seriesId: entry.seriesId,
    label: entry.label,
    contract: address,
    name,
    symbol,
    chainId: 1,
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
  console.log('Syncing Explore on-chain collections…');
  console.log('RPC', RPC);
  for (const entry of ON_CHAIN_COLLECTIONS) {
    await syncCollection(entry);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
