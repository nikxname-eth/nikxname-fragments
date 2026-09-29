#!/usr/bin/env node
/**
 * Fold Latest 17 hand-painted pops, grass blades, and a fork branch
 * into the existing studio catalog without wiping public/library.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const publicLib = path.join(root, 'public', 'library');
const catalogPath = path.join(publicLib, 'catalog.json');
const srcDir = '/Users/nicholasvanniekerk/Desktop/Latest 17/New-texture-brush-branch-shapes-and-references';

const POPS = [
  ['Pop-New-001.png', 'bloom-03'],
  ['Pop-New-002.png', 'bloom-04'],
  ['Pop-New-003.png', 'bloom-05'],
  ['Pop-New-004.png', 'bloom-06'],
  ['Pop-New-005.png', 'bloom-07'],
  ['Pop-New-006.png', 'bloom-08'],
];

const LUM_CUT = 14;

async function rawRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function luminance(data, i) {
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}

function components(data, w, h, minArea) {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = new Int32Array(w * h * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (seen[start] || luminance(data, start * 4) < LUM_CUT) continue;
      let sp = 0;
      stack[sp++] = x;
      stack[sp++] = y;
      let minx = x;
      let maxx = x;
      let miny = y;
      let maxy = y;
      let area = 0;
      while (sp > 0) {
        const cy = stack[--sp];
        const cx = stack[--sp];
        const ci = cy * w + cx;
        if (cx < 0 || cy < 0 || cx >= w || cy >= h || seen[ci]) continue;
        if (luminance(data, ci * 4) < LUM_CUT) continue;
        seen[ci] = 1;
        area += 1;
        if (cx < minx) minx = cx;
        if (cx > maxx) maxx = cx;
        if (cy < miny) miny = cy;
        if (cy > maxy) maxy = cy;
        stack[sp++] = cx - 1;
        stack[sp++] = cy;
        stack[sp++] = cx + 1;
        stack[sp++] = cy;
        stack[sp++] = cx;
        stack[sp++] = cy - 1;
        stack[sp++] = cx;
        stack[sp++] = cy + 1;
      }
      if (area >= minArea) out.push({ minx, maxx, miny, maxy, area });
    }
  }
  return out.sort((a, b) => b.area - a.area);
}

async function cropPlate(src, box, pad, size, dest) {
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const left = Math.max(0, box.minx - pad);
  const top = Math.max(0, box.miny - pad);
  const width = Math.min(w - left, box.maxx - box.minx + 1 + pad * 2);
  const height = Math.min(h - top, box.maxy - box.miny + 1 + pad * 2);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await sharp(src)
    .extract({ left, top, width, height })
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 92 })
    .toFile(dest);
  const stat = await fs.promises.stat(dest);
  return stat.size;
}

const catalog = JSON.parse(await fs.promises.readFile(catalogPath, 'utf8'));

for (const [file, id] of POPS) {
  const src = path.join(srcDir, file);
  const dest = path.join(publicLib, 'heroes', `${id}.webp`);
  const { data, w, h } = await rawRgba(src);
  const comps = components(data, w, h, 800);
  if (!comps.length) {
    console.warn('no bloom ink', id);
    continue;
  }
  const bytes = await cropPlate(src, comps[0], 48, 1600, dest);
  catalog.heroes = catalog.heroes.filter((h) => h.id !== id);
  catalog.heroes.push({ id, kind: 'bloom', src: `/library/heroes/${id}.webp`, bytes });
  console.log('bloom', id, Math.round(bytes / 1024) + 'kb');
}

const grassSrc = path.join(srcDir, 'Hand-painted-grass-references-for multiplebrushes.png');
const { data: gData, w: gw, h: gh } = await rawRgba(grassSrc);
const blades = components(gData, gw, gh, 280).filter((c) => {
  const bw = c.maxx - c.minx + 1;
  const bh = c.maxy - c.miny + 1;
  return bh > bw * 0.9 && c.area > 400;
});
catalog.marks = catalog.marks.filter((m) => !String(m.id).startsWith('blade-'));
let bi = 0;
for (const box of blades.slice(0, 18)) {
  bi += 1;
  const id = `blade-${String(bi).padStart(2, '0')}`;
  const dest = path.join(publicLib, 'marks', `${id}.webp`);
  await cropPlate(grassSrc, box, 18, 720, dest);
  catalog.marks.push({ id, src: `/library/marks/${id}.webp` });
  console.log('blade', id, box.area);
}

const branchSrc = path.join(srcDir, 'banch-shape-ref.png');
const { data: bData, w: bw, h: bh } = await rawRgba(branchSrc);
const bComps = components(bData, bw, bh, 1200);
if (bComps.length) {
  const dest = path.join(publicLib, 'branches', 'branch-19.webp');
  await cropPlate(branchSrc, bComps[0], 36, 1600, dest);
  catalog.branches = (catalog.branches ?? []).filter((b) => b.id !== 'branch-19');
  catalog.branches.push({
    id: 'branch-19',
    src: '/library/branches/branch-19.webp',
    kind: 'fork',
    axis: 0.92,
    trunk: [0.08, 0.04],
  });
  console.log('branch-19', bComps[0].area);
}

await fs.promises.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(
  'catalog',
  catalog.heroes.length,
  'heroes',
  catalog.marks.length,
  'marks',
  (catalog.branches ?? []).length,
  'branches',
);
