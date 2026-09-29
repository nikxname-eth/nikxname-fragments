const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs');

const srcDir = '/Users/nicholasvanniekerk/Downloads/butterfly-FlutterIntoTheEmbers';
const thumbs = path.resolve('explore/public/embers/thumbs');
const close = path.resolve('explore/public/embers/close');

async function rebuild(fileName, slug) {
  const file = path.join(srcDir, fileName);
  const trimmed = sharp(file).trim({ threshold: 0 });
  await trimmed
    .clone()
    .resize({ width: 720, height: 720, fit: 'inside' })
    .webp({ quality: 82 })
    .toFile(path.join(thumbs, `${slug}.webp`));
  await trimmed
    .clone()
    .resize({ width: 1800, height: 1800, fit: 'inside' })
    .webp({ quality: 88 })
    .toFile(path.join(close, `${slug}.webp`));
  const t = await sharp(path.join(thumbs, `${slug}.webp`)).metadata();
  console.log(slug, t.width, t.height, Math.round(fs.statSync(path.join(thumbs, `${slug}.webp`)).size / 1024) + 'k');
}

(async () => {
  await rebuild('AfterBlack.PNG', 'after-black');
  await rebuild('Porcelain.PNG', 'porcelain');
  console.log('done');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
