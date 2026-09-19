#!/usr/bin/env node
/**
 * Rehost Explore Theatre media (esp. video 1/1s + huge stills) to R2.
 *
 *   explore/media/<seriesId>/<workId>.mp4   (video)
 *   explore/media/<seriesId>/<workId>.jpg   (still)
 *   → https://assets.nikxart.xyz/explore/media/...
 *
 * Writes explore/data/media-cache.json so the app prefers CDN media in Theatre.
 * Catalogue thumbs still come from explore/previews (separate script).
 *
 * Usage:
 *   npm run sync:explore:media
 *   node scripts/sync-explore-media.mjs --dry-run
 *   node scripts/sync-explore-media.mjs --force
 *   node scripts/sync-explore-media.mjs one-of-ones
 */
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BUCKET = process.env.R2_BUCKET || 'nikxname-assets';
const MEDIA_PREFIX = 'explore/media';
const CDN = 'https://assets.nikxart.xyz';
const MANIFEST = join(ROOT, 'explore/data/media-cache.json');
const DOWNLOAD_MS = 10 * 60_000;
const STILL_LONG_EDGE = 2400;
const STILL_QUALITY = 88;

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));

/** Prefer CDN Theatre media for series with large Arweave masters */
const DEFAULT_SERIES = ['one-of-ones', 'for-you', 'the-void'];

let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
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

function loadCollection(seriesId) {
  const p = join(ROOT, 'explore/data/collections', `${seriesId}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function downloadToFile(url, dest) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOWNLOAD_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'nikxart-explore-media-sync/1.0', Accept: '*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error('empty body');
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return dest;
  } finally {
    clearTimeout(timer);
  }
}

function hasFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return r.status === 0;
}

/** Transcode / remux to browser-friendly H.264 MP4 */
function toMp4(inputPath, outputPath) {
  const args = [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-vf',
    "scale='min(1920,iw)':'-2'",
    outputPath,
  ];
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8', timeout: 15 * 60_000 });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || `ffmpeg exit ${r.status}`).slice(-600));
  }
}

function r2Put(key, filePath, contentType = 'video/mp4') {
  const cmd = `npx wrangler r2 object put "${BUCKET}/${key}" --file "${filePath}" --content-type "${contentType}" --remote`;
  const r = spawnSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    env: process.env,
    timeout: 10 * 60_000,
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || `wrangler exit ${r.status}`).slice(0, 500));
  }
}

function collectWorks(seriesId) {
  const col = loadCollection(seriesId);
  if (!col?.tokens?.length) return [];
  return col.tokens
    .map((t) => {
      const workId = `${seriesId}-${t.tokenId}`;
      const posterUrl = resolveUri(t.image);
      if (t.mediaType === 'video' && (t.animationUrl || t.mediaUrl)) {
        return {
          seriesId,
          workId,
          tokenId: t.tokenId,
          title: t.name,
          kind: 'video',
          sourceUrl: resolveUri(t.animationUrl || t.mediaUrl),
          posterUrl,
        };
      }
      // Rehost stills (1/1 masters are often multi‑10MB PNGs)
      const still = resolveUri(t.image || t.mediaUrl);
      if (!still) return null;
      return {
        seriesId,
        workId,
        tokenId: t.tokenId,
        title: t.name,
        kind: 'image',
        sourceUrl: still,
        posterUrl: still,
      };
    })
    .filter(Boolean);
}

async function processVideo(item, tmpDir, ffmpegOk) {
  const key = `${MEDIA_PREFIX}/${item.seriesId}/${safeId(item.workId)}.mp4`;
  const publicUrl = `${CDN}/${key}`;

  if (!force && (await headOk(publicUrl))) {
    return {
      seriesId: item.seriesId,
      workId: item.workId,
      mediaUrl: publicUrl,
      mediaType: 'video',
      posterUrl: item.posterUrl,
      skipped: true,
    };
  }

  if (dryRun) {
    console.log(`  dry-run video ${key} ← ${item.sourceUrl}`);
    return {
      seriesId: item.seriesId,
      workId: item.workId,
      mediaUrl: publicUrl,
      mediaType: 'video',
      posterUrl: item.posterUrl,
      skipped: true,
    };
  }

  const rawPath = join(tmpDir, `${safeId(item.workId)}.src`);
  const mp4Path = join(tmpDir, `${safeId(item.workId)}.mp4`);
  console.log(`  download video ${item.title}…`);
  await downloadToFile(item.sourceUrl, rawPath);

  if (!ffmpegOk) throw new Error('ffmpeg required to rehost video as mp4');
  console.log(`  transcode → mp4…`);
  toMp4(rawPath, mp4Path);
  console.log(`  upload r2://${BUCKET}/${key}`);
  r2Put(key, mp4Path, 'video/mp4');

  return {
    seriesId: item.seriesId,
    workId: item.workId,
    mediaUrl: publicUrl,
    mediaType: 'video',
    posterUrl: item.posterUrl,
    skipped: false,
  };
}

async function processStill(item, tmpDir) {
  const key = `${MEDIA_PREFIX}/${item.seriesId}/${safeId(item.workId)}.jpg`;
  const publicUrl = `${CDN}/${key}`;

  if (!force && (await headOk(publicUrl))) {
    return {
      seriesId: item.seriesId,
      workId: item.workId,
      mediaUrl: publicUrl,
      mediaType: 'image',
      posterUrl: publicUrl,
      skipped: true,
    };
  }

  if (dryRun) {
    console.log(`  dry-run still ${key} ← ${item.sourceUrl}`);
    return {
      seriesId: item.seriesId,
      workId: item.workId,
      mediaUrl: publicUrl,
      mediaType: 'image',
      posterUrl: publicUrl,
      skipped: true,
    };
  }

  if (!sharp) throw new Error('sharp required to rehost stills');

  console.log(`  download still ${item.title}…`);
  const res = await fetch(item.sourceUrl, {
    headers: { 'User-Agent': 'nikxart-explore-media-sync/1.0', Accept: 'image/*,*/*' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = await sharp(buf, { failOn: 'none', limitInputPixels: false })
    .rotate()
    .resize({
      width: STILL_LONG_EDGE,
      height: STILL_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: STILL_QUALITY, mozjpeg: true })
    .toBuffer();

  const local = join(tmpDir, `${safeId(item.workId)}.jpg`);
  writeFileSync(local, out);
  console.log(`  upload r2://${BUCKET}/${key} (${out.length}b)`);
  r2Put(key, local, 'image/jpeg');

  return {
    seriesId: item.seriesId,
    workId: item.workId,
    mediaUrl: publicUrl,
    mediaType: 'image',
    posterUrl: publicUrl,
    skipped: false,
  };
}

async function processOne(item, tmpDir, ffmpegOk) {
  if (item.kind === 'video') return processVideo(item, tmpDir, ffmpegOk);
  return processStill(item, tmpDir);
}

async function main() {
  const seriesList = only.length ? only : DEFAULT_SERIES;
  const items = seriesList.flatMap((id) => collectWorks(id));

  console.log(`Media sync · ${items.length} work(s) → r2://${BUCKET}/${MEDIA_PREFIX}/`);
  if (dryRun) console.log('(dry run — no upload)');
  if (force) console.log('(force — re-upload existing)');

  const ffmpegOk = hasFfmpeg();
  if (!ffmpegOk) console.warn('! ffmpeg not found — video rehost will fail');
  if (!sharp) console.warn('! sharp not found — still rehost will fail');

  const tmpDir = join(tmpdir(), `nikx-explore-media-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  const prev = existsSync(MANIFEST)
    ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
    : { version: 1, publicBase: `${CDN}/${MEDIA_PREFIX}`, items: [] };
  const byKey = new Map((prev.items || []).map((e) => [`${e.seriesId}/${e.workId}`, e]));

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const item of items) {
    try {
      const r = await processOne(item, tmpDir, ffmpegOk);
      byKey.set(`${r.seriesId}/${r.workId}`, {
        seriesId: r.seriesId,
        workId: r.workId,
        mediaUrl: r.mediaUrl,
        mediaType: r.mediaType,
        posterUrl: r.posterUrl,
      });
      if (r.skipped) skip++;
      else ok++;
    } catch (e) {
      fail++;
      console.warn(`  ! ${item.workId}: ${e.message}`);
    }
  }

  const manifest = {
    version: 1,
    publicBase: `${CDN}/${MEDIA_PREFIX}`,
    fetchedAt: new Date().toISOString(),
    items: [...byKey.values()].sort((a, b) =>
      `${a.seriesId}/${a.workId}`.localeCompare(`${b.seriesId}/${b.workId}`),
    ),
  };

  if (!dryRun) {
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`  wrote ${MANIFEST} (${manifest.items.length} items)`);
  }

  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log(`\nDone. uploaded=${ok} skipped=${skip} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
