import { colorizeImageData, followRamp, heartRamp, inkRamp, paintGround, rampFor, stemRamp } from './color';
import { GOLDEN_ANGLE, INV_PHI, INV_PHI2, PHI } from './flow';
import type { BranchStamp, PaintPath, Painting } from './types';

const cache = new Map<string, HTMLImageElement>();
const tintCache = new Map<string, HTMLCanvasElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit && hit.complete && hit.naturalWidth) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`failed ${src}`));
    img.src = src;
  });
}

export async function preload(srcs: string[], concurrency = 8) {
  const unique = [...new Set(srcs.filter(Boolean))];
  const missing = unique.filter((s) => {
    const hit = cache.get(s);
    return !(hit && hit.complete && hit.naturalWidth);
  });
  if (!missing.length) return;
  let i = 0;
  const n = Math.min(Math.max(1, concurrency), missing.length);
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < missing.length) {
        const src = missing[i++];
        await loadImage(src).catch(() => null);
      }
    }),
  );
}

function uniquePlateSrcs(painting: Painting) {
  const srcs: string[] = [];
  const seen = new Set<string>();
  for (const p of painting.placements) {
    if (!seen.has(p.plate.src)) {
      seen.add(p.plate.src);
      srcs.push(p.plate.src);
    }
  }
  for (const b of painting.branches ?? []) {
    if (!seen.has(b.src)) {
      seen.add(b.src);
      srcs.push(b.src);
    }
  }
  return srcs;
}

function plateToColorized(
  img: HTMLImageElement,
  family: Painting['family'],
  travel: number,
  lean: number,
  drawScale: number,
  pop = false,
  opts?: {
    wash?: boolean;
    heart?: boolean;
    stem?: boolean;
    accent?: number;
    ground?: Painting['ground'];
    harmony?: Painting['harmony'];
    salt?: number;
    layer?: Painting['placements'][number]['layer'];
  },
): HTMLCanvasElement {
  const accent = opts?.accent ?? 0;
  const harmony = opts?.harmony ?? 'full';
  const salt = opts?.salt ?? 0.5;
  const tBucket = opts?.heart ? 3 : opts?.stem ? 4 : opts?.wash ? 0 : pop ? 1 : travel > 0.55 ? 1 : 0;
  const lBucket = opts?.wash
    ? Math.max(0, Math.min(32, Math.round(lean * 32)))
    : Math.max(0, Math.min(8, Math.round(lean * 8)));
  const lightBucket = Math.max(0, Math.min(8, Math.round(travel * 8)));
  const max = opts?.wash ? 24 : opts?.heart ? 160 : pop ? 240 : drawScale >= 0.05 ? 180 : drawScale >= 0.028 ? 120 : 80;
  const layerTag = opts?.layer === 'sky' ? 's' : opts?.layer === 'horizon' ? 'h' : 'x';
  const key = `v16|${img.src}|${opts?.wash ? opts.ground : family}|${tBucket}|${lBucket}|${lightBucket}|${max}|${pop ? 1 : 0}|${opts?.heart ? 1 : 0}|${opts?.wash ? 1 : 0}|${opts?.stem ? 1 : 0}|${accent}|${harmony}|${Math.round(salt * 8)}|${layerTag}`;
  const hit = tintCache.get(key);
  if (hit) return hit;

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const scale = Math.min(1, max / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return off;
  ctx.drawImage(img, 0, 0, w, h);
  const src = ctx.getImageData(0, 0, w, h);
  let ramp = opts?.heart
    ? heartRamp(family)
    : opts?.stem
      ? stemRamp(family)
      : opts?.wash && opts.ground
        ? followRamp(opts.ground, family, harmony, salt, lBucket / 32, travel, pop)
        : rampFor(family, tBucket, lBucket / 8, { pop, lean: lBucket / 8, accent, harmony, layer: opts?.layer });
  if (harmony === 'mono' && !(opts?.wash && opts.ground)) ramp = inkRamp(ramp, family, salt);
  ctx.putImageData(colorizeImageData(src, ramp, 0), 0, 0);
  if (tintCache.size > 2800) tintCache.clear();
  tintCache.set(key, off);
  return off;
}

function tick() {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(done);
    setTimeout(done, 24);
  });
}

export type PaintPhase = { pass: number; of: number };

/** Sit with the painter. Seed picks a length in this window. */
export function sitDuration(seed: number, compact = false) {
  return compact ? 34_000 + ((seed >>> 0) % 10_001) : 40_000 + ((seed >>> 0) % 12_001);
}

function layerRank(p: Painting['placements'][number]) {
  if (p.pass) return p.pass;
  if (p.pop) return 4;
  if (p.layer === 'sky') return 0;
  if (p.layer === 'horizon') return 1;
  if (p.layer === 'fore') return 3;
  return 2;
}

function pathKey(p: Painting['placements'][number], path: PaintPath) {
  if (path === 'ltr') return p.cx;
  if (path === 'rtl') return -p.cx;
  if (path === 'ttb') return p.cy;
  if (path === 'speckle') {
    const pass = p.pass ?? 1;
    return Math.abs(Math.sin(p.cx * 127.13 + p.cy * 311.7 + pass * 17.9) * 43758.5453) % 1;
  }
  if (path === 'btt') return -p.cy;
  if (path === 'diag') return p.cx + p.cy;
  if (path === 'diag-back') return p.cx - p.cy;
  if (path === 'phi-spiral') {
    const dx = p.cx - INV_PHI;
    const dy = p.cy - INV_PHI2;
    const ang = Math.atan2(dy, dx);
    const r = Math.hypot(dx, dy);
    return Math.log(r + 0.02) / Math.log(PHI) - ang / (Math.PI / 2);
  }
  if (path === 'fibonacci') {
    const dx = p.cx - 0.5;
    const dy = p.cy - 0.5;
    const ang = Math.atan2(dy, dx);
    const r = Math.hypot(dx, dy);
    const g = ((ang / GOLDEN_ANGLE) % 1 + 1) % 1;
    return r * r + g * 0.04;
  }
  const dx = p.cx - 0.5;
  const dy = p.cy - 0.5;
  return Math.atan2(dy, dx) + Math.hypot(dx, dy) * 3.4;
}

function paintOrder(placements: Painting['placements'], path: PaintPath = 'ltr') {
  const idx = placements.map((_, i) => i);
  idx.sort((ia, ib) => {
    const a = placements[ia];
    const b = placements[ib];
    const la = layerRank(a);
    const lb = layerRank(b);
    if (la !== lb) return la - lb;
    const pa = pathKey(a, path);
    const pb = pathKey(b, path);
    if (pa !== pb) return pa - pb;
    return a.travel - b.travel;
  });
  return idx;
}

export async function renderPainting(
  dest: HTMLCanvasElement,
  painting: Painting,
  signal?: AbortSignal,
  opts?: { sit?: boolean; compact?: boolean; onPhase?: (phase: PaintPhase) => void },
) {
  const ctx = dest.getContext('2d');
  if (!ctx) return;
  const W = dest.width;
  const H = dest.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintGround(
    ctx,
    W,
    H,
    painting.ground,
    painting.family,
    (painting.seed % 1000) / 1000,
    painting.weight?.kind === 'glow'
      ? { x: painting.weight.x, y: painting.weight.y, r: painting.weight.r }
      : undefined,
    painting.view,
    painting.harmony,
    painting.horizon ?? painting.vanish.y,
    painting.grade ?? 'fall',
    painting.vanish,
  );
  if (signal?.aborted) return;

  const compact = !!opts?.compact;
  await preload(uniquePlateSrcs(painting), compact ? 6 : 10);
  if (signal?.aborted) return;

  const n = painting.placements.length;
  const passOf = (p: Painting['placements'][number]) => p.pass ?? layerRank(p);
  const sit = opts?.sit !== false;
  const totalMs = sit ? sitDuration(painting.seed, compact) : 0;

  const drawOne = (p: Painting['placements'][number], skipRot: boolean) => {
    const img = cache.get(p.plate.src);
    if (!img || !img.complete || !img.naturalWidth) return;
    const tinted = plateToColorized(
      img,
      painting.family,
      p.travel,
      p.lean ?? 0.5,
      p.scale,
      !!p.pop,
      {
        wash: !!p.wash,
        heart: !!p.heart,
        stem: !!p.stem,
        accent: p.accent,
        ground: painting.ground,
        harmony: painting.harmony,
        salt: (painting.seed % 1000) / 1000,
        layer: p.layer,
      },
    );
    const size = Math.min(W, H) * p.scale;
    const x = p.cx * W;
    const y = p.cy * H;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (skipRot) {
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(tinted, x - size / 2, y - size / 2, size, size);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.globalAlpha = p.alpha;
    ctx.drawImage(tinted, -size / 2, -size / 2, size, size);
    ctx.restore();
  };

  const paintSlice = async (indices: number[], skipRot: boolean, shareMs: number) => {
    if (!indices.length) return;
    if (!shareMs) {
      for (let k = 0; k < indices.length; k++) {
        if (signal?.aborted) return;
        drawOne(painting.placements[indices[k]], skipRot);
        if (k > 0 && k % 400 === 0) {
          ctx.globalAlpha = 1;
          await tick();
        }
      }
      ctx.globalAlpha = 1;
      return;
    }
    const t0 = performance.now();
    let k = 0;
    const burst = compact
      ? Math.max(6, Math.ceil(indices.length / Math.max(140, shareMs / 16)))
      : Math.max(10, Math.ceil(indices.length / Math.max(80, shareMs / 16)));
    while (k < indices.length) {
      if (signal?.aborted) return;
      const elapsed = performance.now() - t0;
      const due = Math.min(indices.length, Math.floor((elapsed / shareMs) * indices.length));
      if (due <= k) {
        await tick();
        continue;
      }
      const until = Math.min(indices.length, Math.max(due, k + 1), k + burst);
      for (; k < until; k++) drawOne(painting.placements[indices[k]], skipRot);
      ctx.globalAlpha = 1;
      await tick();
    }
    while (performance.now() - t0 < shareMs * 0.9) {
      if (signal?.aborted) return;
      await tick();
    }
  };

  const order = paintOrder(painting.placements, painting.path ?? 'ltr');
  const maxPass = Math.max(3, Math.min(8, painting.passes || 4));
  const skipRot = compact ? n > 5_000 : n > 18_000;
  const share = totalMs ? totalMs / maxPass : 0;

  for (let pass = 1; pass <= maxPass; pass++) {
    if (signal?.aborted) return;
    opts?.onPhase?.({ pass, of: maxPass });
    const slice =
      pass === 1
        ? order.filter((i) => passOf(painting.placements[i]) <= 1)
        : order.filter((i) => passOf(painting.placements[i]) === pass);
    await paintSlice(slice, pass >= maxPass ? false : skipRot, share);
    if (pass === Math.max(1, maxPass - 1)) {
      const branchList = painting.branches ?? [];
      for (const b of branchList) {
        if (signal?.aborted) return;
        await drawBranch(ctx, b, W, H, painting.family, painting.harmony === 'mono');
        if (sit) await tick();
      }
    }
  }
  ctx.globalAlpha = 1;
  if (signal?.aborted) return;
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (painting.shift && !coarse && W * H <= 1_000_000) chromaticShift(ctx, W, H, painting.seed);
  if (tintCache.size > 400) tintCache.clear();
}

/** Vibes-like pixel-shift: RGB channels walk a few pixels apart so colour vibrates. */
function chromaticShift(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const src = ctx.getImageData(0, 0, w, h);
  const s = src.data;
  const out = ctx.createImageData(w, h);
  const d = out.data;
  const dx = 1 + (seed % 3);
  const dy = (seed >>> 3) % 2 === 0 ? 1 : 0;
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = (i / w) | 0;
    const o = i * 4;
    const rx = Math.max(0, Math.min(w - 1, x - dx));
    const by = Math.max(0, Math.min(h - 1, y + dy));
    const bx = Math.max(0, Math.min(w - 1, x + dx));
    d[o] = s[(y * w + rx) * 4];
    d[o + 1] = s[o + 1];
    d[o + 2] = s[(by * w + bx) * 4 + 2];
    d[o + 3] = s[o + 3];
  }
  ctx.putImageData(out, 0, 0);
}

function plateToStem(img: HTMLImageElement, family: Painting['family'], mono = false): HTMLCanvasElement {
  const max = 720;
  const key = `br|${img.src}|${family}|${max}|${mono ? 1 : 0}`;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const scale = Math.min(1, max / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return off;
  ctx.drawImage(img, 0, 0, w, h);
  let ramp = stemRamp(family);
  if (mono) ramp = inkRamp(ramp, family);
  ctx.putImageData(colorizeImageData(ctx.getImageData(0, 0, w, h), ramp, 0), 0, 0);
  if (tintCache.size > 1200) tintCache.clear();
  tintCache.set(key, off);
  return off;
}

async function drawBranch(
  ctx: CanvasRenderingContext2D,
  stamp: BranchStamp,
  W: number,
  H: number,
  family: Painting['family'],
  mono = false,
) {
  let img: HTMLImageElement;
  try {
    img = await loadImage(stamp.src);
  } catch {
    return;
  }
  const tinted = plateToStem(img, family, mono);
  const maxSide = Math.min(W, H) * stamp.scale;
  const fit = maxSide / Math.max(tinted.width, tinted.height);
  const dw = tinted.width * fit;
  const dh = tinted.height * fit;
  ctx.save();
  ctx.translate(stamp.cx * W, stamp.cy * H);
  ctx.rotate((stamp.rot * Math.PI) / 180);
  if (stamp.flipX) ctx.scale(-1, 1);
  if (stamp.flipY) ctx.scale(1, -1);
  ctx.globalAlpha = stamp.alpha;
  ctx.drawImage(tinted, -stamp.trunk[0] * dw, -stamp.trunk[1] * dh, dw, dh);
  ctx.restore();
}
