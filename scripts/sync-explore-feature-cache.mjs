#!/usr/bin/env node
/**
 * Build HD feature-cache stills for Explore landing rotation.
 *
 *   explore/feature/<seriesId>/<workId>.jpg  (long edge ≥ 1500px)
 *   → https://assets.nikxart.xyz/explore/feature/...
 *
 * Also writes explore/data/feature-cache.json (manifest for the app).
 *
 * Picks 4 works per collection (stable sample).
 *
 * Usage:
 *   npm run sync:explore:feature
 *   node scripts/sync-explore-feature-cache.mjs --dry-run
 *   node scripts/sync-explore-feature-cache.mjs --force
 */
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BUCKET = process.env.R2_BUCKET || 'nikxname-assets';
const FEATURE_PREFIX = 'explore/feature';
const CDN = 'https://assets.nikxart.xyz';
const LONG_EDGE = 1600;
const QUALITY = 86;
const PER_SERIES = 4;
const DOWNLOAD_MS = 180_000;

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('sharp is required: npm install sharp --save-dev');
  process.exit(1);
}

function resolveUri(uri) {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`;
  return uri;
}

function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function loadJson(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** Stable pick of N tokens from a collection (evenly spaced by index). */
function pickEven(tokens, n) {
  if (!tokens?.length) return [];
  if (tokens.length <= n) return tokens.slice();
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (tokens.length - 1)) / (n - 1));
    out.push(tokens[idx]);
  }
  // unique by tokenId
  const seen = new Set();
  return out.filter((t) => {
    const k = t.tokenId ?? t.workId;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function fragmentCoverGif(piece) {
  const pad = String(piece).padStart(2, '0');
  return `${CDN}/Fragments/Fragment-${pad}_Cover.gif`;
}

function fragmentStill(piece) {
  if (piece <= 5) {
    return `${CDN}/stageii/releasedfragment${String(piece).padStart(2, '0')}.jpg`;
  }
  return `${CDN}/releasedfragment${String(piece).padStart(2, '0')}.jpg`;
}

function buildManifestItems() {
  const items = [];

  // A Familiar Burn - 4 released fragments (prefer GIFs as source for still extract)
  const fragmentPieces = [2, 8, 14, 20, 26].filter((p) => p <= 26);
  for (const piece of fragmentPieces.slice(0, PER_SERIES + 1)) {
    const workId = `fragment-${piece}`;
    items.push({
      seriesId: 'a-familiar-burn',
      workId,
      title: `Fragment ${piece}`,
      sourceUrl: fragmentCoverGif(piece),
      fallbackUrl: fragmentStill(piece),
    });
  }

  const collections = [
    'the-void',
    'life-impressions',
    'for-you',
    'for-her',
    'one-of-ones',
  ];

  for (const seriesId of collections) {
    const j = loadJson(`explore/data/collections/${seriesId}.json`);
    if (!j?.tokens?.length) continue;
    // Prefer unique names / lowest token per name for void editions
    const byName = new Map();
    for (const t of j.tokens) {
      const key = String(t.name || t.tokenId).trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, t);
      else if (Number(t.tokenId) < Number(byName.get(key).tokenId)) byName.set(key, t);
    }
    const unique = [...byName.values()].sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
    // 1/1s are few — include all; other series pick evenly
    const picked = seriesId === 'one-of-ones' ? unique : pickEven(unique, PER_SERIES);
    for (const t of picked) {
      const workId = `${seriesId}-${t.tokenId}`;
      // Prefer still poster (never full video for feature still)
      const source = resolveUri(t.image || (t.mediaType === 'image' ? t.mediaUrl : null));
      if (!source) continue;
      items.push({
        seriesId,
        workId,
        title: t.name,
        sourceUrl: source,
        fallbackUrl: null,
      });
    }
  }

  return items;
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function download(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOWNLOAD_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'image/*,*/*',
        'User-Agent': 'nikxart-explore-feature-cache/1.0',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function makeHd(buf) {
  return sharp(buf, { failOn: 'none', animated: false })
    .rotate()
    .resize({
      width: LONG_EDGE,
      height: LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();
}

function r2Put(key, filePath) {
  const cmd = `npx wrangler r2 object put "${BUCKET}/${key}" --file "${filePath}" --content-type image/jpeg --remote`;
  const r = spawnSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    env: process.env,
    timeout: 120_000,
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || `wrangler exit ${r.status}`).slice(0, 400));
  }
}

async function processOne(item, tmpDir) {
  const key = `${FEATURE_PREFIX}/${item.seriesId}/${safeId(item.workId)}.jpg`;
  const publicUrl = `${CDN}/${key}`;

  if (!force && (await headOk(publicUrl))) {
    return { ...item, featureUrl: publicUrl, skipped: true, bytes: 0 };
  }

  let buf;
  try {
    buf = await download(item.sourceUrl);
  } catch (e) {
    if (item.fallbackUrl) {
      buf = await download(item.fallbackUrl);
    } else {
      throw e;
    }
  }

  const hd = await makeHd(buf);
  const local = join(tmpDir, `${safeId(item.workId)}.jpg`);
  writeFileSync(local, hd);
  if (!dryRun) r2Put(key, local);
  return { ...item, featureUrl: publicUrl, skipped: false, bytes: hd.length };
}

async function main() {
  const items = buildManifestItems();
  console.log(`Feature cache · ${items.length} works → r2://${BUCKET}/${FEATURE_PREFIX}/`);
  if (dryRun) console.log('(dry run - no upload)');

  const tmpDir = join(tmpdir(), `nikx-feature-cache-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  const manifest = {
    version: 1,
    longEdge: LONG_EDGE,
    fetchedAt: new Date().toISOString(),
    prefix: FEATURE_PREFIX,
    publicBase: `${CDN}/${FEATURE_PREFIX}/`,
    items: [],
  };

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const item of items) {
    try {
      const r = await processOne(item, tmpDir);
      if (r.skipped) {
        skip++;
        console.log(`  skip ${r.featureUrl}`);
      } else {
        ok++;
        console.log(`  up ${r.workId} (${r.bytes}b)`);
      }
      manifest.items.push({
        seriesId: r.seriesId,
        workId: r.workId,
        title: r.title,
        featureUrl: r.featureUrl,
      });
    } catch (e) {
      fail++;
      console.warn(`  ! ${item.workId}: ${e.message}`);
    }
  }

  const outPath = join(ROOT, 'explore/data/feature-cache.json');
  if (!dryRun) {
    writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Wrote ${outPath} (${manifest.items.length} entries)`);
  }

  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log(`\nDone. uploaded=${ok} skipped=${skip} fail=${fail}`);
  console.log(`Public base: ${CDN}/${FEATURE_PREFIX}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
