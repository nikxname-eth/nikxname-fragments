#!/usr/bin/env node
/**
 * Flutter Into The Embers media:
 *   real Cover.gif → optimized 560px 24fps GIF (lazy catalogue)
 *   5k HEVC master → Full HD H.264 24fps (1920 long edge)
 *
 *   node scripts/prep-embers-media.mjs
 *   node scripts/prep-embers-media.mjs --skip-upload
 *   node scripts/prep-embers-media.mjs --force
 */
import { spawn } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC =
  process.env.EMBERS_FINALS ||
  join(process.env.HOME || '', 'Desktop/FLUTTER INTO THE EMBERS-Finals');
const OUT = join(ROOT, 'explore/.cache/embers-media');
const PUBLIC_COVERS = join(ROOT, 'explore/public/embers/covers');
const TOKENS_PATH = join(ROOT, 'explore/data/embers-tokens.json');
const MANIFEST = join(ROOT, 'explore/data/media-cache.json');
const BUCKET = process.env.R2_BUCKET || 'nikxname-assets';
const CDN = 'https://assets.nikxart.xyz';
const PREFIX = 'explore/media/a-familiar-burn';

const skipUpload = process.argv.includes('--skip-upload');
const force = process.argv.includes('--force');

const FILE_BY_ID = {
  'after-black': 'Afterblack',
  'coal-pink': 'CoalPink',
  'cloaked-burgandy': 'CloakedBurgundy',
  corten: 'Corten',
  oxide: 'Oxide',
  garnet: 'Garnet',
  cardinal: 'Cardinal',
  signal: 'Signal',
  vermillion: 'Vermillion',
  'burnt-tangerine': 'BurntTangerine',
  napalm: 'Napalm',
  afterburn: 'Afterburn',
  'spicy-apricot': 'SpicyApricot',
  'peach-ember': 'PeachEmber',
  rosedust: 'Rosedust',
  'coral-veil': 'CoralVeil',
  watermelon: 'TORCHED',
  'dusted-pink': 'DustedPink',
  shell: 'Shell',
  'x-ray': 'xray',
  porcelain: 'Porcelain',
};

function run(cmd, args, timeoutMs = 8 * 60_000, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'], cwd });
    let err = '';
    const t = setTimeout(() => {
      p.kill('SIGKILL');
      reject(new Error(`${cmd} timed out`));
    }, timeoutMs);
    p.stderr.on('data', (d) => {
      err += d;
    });
    p.on('error', reject);
    p.on('close', (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error((err || `${cmd} exit ${code}`).slice(-800)));
    });
  });
}

function r2Put(key, filePath, contentType) {
  return run(
    'npx',
    [
      'wrangler',
      'r2',
      'object',
      'put',
      `${BUCKET}/${key}`,
      '--file',
      filePath,
      '--content-type',
      contentType,
      '--remote',
    ],
    10 * 60_000,
  );
}

function sourcePaths(emberId) {
  const stem = FILE_BY_ID[emberId];
  if (!stem) throw new Error(`no local file for ${emberId}`);
  const video = join(SRC, `FlutterIntoTheEmbers-${stem}.mp4`);
  const gif = join(SRC, `FlutterIntoTheEmbers-${stem}-Cover.gif`);
  const still = join(SRC, `FlutterIntoTheEmbers-${stem}.jpg`);
  return {
    video: existsSync(video) ? video : null,
    gif: existsSync(gif) ? gif : null,
    still: existsSync(still) ? still : null,
  };
}

async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return out;
}

/** Real cover GIF, scaled and paletted — stays a GIF. */
function optimizeCoverGif(input, output) {
  const vf =
    'fps=24,scale=560:560:flags=lanczos:force_original_aspect_ratio=decrease,' +
    'pad=560:560:(ow-iw)/2:(oh-ih)/2:black,split[s0][s1];' +
    '[s0]palettegen=max_colors=128:stats_mode=full[p];' +
    '[s1][p]paletteuse=dither=bayer:bayer_scale=4';
  return run('ffmpeg', ['-y', '-i', input, '-vf', vf, '-loop', '0', output]);
}

function stillToCoverGif(input, output) {
  const vf =
    'fps=24,scale=560:560:flags=lanczos:force_original_aspect_ratio=decrease,' +
    'pad=560:560:(ow-iw)/2:(oh-ih)/2:black,split[s0][s1];' +
    '[s0]palettegen=max_colors=128:stats_mode=full[p];' +
    '[s1][p]paletteuse=dither=bayer:bayer_scale=4';
  return run('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-t',
    '0.5',
    '-i',
    input,
    '-vf',
    vf,
    '-loop',
    '0',
    output,
  ]);
}

/** Full HD: 1920 on the long edge, even dimensions, 24fps. */
function encodeFhd(input, output) {
  return run('ffmpeg', [
    '-y',
    '-i',
    input,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '24',
    '-movflags',
    '+faststart',
    '-vf',
    "scale='if(gte(iw,ih),1920,-2)':'if(gt(ih,iw),1920,-2)':flags=lanczos",
    output,
  ]);
}

async function encodeStill1080(input, output) {
  await sharp(input, { failOn: 'none', limitInputPixels: false })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(output);
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`Finals folder missing: ${SRC}`);
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUBLIC_COVERS, { recursive: true });

  const file = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));

  const results = await mapPool(file.tokens, 3, async (t) => {
    const src = sourcePaths(t.emberId);
    const coverOut = join(OUT, `${t.emberId}-cover.gif`);
    const mp4Out = join(OUT, `${t.emberId}-fhd.mp4`);
    const stillOut = join(OUT, `${t.emberId}-fhd.jpg`);
    const coverPublic = join(PUBLIC_COVERS, `${t.emberId}.gif`);

    if (!src.gif && !src.still && !src.video) throw new Error(`no source for ${t.emberId}`);

    if (force || !existsSync(coverOut)) {
      if (src.gif) {
        console.log(`  cover gif ${t.emberId}`);
        await optimizeCoverGif(src.gif, coverOut);
      } else if (src.still) {
        console.log(`  cover gif from still ${t.emberId}`);
        await stillToCoverGif(src.still, coverOut);
      } else {
        console.log(`  cover gif from video ${t.emberId}`);
        await optimizeCoverGif(src.video, coverOut);
      }
    }
    copyFileSync(coverOut, coverPublic);

    let media1080 = null;
    let mediaType = t.mediaType;
    if (src.video) {
      if (force || !existsSync(mp4Out)) {
        console.log(`  FHD 1920 ${t.emberId}`);
        await encodeFhd(src.video, mp4Out);
      } else {
        console.log(`  skip FHD ${t.emberId}`);
      }
      media1080 = mp4Out;
      mediaType = 'video';
    } else if (src.still) {
      if (force || !existsSync(stillOut)) {
        console.log(`  FHD still ${t.emberId}`);
        await encodeStill1080(src.still, stillOut);
      }
      media1080 = stillOut;
      mediaType = 'image';
    }

    return { token: t, media1080, mediaType, coverOut };
  });

  const cdnBase = `${CDN}/${PREFIX}`;
  for (const t of file.tokens) {
    const hit = results.find((r) => r.token.tokenId === t.tokenId);
    t.coverGif = `${cdnBase}/embers-${t.emberId}-cover.gif`;
    t.localCover = `/embers/covers/${t.emberId}.gif`;
    t.media1080 =
      hit?.mediaType === 'video'
        ? `${cdnBase}/embers-${t.emberId}-fhd.mp4`
        : `${cdnBase}/embers-${t.emberId}-fhd.jpg`;
    t.posterUrl = t.coverGif;
  }
  writeFileSync(TOKENS_PATH, JSON.stringify(file, null, 2) + '\n');
  console.log(`  wrote ${TOKENS_PATH}`);

  const prev = existsSync(MANIFEST)
    ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
    : { version: 1, publicBase: `${CDN}/explore/media`, items: [] };
  const byKey = new Map((prev.items || []).map((e) => [`${e.seriesId}/${e.workId}`, e]));
  for (const t of file.tokens) {
    const workId = `a-familiar-burn-${t.tokenId}`;
    const hit = results.find((r) => r.token.tokenId === t.tokenId);
    byKey.set(`a-familiar-burn/${workId}`, {
      seriesId: 'a-familiar-burn',
      workId,
      mediaUrl: t.media1080,
      mediaType: hit?.mediaType === 'video' ? 'video' : 'image',
      posterUrl: t.coverGif,
    });
  }
  const manifest = {
    ...prev,
    fetchedAt: new Date().toISOString(),
    items: [...byKey.values()].sort((a, b) =>
      `${a.seriesId}/${a.workId}`.localeCompare(`${b.seriesId}/${b.workId}`),
    ),
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`  wrote ${MANIFEST} (${manifest.items.length} items)`);

  if (skipUpload) {
    console.log('skip upload');
    return;
  }

  for (const r of results) {
    const id = r.token.emberId;
    console.log(`  upload ${id}`);
    await r2Put(`${PREFIX}/embers-${id}-cover.gif`, r.coverOut, 'image/gif');
    if (r.mediaType === 'video') {
      await r2Put(`${PREFIX}/embers-${id}-fhd.mp4`, r.media1080, 'video/mp4');
    } else if (r.media1080) {
      await r2Put(`${PREFIX}/embers-${id}-fhd.jpg`, r.media1080, 'image/jpeg');
    }
  }

  console.log(`Done. ${results.length} embers → r2://${BUCKET}/${PREFIX}/`);
  console.log('local covers', readdirSync(PUBLIC_COVERS).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
