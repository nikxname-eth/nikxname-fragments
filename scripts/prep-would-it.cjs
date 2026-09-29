const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');

const src = '/Users/nicholasvanniekerk/Downloads/Will-It';
const bannerSrc = '/Users/nicholasvanniekerk/Downloads/will-it-banner-02.jpg';
const dest = path.resolve('explore/public/would-it');
fs.mkdirSync(dest, { recursive: true });

async function webp(input, output, edge, quality = 82) {
  await sharp(input)
    .resize({ width: edge, height: edge, fit: 'inside' })
    .webp({ quality })
    .toFile(output);
  console.log(path.basename(output), Math.round(fs.statSync(output).size / 1024) + 'k');
}

(async () => {
  await webp(path.join(src, 'A/will_it_panel_001-A.jpg'), path.join(dest, 'canvas-a.webp'), 1800, 84);
  await webp(path.join(src, 'A/will_it_panel_001-A.jpg'), path.join(dest, 'canvas-a-thumb.webp'), 900, 80);
  await sharp(path.join(src, 'A/will_it_panel_001-A.jpg'))
    .resize({ width: 5000, height: 5000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(dest, 'canvas-a-full.jpg'));
  console.log(
    'canvas-a-full.jpg',
    Math.round(fs.statSync(path.join(dest, 'canvas-a-full.jpg')).size / 1024) + 'k',
  );
  await webp(path.join(src, 'A/will_it_panel_002-A.jpg'), path.join(dest, 'canvas-b.webp'), 1800, 84);
  await webp(path.join(src, 'A/will_it_panel_002-A.jpg'), path.join(dest, 'canvas-b-thumb.webp'), 900, 80);
  await sharp(path.join(src, 'A/will_it_panel_002-A.jpg'))
    .resize({ width: 5000, height: 5000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(dest, 'canvas-b-full.jpg'));
  console.log(
    'canvas-b-full.jpg',
    Math.round(fs.statSync(path.join(dest, 'canvas-b-full.jpg')).size / 1024) + 'k',
  );
  await webp(path.join(src, 'Panel-000.jpg'), path.join(dest, 'unrevealed.webp'), 1400, 80);
  await webp(path.join(src, 'Panel-000.jpg'), path.join(dest, 'unrevealed-thumb.webp'), 900, 78);

  await sharp(bannerSrc)
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(path.join(dest, 'banner.webp'));
  console.log(
    'banner.webp',
    Math.round(fs.statSync(path.join(dest, 'banner.webp')).size / 1024) + 'k',
  );

  const shareMeta = await sharp(bannerSrc)
    .resize({ width: 2400, withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(dest, 'share.jpg'));
  console.log(
    'share.jpg',
    shareMeta.width + 'x' + shareMeta.height,
    Math.round(fs.statSync(path.join(dest, 'share.jpg')).size / 1024) + 'k',
  );

  console.log('done');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
