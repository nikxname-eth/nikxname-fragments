import { range } from './rng';
import type { FlowKind } from './types';
import type { Pt } from './lattice';

export const PHI = 1.61803398875;
export const INV_PHI = 1 / PHI;
export const INV_PHI2 = 1 - INV_PHI;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const PHI_LO = INV_PHI2;
export const PHI_HI = INV_PHI;

export function phiPick(rng: () => number) {
  return rng() < 0.5 ? PHI_LO : PHI_HI;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function push(pts: Pt[], x: number, y: number, t: number) {
  pts.push({ x: clamp01(x), y: clamp01(y), t: Math.max(0, Math.min(1, t)) });
}

/** Familiar composition systems. Hidden — the viewer has seen these, not named them. */
export function flowPoints(kind: FlowKind, n: number, rng: () => number): Pt[] {
  const pts: Pt[] = [];

  if (kind === 'phi-spiral') {
    let theta = rng() * Math.PI * 2;
    const grow = Math.log(PHI) / (Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const r = 0.04 * Math.exp(theta * grow * 0.22);
      push(pts, 0.62 + r * Math.cos(theta), 0.64 + r * Math.sin(theta), u);
      theta += 0.38 + rng() * 0.08;
    }
    return pts;
  }

  if (kind === 'fibonacci') {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const r = Math.sqrt(u) * 0.44;
      const a = i * GOLDEN_ANGLE + rng() * 0.03;
      push(pts, 0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a), u);
    }
    return pts;
  }

  if (kind === 'thirds') {
    // Power points of the rule of thirds, then flow between them.
    const anchors = [
      [1 / 3, 1 / 3],
      [2 / 3, 1 / 3],
      [1 / 3, 2 / 3],
      [2 / 3, 2 / 3],
    ];
    for (let i = 0; i < n; i++) {
      const a = anchors[i % 4];
      const b = anchors[(i + 1 + Math.floor(rng() * 2)) % 4];
      const u = ((i % Math.ceil(n / 4)) + rng()) / Math.ceil(n / 4);
      const wob = (rng() - 0.5) * 0.08;
      push(pts, a[0] + (b[0] - a[0]) * u + wob, a[1] + (b[1] - a[1]) * u + wob * 0.7, i / Math.max(1, n - 1));
    }
    return pts;
  }

  if (kind === 'line-of-beauty') {
    const thick = 0.12 + rng() * 0.16;
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1);
      const x = 0.1 + u * 0.8 + (rng() - 0.5) * thick;
      const y = 0.5 + Math.sin(u * Math.PI * 1.15) * 0.32 * (u < 0.5 ? -1 : 1) + (rng() - 0.5) * thick;
      push(pts, x, y, u);
    }
    return pts;
  }

  if (kind === 'baroque-diag') {
    const thick = 0.18 + rng() * 0.22;
    const flip = rng() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1);
      const along = 0.06 + u * 0.88;
      const perp = (rng() - 0.5) * thick * (0.55 + rng() * 0.7);
      const x = along + perp * 0.45;
      const y = (flip > 0 ? along : 1 - along) + perp;
      push(pts, x, y, u);
    }
    return pts;
  }

  if (kind === 'meander') {
    const amp = 0.12 + rng() * 0.18;
    const waves = 1.5 + rng() * 2;
    const thick = 0.1 + rng() * 0.14;
    for (let i = 0; i < n; i++) {
      const u = rng();
      const x = 0.06 + u * 0.88;
      const y = 0.5 + Math.sin(u * Math.PI * 2 * waves) * amp + (rng() - 0.5) * thick;
      push(pts, x, y, u);
    }
    return pts;
  }

  if (kind === 'braid') {
    const strands = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const u = rng();
      const s = i % strands;
      const x = 0.1 + u * 0.8;
      const y = 0.5 + Math.sin(u * Math.PI * 4 + s * 2) * 0.16 + (rng() - 0.5) * 0.08;
      push(pts, x, y, u);
    }
    return pts;
  }

  if (kind === 'front') {
    const y0 = 0.28 + rng() * 0.4;
    const tilt = (rng() - 0.5) * 0.35;
    const thick = 0.14 + rng() * 0.2;
    for (let i = 0; i < n; i++) {
      const x = rng();
      const y = y0 + (x - 0.5) * tilt + (rng() - 0.5) * thick;
      push(pts, x, y, x);
    }
    return pts;
  }

  if (kind === 'triangle') {
    const a = [0.5, 0.16];
    const b = [0.14, 0.84];
    const c = [0.86, 0.84];
    for (let i = 0; i < n; i++) {
      let u = rng();
      let v = rng();
      if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
      }
      const w = 1 - u - v;
      push(pts, a[0] * w + b[0] * u + c[0] * v, a[1] * w + b[1] * u + c[1] * v, u + v);
    }
    return pts;
  }

  if (kind === 'vesica') {
    const c1 = [0.38, 0.5];
    const c2 = [0.62, 0.5];
    const rad = 0.28;
    for (let i = 0; i < n; i++) {
      const which = i % 2 === 0 ? c1 : c2;
      const a = rng() * Math.PI * 2;
      const r = rad * Math.sqrt(rng());
      push(pts, which[0] + r * Math.cos(a), which[1] + r * Math.sin(a) * 0.92, i / Math.max(1, n - 1));
    }
    return pts;
  }

  if (kind === 'constellation') {
    // The Sml brushset: mixed scale implied by t, lots of air, no grid.
    for (let i = 0; i < n; i++) {
      push(pts, 0.12 + rng() * 0.76, 0.12 + rng() * 0.76, rng());
    }
    return pts;
  }

  if (kind === 'slant') {
    const ang = range(rng, -0.95, 0.95);
    const thick = 0.16 + rng() * 0.28;
    const y0 = 0.22 + rng() * 0.5;
    for (let i = 0; i < n; i++) {
      const u = rng();
      const x = 0.04 + u * 0.92;
      const y = y0 + (x - 0.5) * Math.tan(ang) + (rng() - 0.5) * thick;
      push(pts, x, y, u);
    }
    return pts;
  }

  if (kind === 'fan') {
    const ox = rng() < 0.5 ? range(rng, -0.05, 0.18) : range(rng, 0.82, 1.05);
    const oy = rng() < 0.55 ? range(rng, 0.72, 1.08) : range(rng, -0.08, 0.22);
    const spread = 0.55 + rng() * 0.7;
    const base = Math.atan2(0.5 - oy, 0.5 - ox);
    for (let i = 0; i < n; i++) {
      const u = Math.sqrt(rng());
      const a = base + (rng() - 0.5) * spread;
      const r = 0.12 + u * 0.95;
      push(pts, ox + Math.cos(a) * r, oy + Math.sin(a) * r, u);
    }
    return pts;
  }

  if (kind === 'blooms') {
    const clusters = 7 + Math.floor(rng() * 20);
    const heads = Array.from({ length: clusters }, () => ({
      x: 0.08 + rng() * 0.84,
      y: 0.08 + rng() * 0.84,
      rx: 0.03 + rng() * 0.12,
      ry: 0.026 + rng() * 0.1,
    }));
    for (let i = 0; i < n; i++) {
      const h = heads[Math.floor(rng() * heads.length)];
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.4);
      push(pts, h.x + Math.cos(a) * h.rx * r, h.y + Math.sin(a) * h.ry * r, r);
    }
    return pts;
  }

  if (kind === 'arc') {
    const cx = 0.5 + range(rng, -0.12, 0.12);
    const cy = range(rng, 0.72, 1.15);
    const r0 = 0.28 + rng() * 0.28;
    const thick = 0.1 + rng() * 0.18;
    const span = 0.7 + rng() * 0.7;
    const mid = -Math.PI / 2 + range(rng, -0.25, 0.25);
    for (let i = 0; i < n; i++) {
      const u = rng();
      const a = mid + (u - 0.5) * span;
      const r = r0 + (rng() - 0.5) * thick;
      push(pts, cx + Math.cos(a) * r, cy + Math.sin(a) * r, u);
    }
    return pts;
  }

  // whirl — two or three logarithmic arms
  const arms = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const arm = i % arms;
    const u = Math.floor(i / arms) / Math.max(1, Math.ceil(n / arms) - 1);
    const a = (arm / arms) * Math.PI * 2 + u * 3.4;
    const r = 0.05 * Math.pow(PHI, u * 3.2);
    push(pts, 0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a), u);
  }
  return pts;
}

export const FLOW_KINDS: FlowKind[] = [
  'phi-spiral',
  'thirds',
  'fibonacci',
  'line-of-beauty',
  'baroque-diag',
  'triangle',
  'vesica',
  'whirl',
  'constellation',
  'meander',
  'braid',
  'front',
  'slant',
  'fan',
  'arc',
  'blooms',
];
