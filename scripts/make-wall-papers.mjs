/**
 * Small plaster-style wall papers for The Wall.
 * Same-origin files; only the selected paper is shown at full size.
 */
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../explore/public/garden/walls');
mkdirSync(outDir, { recursive: true });

const PAPERS = [
  { id: 'linen', fill: '#e6ded0', opacity: '0.22', seed: '3' },
  { id: 'plaster', fill: '#d2ccc2', opacity: '0.28', seed: '7' },
  { id: 'clay', fill: '#c4b09a', opacity: '0.26', seed: '11' },
  { id: 'slate', fill: '#4a4e54', opacity: '0.32', seed: '19' },
  { id: 'charcoal', fill: '#1a1c20', opacity: '0.24', seed: '29' },
  { id: 'umber', fill: '#3a342e', opacity: '0.3', seed: '23' },
];

function svg({ fill, opacity, seed }) {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1280">
  <defs>
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="${seed}" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${fill}"/>
  <rect width="100%" height="100%" filter="url(#n)" opacity="${opacity}"/>
</svg>`;
}

for (const p of PAPERS) {
  const buf = await sharp(Buffer.from(svg(p)))
    .webp({ quality: 72, effort: 4 })
    .toBuffer();
  writeFileSync(join(outDir, `${p.id}.webp`), buf);
  console.log(p.id, `${(buf.length / 1024).toFixed(1)}kb`);
}

for (const id of ['flute', 'panel', 'smoke']) {
  const stale = join(outDir, `${id}.webp`);
  if (existsSync(stale)) {
    unlinkSync(stale);
    console.log('removed', `${id}.webp`);
  }
}
