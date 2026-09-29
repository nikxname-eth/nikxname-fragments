const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');

const srcDir = '/Users/nicholasvanniekerk/Downloads/butterfly-FlutterIntoTheEmbers';
const root = path.resolve('explore/public/embers');
const thumbs = path.join(root, 'thumbs');
const close = path.join(root, 'close');
fs.mkdirSync(thumbs, { recursive: true });
fs.mkdirSync(close, { recursive: true });

const order = [
  'AfterBlack',
  'CoalPink',
  'CloakedBurgandy',
  'Corten',
  'Oxide',
  'Garnet',
  'Cardinal',
  'Signal',
  'Vermillion',
  'BurntTangerine',
  'Napalm',
  'Afterburn',
  'SpicyApricot',
  'PeachEmber',
  'Rosedust',
  'CoralVeil',
  'Watermelon',
  'DustedPink',
  'Shell',
  'Ghost',
  'Porcelain',
];

function kebab(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

(async () => {
  for (const name of order) {
    const file = path.join(srcDir, `${name}.PNG`);
    const slug = kebab(name);
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
    const st = fs.statSync(path.join(thumbs, `${slug}.webp`));
    const sc = fs.statSync(path.join(close, `${slug}.webp`));
    console.log(slug, Math.round(st.size / 1024) + 'k', Math.round(sc.size / 1024) + 'k');
  }
  console.log('done');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
