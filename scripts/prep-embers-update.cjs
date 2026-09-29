const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');

const session =
  '/Users/nicholasvanniekerk/.grok/sessions/%2FUsers%2Fnicholasvanniekerk/019ef074-7441-75f3-9a9a-7adde119e274/assets';
const root = path.resolve('explore/public/embers');
const thumbs = path.join(root, 'thumbs');
const close = path.join(root, 'close');

const shareSrc = path.join(session, 'image-d2ba4dac-443b-413b-9fd8-e269ec975df8.jpg');
const afterSrc = path.join(session, 'image-668a54e4-9bae-4dfa-ac4a-b1d0b575b6d3.jpg');
const groundSrc = path.join(session, 'image-aa0430a0-168a-42fa-9161-8144041269d3.jpg');

async function liftBlacks(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 10) px[i + 3] = 0;
    else if (lum < 28) px[i + 3] = Math.round(((lum - 10) / 18) * 255);
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } });
}

(async () => {
  await sharp(shareSrc)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(root, 'share.jpg'));

  await sharp(groundSrc)
    .resize({ width: 1400, height: 1400, fit: 'inside' })
    .webp({ quality: 80 })
    .toFile(path.join(root, 'ground.webp'));

  const lifted = await liftBlacks(afterSrc);
  const trimmed = lifted.trim({ threshold: 8 });
  await trimmed
    .clone()
    .resize({ width: 720, height: 720, fit: 'inside' })
    .webp({ quality: 86 })
    .toFile(path.join(thumbs, 'after-black.webp'));
  await trimmed
    .clone()
    .resize({ width: 1800, height: 1800, fit: 'inside' })
    .webp({ quality: 90 })
    .toFile(path.join(close, 'after-black.webp'));

  for (const dir of [thumbs, close]) {
    const from = path.join(dir, 'ghost.webp');
    const to = path.join(dir, 'x-ray.webp');
    if (fs.existsSync(from)) fs.renameSync(from, to);
  }

  const files = ['share.jpg', 'ground.webp', 'thumbs/after-black.webp', 'close/after-black.webp', 'thumbs/x-ray.webp'];
  for (const f of files) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) {
      console.log('missing', f);
      continue;
    }
    console.log(f, Math.round(fs.statSync(p).size / 1024) + 'k');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
