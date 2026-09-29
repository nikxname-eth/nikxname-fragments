import type { Placement } from './types';

/** Zoom and optionally rotate a passage so a thin rule becomes a field. */
export function cropPlacements(placements: Placement[], rng: () => number, forceZoom?: number) {
  if (placements.length < 24) return placements;
  const zoom = forceZoom ?? (1.35 + rng() * 3.4);
  const cx = 0.16 + rng() * 0.68;
  const cy = rng() < 0.4 ? 0.52 + rng() * 0.32 : 0.16 + rng() * 0.6;
  const spin = rng() < 0.62 ? (rng() - 0.5) * 1.15 : 0;
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);
  const half = 0.5 / zoom;
  const out: Placement[] = [];
  for (const p of placements) {
    const dx = p.cx - cx;
    const dy = p.cy - cy;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    const x = rx / (half * 2) + 0.5;
    const y = ry / (half * 2) + 0.5;
    if (x < -0.06 || x > 1.06 || y < -0.06 || y > 1.06) continue;
    const rot = ((p.rot + (spin * 180) / Math.PI) % 360) + (rng() < 0.18 ? (rng() - 0.5) * 40 : 0);
    out.push({ ...p, cx: x, cy: y, scale: p.scale * zoom * 0.92, rot });
  }
  if (out.length < 12) return placements;
  return out;
}
