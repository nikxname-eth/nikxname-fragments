#!/usr/bin/env node
/**
 * Downscale LRG heroes + a typecase subset into blossoms/public/library
 * for the local /studio viewer. Run from repo root:
 *   node blossoms/scripts/prepare-studio-library.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const publicLib = path.join(root, 'public', 'library');
const lrgDir = '/Users/nicholasvanniekerk/Downloads/Blossom Shapes/LRG Blossoms';
const extracted = path.join(root, 'library', 'extracted');

const BLOOMS = [
  {
    file: '/Users/nicholasvanniekerk/Downloads/Latest Reviews/hand-painted-flower- ref-0010.png',
    id: 'bloom-01',
  },
  {
    file: '/Users/nicholasvanniekerk/Downloads/Latest Reviews/hand-painted-flower ref-0011.png',
    id: 'bloom-02',
  },
];

const HEROES = [
  { file: 'LRG-.png', id: 'hero-01', kind: 'figure' },
  { file: 'LRG- 2.png', id: 'hero-02', kind: 'figure' },
  { file: 'LRG- 3.png', id: 'hero-03', kind: 'figure' },
  { file: 'LRG- 4.png', id: 'hero-04', kind: 'thicket' },
  { file: 'LRG- 5.png', id: 'hero-05', kind: 'figure' },
  { file: 'LRG- 6.png', id: 'hero-06', kind: 'figure' },
  { file: 'LRG- 7.png', id: 'hero-07', kind: 'thicket' },
  { file: 'LRG- 8.png', id: 'hero-08', kind: 'thicket' },
  { file: 'LRG- 9.png', id: 'hero-09', kind: 'thicket' },
  { file: 'LRG- 10.png', id: 'hero-10', kind: 'thicket' },
  { file: 'LRG- 11.png', id: 'hero-11', kind: 'figure' },
  { file: 'LRG- 12.png', id: 'hero-12', kind: 'figure' },
];

function markIds() {
  const ids = [];
  for (let i = 1; i <= 100; i++) ids.push(`gray001_${String(i).padStart(3, '0')}`);
  for (let i = 1; i <= 80; i++) ids.push(`fire003_${String(i).padStart(3, '0')}`);
  for (let i = 1; i <= 50; i++) ids.push(`fire001_${String(i).padStart(3, '0')}`);
  for (let i = 1; i <= 16; i++) ids.push(`sml_${String(i).padStart(3, '0')}`);
  return ids;
}

async function toWebp(src, dest, size) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await sharp(src)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(dest);
}

const catalog = { heroes: [], marks: [], branches: [] };

await fs.promises.rm(publicLib, { recursive: true, force: true });
await fs.promises.mkdir(path.join(publicLib, 'heroes'), { recursive: true });
await fs.promises.mkdir(path.join(publicLib, 'marks'), { recursive: true });

for (const h of HEROES) {
  const src = path.join(lrgDir, h.file);
  const dest = path.join(publicLib, 'heroes', `${h.id}.webp`);
  if (!fs.existsSync(src)) {
    console.warn('missing hero', src);
    continue;
  }
  await toWebp(src, dest, 1800);
  const stat = await fs.promises.stat(dest);
  catalog.heroes.push({ id: h.id, kind: h.kind, src: `/library/heroes/${h.id}.webp`, bytes: stat.size });
  console.log('hero', h.id, (stat.size / 1024).toFixed(0) + 'kb');
}

for (const b of BLOOMS) {
  const dest = path.join(publicLib, 'heroes', `${b.id}.webp`);
  if (!fs.existsSync(b.file)) {
    console.warn('missing bloom', b.file);
    continue;
  }
  await toWebp(b.file, dest, 1800);
  const stat = await fs.promises.stat(dest);
  catalog.heroes.push({ id: b.id, kind: 'bloom', src: `/library/heroes/${b.id}.webp`, bytes: stat.size });
  console.log('bloom', b.id, (stat.size / 1024).toFixed(0) + 'kb');
}

for (const id of markIds()) {
  const src = path.join(extracted, `${id}.png`);
  const dest = path.join(publicLib, 'marks', `${id}.webp`);
  if (!fs.existsSync(src)) {
    console.warn('missing mark', src);
    continue;
  }
  await toWebp(src, dest, 640);
  catalog.marks.push({ id, src: `/library/marks/${id}.webp` });
}

const branchDir = path.join(extracted, 'branches');
const branchIndex = path.join(branchDir, 'index.json');
if (fs.existsSync(branchIndex)) {
  const listed = JSON.parse(fs.readFileSync(branchIndex, 'utf8'));
  await fs.promises.mkdir(path.join(publicLib, 'branches'), { recursive: true });
  for (const b of listed) {
    const src = path.join(branchDir, `${b.id}.png`);
    const dest = path.join(publicLib, 'branches', `${b.id}.webp`);
    if (!fs.existsSync(src)) continue;
    await toWebp(src, dest, 1600);
    catalog.branches.push({
      id: b.id,
      src: `/library/branches/${b.id}.webp`,
      kind: b.kind,
      axis: b.axis,
      trunk: b.trunk,
    });
  }
}

await fs.promises.writeFile(
  path.join(publicLib, 'catalog.json'),
  JSON.stringify(catalog, null, 2),
);
console.log(
  'catalog',
  catalog.heroes.length,
  'heroes',
  catalog.marks.length,
  'marks',
  catalog.branches.length,
  'branches',
);
