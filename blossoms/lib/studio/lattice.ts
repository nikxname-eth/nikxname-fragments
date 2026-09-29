import type { Lattice } from './types';

export type Pt = { x: number; y: number; t: number };

function clamp01(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n));
}

/** Exactly `n` points in the unit square, with a travel value 0..1. */
export function latticePoints(kind: Lattice, n: number, rng: () => number): Pt[] {
  const pts: Pt[] = [];
  const push = (x: number, y: number, t: number) => {
    pts.push({
      x: clamp01(x),
      y: clamp01(y),
      t: Math.max(0, Math.min(1, t)),
    });
  };

  if (kind === 'cross') {
    // Legacy name — never a thin plus. A soft mass instead.
    return latticePoints('mass', n, rng);
  }

  if (kind === 'curl') {
    const seeds = 4 + Math.floor(rng() * 5);
    const phase = rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      let x = rng();
      let y = rng();
      const walk = 6 + Math.floor(rng() * 10);
      for (let s = 0; s < walk; s++) {
        const a =
          Math.sin(x * 7.3 + phase) * 2.1 +
          Math.cos(y * 5.8 - phase) * 1.7 +
          Math.sin((x + y) * 3.4 + phase * 0.5);
        x += Math.cos(a) * 0.028;
        y += Math.sin(a) * 0.028;
      }
      push(x, y, i / Math.max(1, n - 1));
    }
    return pts;
  }

  if (kind === 'bloom') {
    const clusters = 10 + Math.floor(rng() * 28);
    const heads = Array.from({ length: clusters }, () => ({
      x: 0.07 + rng() * 0.86,
      y: 0.07 + rng() * 0.86,
      rx: 0.028 + rng() * 0.1,
      ry: 0.024 + rng() * 0.09,
    }));
    for (let i = 0; i < n; i++) {
      const h = heads[Math.floor(rng() * heads.length)];
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.4);
      const stray = rng() < 0.07;
      push(
        stray ? rng() : h.x + Math.cos(a) * h.rx * r,
        stray ? rng() : h.y + Math.sin(a) * h.ry * r,
        r,
      );
    }
    return pts;
  }

  if (kind === 'mass') {
    const blobs = 2 + Math.floor(rng() * 4);
    const cs = Array.from({ length: blobs }, () => ({
      x: 0.22 + rng() * 0.56,
      y: 0.22 + rng() * 0.56,
      rx: 0.12 + rng() * 0.28,
      ry: 0.1 + rng() * 0.24,
    }));
    for (let i = 0; i < n; i++) {
      const b = cs[i % blobs];
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.55);
      push(b.x + Math.cos(a) * b.rx * r, b.y + Math.sin(a) * b.ry * r, r);
    }
    return pts;
  }

  if (kind === 'veil') {
    const strands = 2 + Math.floor(rng() * 3);
    const per = Math.ceil(n / strands);
    for (let s = 0; s < strands; s++) {
      const y0 = 0.12 + rng() * 0.76;
      const amp = 0.08 + rng() * 0.18;
      const freq = 1.2 + rng() * 2.2;
      const thick = 0.07 + rng() * 0.14;
      const phase = rng() * Math.PI * 2;
      for (let k = 0; k < per && pts.length < n; k++) {
        const u = rng();
        const x = 0.04 + u * 0.92;
        const y = y0 + Math.sin(u * Math.PI * 2 * freq + phase) * amp + (rng() - 0.5) * thick;
        push(x, y, u);
      }
    }
    return pts;
  }

  if (kind === 'spiral') {
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const r = Math.sqrt(u) * 0.46;
      const a = i * g + rng() * 0.04;
      push(0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a), u);
    }
    return pts;
  }

  if (kind === 'rings') {
    const rings: number[] = [];
    let left = n;
    let ring = 0;
    while (left > 0) {
      const cap = ring === 0 ? 1 : ring * 6;
      const take = Math.min(left, cap);
      rings.push(take);
      left -= take;
      ring++;
    }
    rings.forEach((count, ri) => {
      const rad = rings.length === 1 ? 0 : (ri / (rings.length - 1)) * 0.44;
      const rot = rng() * Math.PI;
      const jitter = 0.012 + rad * 0.04;
      for (let k = 0; k < count; k++) {
        const a = rot + (k / count) * Math.PI * 2;
        push(
          0.5 + rad * Math.cos(a) + (rng() - 0.5) * jitter,
          0.5 + rad * Math.sin(a) + (rng() - 0.5) * jitter,
          ri / Math.max(1, rings.length - 1),
        );
      }
    });
    return pts;
  }

  if (kind === 'radial') {
    const arms = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const arm = i % arms;
      const along = Math.floor(i / arms) / Math.max(1, Math.ceil(n / arms) - 1);
      const a = (arm / arms) * Math.PI * 2 + along * 0.18;
      const r = 0.05 + along * 0.42;
      const thick = 0.035 + (1 - along) * 0.05;
      const px = -Math.sin(a) * (rng() - 0.5) * thick * 2;
      const py = Math.cos(a) * (rng() - 0.5) * thick * 2;
      push(0.5 + r * Math.cos(a) + px, 0.5 + r * Math.sin(a) + py, along);
    }
    return pts;
  }

  if (kind === 'petal') {
    const lobes = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const a = u * Math.PI * 2 * 2.2;
      const lobe = 0.55 + 0.45 * Math.cos(a * lobes);
      const r = (0.08 + u * 0.36) * lobe;
      push(0.5 + r * Math.cos(a) + (rng() - 0.5) * 0.02, 0.5 + r * Math.sin(a) + (rng() - 0.5) * 0.02, u);
    }
    return pts;
  }

  if (kind === 'diag') {
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    let i = 0;
    for (let r = 0; r < rows && i < n; r++) {
      for (let c = 0; c < cols && i < n; c++) {
        const x = (c + 0.5) / cols + (r / rows - 0.5) * 0.08;
        const y = (r + 0.5) / rows;
        push(x + (rng() - 0.5) * 0.02, y + (rng() - 0.5) * 0.02, (c + r) / Math.max(1, cols + rows - 2));
        i++;
      }
    }
    return pts;
  }

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  let i = 0;
  for (let r = 0; r < rows && i < n; r++) {
    for (let c = 0; c < cols && i < n; c++) {
      let x = (c + 0.5) / cols;
      let y = (r + 0.5) / rows;
      if (kind === 'brick' || kind === 'hex') {
        x = (c + (r % 2 === 1 ? 0.5 : 0) + 0.5) / (cols + 0.5);
      }
      if (kind === 'hex') {
        y = (r + 0.5) / (rows + 0.15);
      }
      if (kind === 'diamond') {
        const u = (c + 0.5) / cols - 0.5;
        const v = (r + 0.5) / rows - 0.5;
        x = 0.5 + (u - v) * 0.52;
        y = 0.5 + (u + v) * 0.52;
      }
      x += (rng() - 0.5) * 0.018;
      y += (rng() - 0.5) * 0.018;
      push(x, y, (c + r) / Math.max(1, cols + rows - 2));
      i++;
    }
  }
  return pts;
}

/** Filling forms only — never a thin symbol. */
export const LATTICES: Lattice[] = [
  'bloom',
  'mass',
  'curl',
  'petal',
  'spiral',
  'veil',
  'rings',
  'hex',
  'brick',
];

export const SHEET_LATTICES: Lattice[] = ['bloom', 'mass', 'curl', 'petal', 'spiral', 'veil', 'hex'];
