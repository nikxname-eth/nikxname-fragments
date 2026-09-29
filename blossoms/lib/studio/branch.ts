import { pick, pickWeighted, range } from './rng';
import type { BranchKind, BranchPlate, BranchStamp, Mode, Placement } from './types';

/**
 * Branch painter — rare, small twigs, never a forest of the same plate.
 * Cut ends always leave the frame.
 */

export type BranchEdge = 'left' | 'right' | 'top' | 'bottom';

export function plateEdge(plate: BranchPlate): BranchEdge | null {
  const [tx, ty] = plate.trunk;
  const dx = Math.min(tx, 1 - tx);
  const dy = Math.min(ty, 1 - ty);
  if (dx > 0.06 && dy > 0.06) return null;
  if (dx <= dy) return tx < 0.5 ? 'left' : 'right';
  return ty < 0.5 ? 'top' : 'bottom';
}

function preferKind(mode: Mode, rng: () => number): BranchKind {
  if (mode === 'close' || mode === 'solitary' || mode === 'triad') {
    return pickWeighted(rng, ['fork', 'sweep', 'rise', 'hang'] as const, [40, 28, 20, 12]);
  }
  return pickWeighted(rng, ['rise', 'fork', 'sweep', 'hang'] as const, [38, 28, 22, 12]);
}

function poolFor(plates: BranchPlate[], kind: BranchKind, used: Set<string>): BranchPlate[] {
  const fresh = plates.filter((p) => p.kind === kind && !used.has(p.id));
  if (fresh.length) return fresh;
  const any = plates.filter((p) => !used.has(p.id));
  return any.length ? any : plates;
}

export function inward(edge: BranchEdge, rng: () => number) {
  if (edge === 'left') return range(rng, -0.22, 0.22);
  if (edge === 'right') return Math.PI + range(rng, -0.22, 0.22);
  if (edge === 'top') return Math.PI / 2 + range(rng, -0.24, 0.24);
  return -Math.PI / 2 + range(rng, -0.22, 0.22);
}

export function pinPastEdge(edge: BranchEdge, along: number, rng: () => number): { cx: number; cy: number } {
  const hang = range(rng, 0.05, 0.1);
  if (edge === 'left') return { cx: -hang, cy: along };
  if (edge === 'right') return { cx: 1 + hang, cy: along };
  if (edge === 'top') return { cx: along, cy: -hang };
  return { cx: along, cy: 1 + hang };
}

function stampFrom(
  plate: BranchPlate,
  cx: number,
  cy: number,
  growth: number,
  scale: number,
  rng: () => number,
  alpha: number,
): BranchStamp {
  const axis = plate.axis;
  const rot = ((growth - axis) * 180) / Math.PI + range(rng, -3, 3);
  return {
    src: plate.src,
    rot,
    scale,
    cx,
    cy,
    flipX: false,
    flipY: false,
    alpha,
    trunk: [plate.trunk[0], plate.trunk[1]],
  };
}

function stemChance(mode: Mode, scale: number, ghost: boolean) {
  if (ghost || scale < 0.04) return 0;
  if (mode === 'close' || mode === 'solitary') return 0.38;
  if (mode === 'triad') return 0.22;
  return 0.16;
}

/** A branch from a canvas edge aimed at a bloom so the flower sits on it. */
export function braceToBloom(
  bloom: { cx: number; cy: number; scale: number },
  rng: () => number,
  plates: BranchPlate[],
  prefer?: 'top' | 'bottom' | 'left' | 'right' | null,
): BranchStamp | null {
  if (!plates.length) return null;
  const side =
    prefer && rng() < 0.82
      ? prefer
      : pickWeighted(rng, ['bottom', 'top', 'left', 'right'] as const, [44, 16, 20, 20]);
  const along =
    side === 'left' || side === 'right'
      ? Math.max(0.08, Math.min(0.92, bloom.cy + range(rng, -0.08, 0.08)))
      : Math.max(0.08, Math.min(0.92, bloom.cx + range(rng, -0.08, 0.08)));
  const pin = pinPastEdge(side, along, rng);
  const kind =
    side === 'bottom' ? 'rise' : side === 'top' ? 'hang' : side === 'left' || side === 'right' ? 'sweep' : 'fork';
  const plate = pick(rng, poolFor(plates, kind as BranchKind, new Set()));
  const toward = Math.atan2(bloom.cy - pin.cy, bloom.cx - pin.cx);
  const scale = range(rng, 0.22, 0.48) * (0.7 + bloom.scale);
  return stampFrom(plate, pin.cx, pin.cy, toward, scale, rng, range(rng, 0.72, 0.94));
}

export function growBranches(
  placements: Placement[],
  rng: () => number,
  mode: Mode,
  plates: BranchPlate[],
  vineAxis?: 'top' | 'bottom' | 'left' | 'right' | null,
): BranchStamp[] {
  if (!plates.length || !placements.length) return [];
  const fieldMode = mode === 'meadow' || mode === 'field' || mode === 'wave' || mode === 'bloom' || mode === 'flow';
  if (mode !== 'close' && mode !== 'solitary' && mode !== 'triad' && !fieldMode && rng() > 0.38) return [];
  const mood = pickWeighted(rng, ['none', 'few', 'some', 'many'] as const, [8, 20, 36, 36]);
  if (mood === 'none') return [];

  const ranked = placements
    .filter((p) => !p.ghost && (p.pop || p.scale >= 0.045))
    .sort((a, b) => b.scale - a.scale);

  const cap =
    mood === 'few'
      ? 1
      : mood === 'many'
        ? fieldMode || mode === 'close'
          ? 8
          : 5
        : mode === 'close' || mode === 'solitary' || mode === 'triad'
          ? 4
          : fieldMode
            ? 4
            : 3;
  const candidates = ranked.slice(0, Math.min(8, ranked.length));
  const out: BranchStamp[] = [];
  const used = new Set<string>();

  for (const p of candidates) {
    if (out.length >= cap) break;
    if (rng() >= stemChance(mode, p.scale, p.ghost)) continue;
    const kind =
      vineAxis === 'top' ? 'hang' : vineAxis === 'bottom' ? 'rise' : preferKind(mode, rng);
    const primary = pick(rng, poolFor(plates, kind, used));
    used.add(primary.id);
    const edge =
      vineAxis && rng() < 0.82
        ? vineAxis
        : plateEdge(primary) ??
          (kind === 'rise' ? 'bottom' : kind === 'hang' ? 'top' : kind === 'sweep' ? 'left' : 'bottom');
    const scale = range(rng, 0.055, 0.13) * (mode === 'close' ? 1.35 : 1);
    const along =
      edge === 'left' || edge === 'right'
        ? clamp(p.cy + range(rng, -0.06, 0.06))
        : clamp(p.cx + range(rng, -0.08, 0.08));
    const pin = pinPastEdge(edge, along, rng);
    const toward = Math.atan2(p.cy - pin.cy, p.cx - pin.cx);
    const growth = toward * 0.5 + inward(edge, rng) * 0.5;
    out.push(stampFrom(primary, pin.cx, pin.cy, growth, scale, rng, range(rng, 0.42, 0.62)));
  }

  return out;
}

function clamp(n: number, a = 0.08, b = 0.92) {
  return Math.max(a, Math.min(b, n));
}
