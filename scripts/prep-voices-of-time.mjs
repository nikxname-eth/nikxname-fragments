#!/usr/bin/env node
/**
 * Voices Of Time — cover GIFs in public/, 1080p H.264 + look GIFs on R2.
 *
 *   node scripts/prep-voices-of-time.mjs
 *   node scripts/prep-voices-of-time.mjs --skip-upload
 */
import { spawn } from 'child_process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(process.env.HOME || '', 'Desktop/VoicesOfTime');
const OUT = join(ROOT, 'explore/.cache/voices-of-time');
const PUBLIC = join(ROOT, 'explore/public/voices-of-time');
const BUCKET = process.env.R2_BUCKET || 'nikxname-assets';
const PREFIX = 'explore/media/a-familiar-burn';
const skipUpload = process.argv.includes('--skip-upload');
const force = process.argv.includes('--force');

function run(cmd, args, timeoutMs = 12 * 60_000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
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
      else reject(new Error((err || `${cmd} exit ${code}`).slice(-1200)));
    });
  });
}

function r2Put(key, filePath, contentType) {
  return run('npx', [
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
  ]);
}

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

function encodeLookGif(input, output) {
  const vf =
    'fps=12,scale=2048:2048:flags=lanczos:force_original_aspect_ratio=decrease,' +
    'pad=2048:2048:(ow-iw)/2:(oh-ih)/2:black,split[s0][s1];' +
    '[s0]palettegen=max_colors=160:stats_mode=full[p];' +
    '[s1][p]paletteuse=dither=bayer:bayer_scale=4';
  return run('ffmpeg', ['-y', '-i', input, '-vf', vf, '-loop', '0', output]);
}

async function stillWebp(input, output, size) {
  await sharp(input, { failOn: 'none', limitInputPixels: false })
    .rotate()
    .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`Missing ${SRC}`);
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUBLIC, { recursive: true });

  const devilCover = join(SRC, 'DEVIL/Devil-cover.gif');
  const haloCover = join(SRC, 'ANGEL/Halo-cover.gif');
  copyFileSync(devilCover, join(PUBLIC, 'devil-cover.gif'));
  copyFileSync(haloCover, join(PUBLIC, 'halo-cover.gif'));

  const unrevealedIn = join(SRC, 'Panel-Unrevealed-middlle.jpg');
  const unrevealedOut = join(PUBLIC, 'unrevealed.webp');
  if (force || !existsSync(unrevealedOut)) {
    console.log('  unrevealed webp');
    await stillWebp(unrevealedIn, unrevealedOut, 1600);
  }

  const devilStill = join(PUBLIC, 'devil-still.webp');
  const haloStill = join(PUBLIC, 'halo-still.webp');
  if (force || !existsSync(devilStill)) {
    console.log('  devil still');
    await stillWebp(join(SRC, 'DEVIL/Devil01.png'), devilStill, 1600);
  }
  if (force || !existsSync(haloStill)) {
    console.log('  halo still');
    await stillWebp(join(SRC, 'ANGEL/Halo01.png'), haloStill, 1600);
  }

  const devilMp4 = join(OUT, 'voices-devil-1080.mp4');
  const haloMp4 = join(OUT, 'voices-halo-1080.mp4');
  if (force || !existsSync(devilMp4)) {
    console.log('  devil 1080 H.264');
    await encodeFhd(join(SRC, 'DEVIL/Devil.mp4'), devilMp4);
  }
  if (force || !existsSync(haloMp4)) {
    console.log('  halo 1080 H.264');
    await encodeFhd(join(SRC, 'ANGEL/Halo-1.mp4'), haloMp4);
  }

  const devilLook = join(OUT, 'voices-devil-look.gif');
  const haloLook = join(OUT, 'voices-halo-look.gif');
  if (force || !existsSync(devilLook)) {
    console.log('  devil look gif 2048');
    await encodeLookGif(join(SRC, 'DEVIL/Devil-full.gif'), devilLook);
  }
  if (force || !existsSync(haloLook)) {
    console.log('  halo look gif 2048');
    await encodeLookGif(join(SRC, 'ANGEL/Halo-full.gif'), haloLook);
  }

  const share = join(PUBLIC, 'share.jpg');
  if (force || !existsSync(share)) {
    console.log('  share triptych');
    const [d, m, a] = await Promise.all([
      sharp(join(PUBLIC, 'devil-still.webp')).resize(800, 800, { fit: 'cover' }).toBuffer(),
      sharp(unrevealedOut).resize(800, 800, { fit: 'cover' }).toBuffer(),
      sharp(join(PUBLIC, 'halo-still.webp')).resize(800, 800, { fit: 'cover' }).toBuffer(),
    ]);
    await sharp({
      create: { width: 2400, height: 800, channels: 3, background: '#0c0b0f' },
    })
      .composite([
        { input: d, left: 0, top: 0 },
        { input: m, left: 800, top: 0 },
        { input: a, left: 1600, top: 0 },
      ])
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(share);
  }

  if (skipUpload) {
    console.log('skip upload');
    return;
  }

  const puts = [
    ['voices-devil-1080.mp4', devilMp4, 'video/mp4'],
    ['voices-halo-1080.mp4', haloMp4, 'video/mp4'],
    ['voices-devil-look.gif', devilLook, 'image/gif'],
    ['voices-halo-look.gif', haloLook, 'image/gif'],
    ['voices-devil-full.gif', join(SRC, 'DEVIL/Devil-full.gif'), 'image/gif'],
    ['voices-halo-full.gif', join(SRC, 'ANGEL/Halo-full.gif'), 'image/gif'],
  ];
  for (const [name, file, type] of puts) {
    console.log(`  r2 ${name}`);
    await r2Put(`${PREFIX}/${name}`, file, type);
  }
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
