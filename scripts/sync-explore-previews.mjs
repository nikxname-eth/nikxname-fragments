#!/usr/bin/env node
/**
 * Generate small catalogue previews and upload to R2 (nikxname-assets).
 *
 *   explore/previews/<seriesId>/<workId>.jpg
 *   → https://assets.nikxart.xyz/explore/previews/...
 *
 * Usage:
 *   npm run sync:explore:previews
 *   node scripts/sync-explore-previews.mjs --dry-run
 *   node scripts/sync-explore-previews.mjs --limit=20
 *   node scripts/sync-explore-previews.mjs --force   # re-upload even if CDN has object
 *
 * Requires: sharp (devDep), wrangler auth with R2 write on nikxname-assets.
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
const PREVIEW_PREFIX = 'explore/previews';
const CDN = 'https://assets.nikxart.xyz';
const WIDTH = 480;
const QUALITY = 72;
const DOWNLOAD_MS = 180_000;

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

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

function safeWorkId(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

/** Collapse identical titles → lowest tokenId (matches explore/lib/chainWorks). */
function collapseByEdition(tokens) {
  const map = new Map();
  for (const t of tokens) {
    const key = String(t.name || t.tokenId).trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...t });
    } else if (Number(t.tokenId) < Number(existing.tokenId)) {
      map.set(key, { ...t });
    }
  }
  return [...map.values()].sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
}

function loadCollectionWorks(seriesId) {
  const p = join(ROOT, 'explore/data/collections', `${seriesId}.json`);
  if (!existsSync(p)) return [];
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const tokens = collapseByEdition(j.tokens || []);
  return tokens
    .map((t) => {
      // Prefer still image — never pull full video for catalogue thumbs
      const sourceUrl = resolveUri(t.image || t.mediaUrl);
      if (!sourceUrl) return null;
      const looksVideo =
        t.mediaType === 'video' &&
        !t.image &&
        /\.(mp4|webm|mov)(\?|$)/i.test(sourceUrl);
      if (looksVideo) return null;
      return {
        seriesId,
        workId: `${seriesId}-${t.tokenId}`,
        sourceUrl,
      };
    })
    .filter(Boolean);
}

function loadFragmentWorks() {
  const items = [];
  for (let piece = 1; piece <= 27; piece++) {
    const pad = String(piece).padStart(2, '0');
    const cover =
      piece <= 5
        ? `${CDN}/stageii/releasedfragment${pad}.jpg`
        : `${CDN}/releasedfragment${pad}.jpg`;
    // Prefer CDN width param when available (faster source for resize)
    const sourceUrl =
      piece <= 24
        ? `${cover}?width=960&quality=80&format=auto`
        : cover;
    items.push({
      seriesId: 'a-familiar-burn',
      workId: `fragment-${piece}`,
      sourceUrl,
    });
  }
  return items;
}

function loadPortalWorks() {
  const portrait =
    'https://assets.manifold.xyz/original/7185bec68793d1e8d6fd6c90cd8cb679d23647607064137598a798711958012c.jpg';
  return [
    {
      seriesId: 'market',
      workId: 'market-opensea',
      sourceUrl: `${CDN}/sharepreview.jpg`,
    },
    {
      seriesId: 'market',
      workId: 'market-raster',
      sourceUrl: `${CDN}/sharepreview.jpg`,
    },
    {
      seriesId: 'market',
      workId: 'market-manifold',
      sourceUrl: portrait,
    },
  ];
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
        'User-Agent': 'nikxart-explore-preview-sync/1.1',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('video/')) throw new Error(`skip video content-type ${ct}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 120_000_000) throw new Error(`too large ${buf.length}`);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function makePreview(buf) {
  return sharp(buf, { failOn: 'none' })
    .rotate()
    .resize({ width: WIDTH, height: WIDTH, fit: 'inside', withoutEnlargement: true })
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
  const key = `${PREVIEW_PREFIX}/${item.seriesId}/${safeWorkId(item.workId)}.jpg`;
  const publicUrl = `${CDN}/${key}`;

  if (!force) {
    const exists = await headOk(publicUrl);
    if (exists) return { key, bytes: 0, skipped: true };
  }

  const buf = await download(item.sourceUrl);
  const preview = await makePreview(buf);
  const local = join(tmpDir, `${safeWorkId(item.workId)}.jpg`);
  writeFileSync(local, preview);
  if (!dryRun) {
    r2Put(key, local);
  }
  return { key, bytes: preview.length, skipped: false };
}

async function main() {
  const items = [
    ...loadFragmentWorks(),
    ...loadCollectionWorks('the-void'),
    ...loadCollectionWorks('life-impressions'),
    ...loadCollectionWorks('for-you'),
    ...loadCollectionWorks('for-her'),
    ...loadCollectionWorks('one-of-ones'),
    ...loadPortalWorks(),
  ];

  const byId = new Map();
  for (const i of items) {
    if (!byId.has(`${i.seriesId}/${i.workId}`)) byId.set(`${i.seriesId}/${i.workId}`, i);
  }
  const list = [...byId.values()].slice(0, LIMIT);

  console.log(`Preview sync · ${list.length} works → r2://${BUCKET}/${PREVIEW_PREFIX}/`);
  if (dryRun) console.log('(dry run — no upload)');
  if (force) console.log('(force — re-upload existing)');

  const tmpDir = join(tmpdir(), `nikx-explore-previews-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    try {
      const r = await processOne(item, tmpDir);
      if (r.skipped) {
        skip++;
        if (skip <= 3 || skip % 25 === 0) {
          console.log(`  skip ${r.key}`);
        }
      } else {
        ok++;
        console.log(`  [${ok} up · ${skip} skip · ${i + 1}/${list.length}] ${r.key} (${r.bytes}b)`);
      }
    } catch (e) {
      fail++;
      console.warn(`  ! ${item.workId}: ${e.message}`);
    }
  }

  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log(`\nDone. uploaded=${ok} skipped=${skip} fail=${fail}`);
  console.log(`Public base: ${CDN}/${PREVIEW_PREFIX}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
