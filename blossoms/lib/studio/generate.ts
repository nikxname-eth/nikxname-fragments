import { braceToBloom, growBranches, inward, pinPastEdge, plateEdge } from './branch';
import { cropPlacements } from './crop';
import { rollCount } from './count';
import { FLOW_KINDS, GOLDEN_ANGLE, PHI_HI, PHI_LO, flowPoints, phiPick } from './flow';
import { pick, pickWeighted, range, mulberry32 } from './rng';
import { LATTICES, SHEET_LATTICES, latticePoints } from './lattice';
import { meadowBands } from './scene';
import { fillRipple, planHedge, planRipples, rippleMass } from './ripples';
import type { StreetEdge } from './ripples';
import { coerceFamily, coerceFlow, coerceMode, FAMILY_LABELS, GROUNDS } from './types';
import type {
  Aspect,
  BranchStamp,
  Catalog,
  CountBand,
  EyeWeight,
  Family,
  Flow,
  FlowKind,
  GradeKind,
  Ground,
  Harmony,
  Mode,
  PaintPath,
  Painting,
  Placement,
  Vanish,
  ViewLean,
  WeightKind,
  WorkKind,
} from './types';

type VineAxis = 'top' | 'bottom' | 'left' | 'right';
type PopMood = 'none' | 'few' | 'some' | 'many';
type GrassMood = 'none' | 'sparse' | 'mid' | 'thick';
/** How far the land sits — long view, close sit, or stacked bands. */
type Distance = 'long' | 'short' | 'press';
/** Horizon is a decision: grade through, one silhouette, or receding masses. */
type Skyline = 'blend' | 'edge' | 'hills';

function pickVineSide(rng: () => number, axis: VineAxis | null): VineAxis {
  if (!axis) return pickWeighted(rng, ['bottom', 'top', 'left', 'right'] as const, [58, 10, 16, 16]);
  if (rng() < 0.84) return axis;
  if (axis === 'top' || axis === 'bottom') return axis;
  return rng() < 0.5 ? 'bottom' : axis;
}

/** Soft colour field — sine veils, never a checkerboard. */
function colorDrift(x: number, y: number, phase: number) {
  const a = Math.sin(x * 5.4 + phase) * Math.cos(y * 3.8 - phase * 0.6);
  const b = Math.sin((x * 0.7 + y) * 4.1 + phase * 1.3);
  return Math.max(0, Math.min(1, 0.5 + 0.32 * a + 0.18 * b));
}

function markRot(rng: () => number, n: number) {
  if (rng() < 0.1) return range(rng, -180, 180);
  if (n > 20000) return range(rng, -36, 36);
  return range(rng, -78, 78);
}

/** Lobed cloud — clover / petal, never a box or a disk. */
type Head = { x: number; y: number; r: number; lobes: number; phase: number; squash: number };

function organicHead(rng: () => number, x: number, y: number, r: number): Head {
  return {
    x,
    y,
    r,
    lobes: 2 + Math.floor(rng() * 4),
    phase: rng() * Math.PI * 2,
    squash: range(rng, 0.58, 0.9),
  };
}

function inHead(rng: () => number, head: Head): { x: number; y: number } {
  const ang = rng() * Math.PI * 2;
  const lobe = 0.48 + 0.52 * Math.abs(Math.sin(ang * head.lobes + head.phase));
  const rad = head.r * Math.pow(rng(), 0.7) * lobe;
  return {
    x: head.x + Math.cos(ang) * rad,
    y: head.y + Math.sin(ang) * rad * head.squash,
  };
}

function workKindOf(mode: Mode): WorkKind {
  if (mode === 'close') return 'blossom';
  if (mode === 'bloom' || mode === 'flow') return 'bloom';
  if (mode === 'wave' || mode === 'sheet') return 'wave';
  return 'field';
}

function rollPasses(rng: () => number) {
  return pickWeighted(rng, [3, 4, 5, 6, 7, 8], [28, 32, 18, 12, 7, 3]);
}

function assignPass(p: Placement, max: number, horizon = 0.38): number {
  if (p.pop || p.heart) return max;
  if (p.wash || p.layer === 'sky') return 1;
  if (p.stem) return Math.min(max - 1, Math.max(2, Math.ceil(max * 0.55)));
  const near = recede(p.cy, horizon);
  if (p.layer === 'horizon' || near < 0.22) return Math.min(2, max);
  if (near < 0.48 || p.ghost) return Math.min(3, Math.max(2, max - 3));
  if (p.layer === 'fore' || near > 0.72) return Math.min(max - 1, Math.max(3, max - 1));
  if (max <= 3) return 2;
  return Math.min(max - 1, Math.max(2, 2 + Math.round(near * (max - 4))));
}

function holdUnderpainting(placements: Placement[], horizon: number, distance: Distance) {
  if (distance !== 'long') return;
  for (const p of placements) {
    if (p.cy >= horizon - 0.01) continue;
    if (p.wash || p.pop || p.heart || p.layer === 'sky') continue;
    p.alpha *= 0.34;
    p.ghost = true;
  }
}

function recede(y: number, horizon = 0.38) {
  const span = Math.max(0.2, 1.02 - horizon);
  return Math.max(0, Math.min(1, (y - horizon) / span));
}

function plantLawnEdge(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  horizon: number,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const n = 2_200 + Math.floor(rng() * 1_600);
  for (let i = 0; i < n; i++) {
    const side = pickWeighted(rng, ['bottom', 'left', 'right'] as const, [54, 23, 23]);
    let x: number;
    let y: number;
    if (side === 'bottom') {
      x = range(rng, -0.04, 1.04);
      y = range(rng, 0.88, 1.06);
    } else if (side === 'left') {
      x = range(rng, -0.05, 0.08);
      y = range(rng, Math.max(0.18, horizon - 0.02), 1.04);
    } else {
      x = range(rng, 0.92, 1.05);
      y = range(rng, Math.max(0.18, horizon - 0.02), 1.04);
    }
    placements.push({
      plate: pick(rng, pool),
      cx: x,
      cy: y,
      scale: range(rng, 0.018, 0.042),
      rot: markRot(rng, n),
      alpha: range(rng, 0.55, 0.95),
      ghost: false,
      travel: 0.84,
      layer: 'fore',
      lean: range(rng, 0.1, 0.42),
    });
  }
}

function plantDarkSubject(
  placements: Placement[],
  rng: () => number,
  pool: Catalog['heroes'],
  marks: Catalog['marks'],
  mode: Mode,
  horizon: number,
) {
  if (mode === 'close' || mode === 'solitary' || mode === 'triad') return;
  if (rng() < 0.48) return;
  const src = (pool.length ? pool : marks).length ? (pool.length ? pool : marks) : null;
  if (!src) return;
  const n = rng() < 0.7 ? 1 : 2;
  for (let i = 0; i < n; i++) {
    const x = range(rng, 0.1, 0.9);
    const y = horizon + range(rng, -0.02, 0.05);
    placements.push({
      plate: pick(rng, src),
      cx: x,
      cy: y,
      scale: range(rng, 0.035, 0.08),
      rot: range(rng, -12, 12),
      alpha: range(rng, 0.4, 0.72),
      ghost: false,
      travel: 0.2,
      layer: 'horizon',
      pass: 2,
      lean: range(rng, 0.04, 0.22),
    });
  }
}

function familyPigment(family: Family): number {
  if (family === 'garden') return 6;
  if (family === 'nikxname') return 1;
  if (family === 'water' || family === 'pool') return 4;
  if (family === 'sun') return 4;
  if (family === 'earth') return 2;
  return 2;
}

function rollAccent(_rng: () => number, family: Family, harmony: Harmony = 'full') {
  const base = familyPigment(family);
  if (harmony === 'flare') return (base + 1) % 8;
  return base;
}

type Light = { x: number; y: number; r: number; kind: 'sun' | 'moon' | 'none' };

function rollVanish(rng: () => number): Vanish {
  const slot = pickWeighted(
    rng,
    ['wander', 'phi', 'thirds', 'edge', 'high', 'low', 'off'] as const,
    [22, 14, 12, 18, 12, 10, 12],
  );
  if (slot === 'phi') return { x: phiPick(rng), y: phiPick(rng) };
  if (slot === 'thirds') {
    return { x: rng() < 0.5 ? 1 / 3 : 2 / 3, y: rng() < 0.5 ? 1 / 3 : 2 / 3 };
  }
  if (slot === 'edge') {
    return {
      x: rng() < 0.5 ? range(rng, -0.08, 0.16) : range(rng, 0.84, 1.08),
      y: range(rng, 0.1, 0.78),
    };
  }
  if (slot === 'high') return { x: range(rng, 0.06, 0.94), y: range(rng, -0.06, 0.22) };
  if (slot === 'low') return { x: range(rng, 0.06, 0.94), y: range(rng, 0.72, 1.08) };
  if (slot === 'off') {
    const side = pickWeighted(rng, ['n', 's', 'e', 'w'] as const, [22, 22, 28, 28]);
    if (side === 'n') return { x: range(rng, 0.08, 0.92), y: range(rng, -0.22, -0.02) };
    if (side === 's') return { x: range(rng, 0.08, 0.92), y: range(rng, 1.02, 1.22) };
    if (side === 'e') return { x: range(rng, 1.02, 1.22), y: range(rng, 0.12, 0.82) };
    return { x: range(rng, -0.22, -0.02), y: range(rng, 0.12, 0.82) };
  }
  return { x: range(rng, 0.08, 0.92), y: range(rng, 0.1, 0.86) };
}

function rollLight(rng: () => number, vanish: Vanish): Light {
  if (rng() < 0.3) return { x: 0.5, y: 0.18, r: 0, kind: 'none' };
  const kind = rng() < 0.64 ? 'sun' : 'moon';
  const r = kind === 'sun' ? range(rng, 0.12, 0.24) : range(rng, 0.06, 0.14);
  if (rng() < 0.46) {
    return {
      x: Math.max(-0.04, Math.min(1.04, vanish.x + range(rng, -0.1, 0.1))),
      y: Math.max(0.04, Math.min(0.48, vanish.y * 0.45 + range(rng, 0.04, 0.22))),
      r,
      kind,
    };
  }
  return {
    x: range(rng, 0.04, 0.96),
    y: range(rng, 0.04, 0.48),
    r,
    kind,
  };
}

/** Every study has a light. Luminance hangs off it. */
function rollStudyLight(rng: () => number, horizon: number, vanish: Vanish, skyShare: SkyShare): Light {
  const long = skyShare === 'vast' || skyShare === 'open';
  const seat = long
    ? pickWeighted(rng, ['low', 'side', 'back', 'high', 'off'] as const, [36, 22, 18, 14, 10])
    : pickWeighted(rng, ['low', 'side', 'high', 'back', 'off'] as const, [24, 24, 22, 16, 14]);
  const kind: Light['kind'] = rng() < 0.2 ? 'moon' : 'sun';
  const r = kind === 'sun' ? range(rng, 0.16, 0.34) : range(rng, 0.1, 0.2);
  if (seat === 'low') {
    return {
      x: Math.max(0.06, Math.min(0.94, vanish.x + range(rng, -0.22, 0.22))),
      y: Math.max(0.1, Math.min(horizon * 0.92, horizon * range(rng, 0.42, 0.88))),
      r,
      kind,
    };
  }
  if (seat === 'side') {
    return {
      x: rng() < 0.5 ? range(rng, -0.1, 0.2) : range(rng, 0.8, 1.1),
      y: range(rng, 0.08, Math.max(0.16, horizon * 0.62)),
      r,
      kind,
    };
  }
  if (seat === 'high') {
    return { x: range(rng, 0.16, 0.84), y: range(rng, 0.04, 0.26), r, kind };
  }
  if (seat === 'off') {
    return {
      x: rng() < 0.5 ? range(rng, -0.22, 0.02) : range(rng, 0.98, 1.22),
      y: range(rng, -0.06, 0.2),
      r: r * 1.15,
      kind,
    };
  }
  return {
    x: Math.max(0.08, Math.min(0.92, vanish.x + range(rng, -0.08, 0.08))),
    y: Math.max(0.06, horizon - range(rng, 0.05, 0.2)),
    r,
    kind,
  };
}

function lightAmt(x: number, y: number, light: Light) {
  if (light.kind === 'none' || light.r <= 0) return 0;
  const d = Math.hypot(x - light.x, y - light.y);
  const sigma = Math.max(0.16, light.r * 1.05);
  return Math.exp(-(d * d) / (2 * sigma * sigma));
}

function bloomPool(heroes: Catalog['heroes'], figures: Catalog['heroes']) {
  const blooms = heroes.filter((h) => h.kind === 'bloom');
  if (blooms.length) return blooms;
  return figures.length ? figures : heroes;
}

function plantFlower(
  placements: Placement[],
  rng: () => number,
  pool: Catalog['heroes'],
  family: Family,
  lastPass: number,
  x: number,
  y: number,
  scale: number,
  harmony: Harmony = 'full',
  opts?: {
    depth?: number;
    popMood?: PopMood;
    pass?: number;
    layer?: Placement['layer'];
    marks?: Catalog['marks'];
  },
) {
  const strokes = opts?.marks?.length ? opts.marks : pool;
  if (!strokes.length && !pool.length) return;
  const depth = opts?.depth ?? recede(y);
  const far = depth < 0.38;
  const mood = opts?.popMood ?? 'some';
  const layer: Placement['layer'] = opts?.layer ?? (far ? 'horizon' : depth < 0.62 ? 'mid' : 'fore');
  const pass = lastPass;
  const accent = rollAccent(rng, family, harmony);
  const blooms = pool.filter((p) => p.kind === 'bloom' || p.kind === 'figure');
  const useHero = !far && blooms.length > 0 && (mood === 'few' || rng() < 0.42);
  if (useHero) {
    placements.push({
      plate: pick(rng, blooms),
      cx: x,
      cy: y,
      scale: scale * range(rng, 0.92, 1.12),
      rot: range(rng, -22, 22),
      alpha: range(rng, 0.82, 1),
      ghost: false,
      travel: 0.94,
      layer: 'fore',
      pop: true,
      pass,
      lean: range(rng, 0.62, 0.96),
      accent,
    });
    if (rng() < 0.65) {
      placements.push({
        plate: pick(rng, strokes.length ? strokes : blooms),
        cx: x + range(rng, -0.006, 0.006),
        cy: y + range(rng, -0.006, 0.006),
        scale: scale * range(rng, 0.12, 0.22),
        rot: range(rng, -40, 40),
        alpha: range(rng, 0.7, 0.95),
        ghost: false,
        travel: 0.97,
        layer: 'fore',
        pass,
        heart: true,
        lean: range(rng, 0.84, 1),
      });
    }
    return;
  }
  if (!strokes.length) return;
  const baseA = far ? range(rng, 0.32, 0.58) : range(rng, 0.58, 0.9);
  const nPetal = far ? 4 + Math.floor(rng() * 3) : 6 + Math.floor(rng() * 4);
  const under = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < under; i++) {
    placements.push({
      plate: pick(rng, strokes),
      cx: x + range(rng, -scale * 0.1, scale * 0.1),
      cy: y + range(rng, -scale * 0.08, scale * 0.08),
      scale: scale * range(rng, 0.5, 0.92),
      rot: range(rng, -180, 180),
      alpha: baseA * range(rng, 0.22, 0.48),
      ghost: true,
      travel: 0.7 + depth * 0.2,
      layer,
      pop: true,
      pass,
      lean: range(rng, 0.32, 0.68),
      accent,
    });
  }
  for (let i = 0; i < nPetal; i++) {
    const a = (i / nPetal) * Math.PI * 2 + range(rng, -0.28, 0.28);
    const r = scale * range(rng, 0.1, 0.36);
    placements.push({
      plate: pick(rng, strokes),
      cx: x + Math.cos(a) * r,
      cy: y + Math.sin(a) * r * 0.78,
      scale: scale * range(rng, 0.2, 0.46),
      rot: (a * 180) / Math.PI + range(rng, -32, 32),
      alpha: baseA * range(rng, 0.5, 1),
      ghost: far || rng() < 0.22,
      travel: 0.78 + depth * 0.18,
      layer,
      pop: true,
      pass,
      lean: range(rng, 0.52, 0.96),
      accent,
    });
  }
  if (!far) {
    const lights = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < lights; i++) {
      placements.push({
        plate: pick(rng, strokes),
        cx: x + range(rng, -scale * 0.05, scale * 0.05),
        cy: y + range(rng, -scale * 0.04, scale * 0.04),
        scale: scale * range(rng, 0.08, 0.2),
        rot: range(rng, -70, 70),
        alpha: range(rng, 0.5, 0.92),
        ghost: i > 0,
        travel: 0.96,
        layer: 'fore',
        pass,
        heart: i === 0,
        pop: i > 0,
        accent,
        lean: range(rng, 0.82, 1),
      });
    }
  }
}

function plantMassPops(
  placements: Placement[],
  rng: () => number,
  heroes: Catalog['heroes'],
  figures: Catalog['heroes'],
  family: Family,
  lastPass: number,
  hosts: { x: number; y: number }[],
  harmony: Harmony = 'full',
  popMood: PopMood = 'some',
  marks: Catalog['marks'] = [],
) {
  if (popMood === 'none') return;
  const pool = bloomPool(heroes, figures);
  if (hosts.length < 4) return;
  const dark = hosts.filter((h) => h.y > 0.52);
  const seats = dark.length >= 3 ? dark : hosts;
  const n =
    popMood === 'few'
      ? 1 + Math.floor(rng() * 4)
      : popMood === 'some'
        ? 4 + Math.floor(rng() * 7)
        : 8 + Math.floor(rng() * 10);
  for (let i = 0; i < n; i++) {
    const h = pick(rng, seats);
    const y = Math.max(0.48, Math.min(0.98, h.y + range(rng, -0.06, 0.08)));
    plantFlower(
      placements,
      rng,
      pool,
      family,
      lastPass,
      Math.max(0.02, Math.min(0.98, h.x + range(rng, -0.08, 0.08))),
      y,
      range(rng, popMood === 'few' ? 0.07 : 0.05, popMood === 'many' ? 0.12 : 0.1) *
        (0.75 + recede(y) * 0.4),
      harmony,
      { depth: recede(y), popMood, marks },
    );
  }
}

/** Pale blossoms across the land — a Dutch field, not one corner cluster. */
function plantLightField(
  placements: Placement[],
  rng: () => number,
  heroes: Catalog['heroes'],
  figures: Catalog['heroes'],
  family: Family,
  lastPass: number,
  hosts: { x: number; y: number }[],
  harmony: Harmony = 'full',
  popMood: PopMood = 'some',
  marks: Catalog['marks'] = [],
) {
  if (popMood === 'none' || popMood === 'few') return;
  const pool = bloomPool(heroes, figures);
  const seats =
    hosts.length >= 6
      ? hosts.filter((h) => h.y > 0.5)
      : placements
          .filter((p) => !p.wash && !p.stem && p.layer !== 'sky' && p.cy > 0.5)
          .slice(0, 120)
          .map((p) => ({ x: p.cx, y: p.cy }));
  const dark = seats.length ? seats : hosts;
  if (dark.length < 4) return;
  const n = popMood === 'some' ? 3 + Math.floor(rng() * 5) : 6 + Math.floor(rng() * 8);
  for (let i = 0; i < n; i++) {
    const h = pick(rng, dark);
    const y = Math.max(0.5, Math.min(0.98, h.y + range(rng, -0.06, 0.08)));
    plantFlower(
      placements,
      rng,
      pool,
      family,
      lastPass,
      Math.max(0.02, Math.min(0.98, h.x + range(rng, -0.1, 0.1))),
      y,
      range(rng, 0.04, 0.08),
      harmony,
      { depth: recede(y), popMood, marks },
    );
  }
}

function plantHeroBlooms(
  placements: Placement[],
  rng: () => number,
  heroes: Catalog['heroes'],
  figures: Catalog['heroes'],
  mode: Mode,
  family: Family,
  lastPass: number,
  vanish: Vanish,
  horizon: number,
  harmony: Harmony = 'full',
  popMood: PopMood = 'some',
  marks: Catalog['marks'] = [],
) {
  if (popMood === 'none') return;
  const pool = bloomPool(heroes, figures);
  const likely = mode === 'close' ? 0.7 : popMood === 'few' ? 0.82 : 0.9;
  if (rng() > likely) return;
  const n =
    popMood === 'few'
      ? pickWeighted(rng, [1, 2, 3], [40, 40, 20])
      : popMood === 'some'
        ? pickWeighted(rng, [2, 3, 4], [40, 40, 20])
        : pickWeighted(rng, [3, 5, 7], [40, 40, 20]);
  const clusterRight = rng() < 0.58;
  const ox = clusterRight ? range(rng, 0.58, 0.9) : range(rng, 0.1, 0.42);
  const oy = range(rng, 0.7, 0.94);
  for (let i = 0; i < n; i++) {
    let x: number;
    let y: number;
    let s: number;
    if (i === 0) {
      x = ox;
      y = oy;
      s = popMood === 'few' ? range(rng, 0.045, 0.09) : range(rng, 0.08, 0.14);
    } else if (i === 1) {
      const a = range(rng, 0.4, 2.6) * (rng() < 0.5 ? 1 : -1);
      const d = range(rng, 0.06, 0.14);
      x = Math.max(0.08, Math.min(0.92, ox + Math.cos(a) * d));
      y = Math.max(0.62, Math.min(0.96, oy + Math.sin(a) * d * 0.7));
      s = range(rng, 0.035, 0.08);
    } else {
      x = clusterRight ? range(rng, 0.12, 0.4) : range(rng, 0.6, 0.9);
      y = range(rng, 0.72, 0.95);
      s = range(rng, 0.03, 0.06);
    }
    plantFlower(placements, rng, pool, family, lastPass, x, y, s, harmony, {
      depth: recede(y, horizon),
      popMood: 'few',
      marks,
    });
  }
}

function plantLeadPops(
  placements: Placement[],
  rng: () => number,
  heroes: Catalog['heroes'],
  figures: Catalog['heroes'],
  family: Family,
  lastPass: number,
  vanish: Vanish,
  horizon: number,
  harmony: Harmony,
  popMood: PopMood,
  marks: Catalog['marks'],
) {
  const pool = bloomPool(heroes, figures);
  if (!pool.length && !marks.length) return;
  const n =
    popMood === 'none'
      ? rng() < 0.58
        ? 1
        : 0
      : popMood === 'few'
        ? 1
        : popMood === 'some'
          ? pickWeighted(rng, [1, 2], [62, 38])
          : pickWeighted(rng, [1, 2, 3], [40, 40, 20]);
  if (!n) return;
  const stemPool = marks.length ? marks : pool;
  const stemPass = Math.max(2, lastPass - 1);
  for (let i = 0; i < n; i++) {
    const x = range(rng, 0.12, 0.88);
    const across = rng() < 0.74;
    const yTip = across
      ? range(rng, Math.max(0.12, horizon - 0.2), horizon + 0.12)
      : range(rng, 0.58, 0.9);
    const yRoot = Math.min(1.02, Math.max(yTip + 0.12, horizon + range(rng, 0.1, 0.38)));
    const sway = (rng() < 0.5 ? -1 : 1) * range(rng, 0.04, 0.14);
    const steps = 40 + Math.floor(rng() * 50);
    for (let s = 0; s < steps; s++) {
      const t = s / Math.max(1, steps - 1);
      const cx = x + Math.sin(t * Math.PI) * sway * (0.4 + t);
      const cy = yRoot + (yTip - yRoot) * t;
      placements.push({
        plate: pick(rng, stemPool),
        cx,
        cy,
        scale: range(rng, 0.012, 0.026) * (0.7 + Math.sin(t * Math.PI) * 0.4),
        rot: range(rng, -10, 10),
        alpha: range(rng, 0.55, 0.9),
        ghost: false,
        travel: 0.15 + t * 0.2,
        layer: cy < horizon ? 'horizon' : 'fore',
        pass: stemPass,
        stem: true,
        lean: range(rng, 0.04, 0.24),
      });
    }
    const scale =
      i === 0
        ? rng() < 0.22
          ? range(rng, 0.2, 0.32)
          : range(rng, 0.09, 0.18)
        : range(rng, 0.05, 0.1);
    plantFlower(placements, rng, pool, family, lastPass, x, yTip, scale, harmony, {
      depth: recede(Math.max(horizon + 0.02, yTip), horizon),
      popMood: 'few',
      marks,
    });
  }
}

function plantGroundWash(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  fieldN: number,
  light: Light,
  vanish: Vanish,
  horizon: number,
  distance: Distance,
  skyline: Skyline = 'blend',
) {
  const poolSrc = marks.length ? marks : heroes;
  if (!poolSrc.length) return;
  const pool = Array.from({ length: Math.min(10, poolSrc.length) }, () => pick(rng, poolSrc));
  const washN = fieldN < 2_000 ? 14_000 + Math.floor(rng() * 4_000) : 20_000 + Math.floor(rng() * 8_000);
  const skyShare =
    skyline === 'blend' || distance === 'long'
      ? range(rng, 0.04, 0.1)
      : distance === 'short'
        ? 0.22
        : 0.16;
  for (let i = 0; i < washN; i++) {
    const inSky = rng() < skyShare;
    let y: number;
    if (inSky) {
      y = rng() < 0.24 ? range(rng, -0.08, 0.07) : -0.06 + Math.pow(rng(), 0.55) * (horizon + 0.05);
    } else {
      y = horizon + Math.pow(rng(), 0.82) * (1.06 - horizon);
    }
    const x = rng() < 0.2 ? (rng() < 0.5 ? range(rng, -0.06, 0.08) : range(rng, 0.92, 1.06)) : rng();
    const glow = lightAmt(x, y, light);
    const nearTop = y < 0.1;
    const fat = rng() < (nearTop ? 0.42 : 0.24);
    placements.push({
      plate: pick(rng, pool),
      cx: x,
      cy: y,
      scale: fat ? range(rng, 0.04, 0.07) : range(rng, 0.022, 0.045),
      rot: markRot(rng, washN),
      alpha: (inSky ? range(rng, 0.28, 0.62) : range(rng, 0.42, 0.82)) + glow * 0.08,
      ghost: inSky && !nearTop,
      travel: Math.max(0, Math.min(1, y)),
      layer: inSky ? 'sky' : y < horizon + 0.1 ? 'horizon' : 'mid',
      pass: 1,
      wash: true,
      lean: Math.max(
        0,
        Math.min(
          1,
          inSky
            ? range(rng, 0.7, 1) + glow * 0.12
            : range(rng, 0.02, 0.28) + recede(y, horizon) * 0.1 + glow * 0.22,
        ),
      ),
    });
  }
  if (light.kind === 'none') return;
  const disc = light.kind === 'sun' ? 340 + Math.floor(rng() * 160) : 160 + Math.floor(rng() * 90);
  const intoFrame = light.y < 0.42;
  for (let i = 0; i < disc; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = Math.pow(rng(), 0.62) * light.r * 1.15;
    let dx = Math.cos(ang) * rad;
    let dy = Math.sin(ang) * rad * 0.72;
    if (intoFrame && dy < 0) dy = -dy * range(rng, 0.15, 0.55);
    placements.push({
      plate: pick(rng, pool),
      cx: light.x + dx,
      cy: light.y + dy,
      scale: range(rng, 0.03, 0.07),
      rot: markRot(rng, disc),
      alpha: range(rng, 0.62, 1),
      ghost: rng() < 0.18,
      travel: 0.06,
      layer: 'sky',
      pass: 1,
      wash: true,
      lean: range(rng, 0.86, 1),
    });
  }
}

function plantHearts(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  lastPass: number,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const hosts = placements.filter((p) => p.pop && (p.scale ?? 0) >= 0.055 && !p.wash && !p.heart);
  for (const p of hosts) {
    if (rng() < 0.12) continue;
    placements.push({
      plate: pick(rng, pool),
      cx: p.cx + range(rng, -0.006, 0.006),
      cy: p.cy + range(rng, -0.006, 0.006),
      scale: p.scale * range(rng, 0.16, 0.3),
      rot: range(rng, -40, 40),
      alpha: range(rng, 0.78, 1),
      ghost: false,
      travel: 0.96,
      layer: 'fore',
      pass: lastPass,
      heart: true,
      lean: range(rng, 0.82, 1),
    });
  }
}

function plantStreetEdge(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  family: Family,
  lastPass: number,
  street: StreetEdge,
  harmony: Harmony = 'full',
  flowers = true,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const steps = 90 + Math.floor(rng() * 70);
  const midX = (street.x0 + street.x1) / 2 + range(rng, -0.06, 0.06);
  const midY = (street.y0 + street.y1) / 2 + range(rng, -0.04, 0.04);
  for (let s = 0; s < steps; s++) {
    const t = s / Math.max(1, steps - 1);
    const u = 1 - t;
    const cx = u * u * street.x0 + 2 * u * t * midX + t * t * street.x1 + range(rng, -0.008, 0.008);
    const cy = u * u * street.y0 + 2 * u * t * midY + t * t * street.y1 + range(rng, -0.006, 0.006);
    placements.push({
      plate: pick(rng, pool),
      cx,
      cy,
      scale: range(rng, 0.012, 0.028),
      rot: range(rng, -12, 12),
      alpha: range(rng, 0.55, 0.9),
      ghost: false,
      travel: 0.35,
      layer: 'fore',
      pass: Math.max(2, lastPass - 1),
      stem: true,
      lean: range(rng, 0.02, 0.22),
    });
  }
  const blooms = bloomPool(heroes, heroes.filter((h) => h.kind === 'figure'));
  if (!flowers || !blooms.length) return;
  const nBloom = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < nBloom; i++) {
    const t = 0.08 + (i / Math.max(1, nBloom - 1)) * 0.84 + range(rng, -0.04, 0.04);
    const u = 1 - t;
    const cx = u * u * street.x0 + 2 * u * t * midX + t * t * street.x1 + range(rng, -0.03, 0.03);
    const cy = u * u * street.y0 + 2 * u * t * midY + t * t * street.y1 + range(rng, -0.04, 0.02);
    const near = 1 - t;
    plantFlower(
      placements,
      rng,
      blooms,
      family,
      lastPass,
      cx,
      cy,
      range(rng, 0.06, 0.11) + near * range(rng, 0.05, 0.12),
      harmony,
      { depth: near, popMood: nBloom <= 2 ? 'few' : 'some', marks },
    );
  }
}

function plantPopStems(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  branches: BranchStamp[],
  plates: Catalog['branches'],
  lastPass: number,
  family: Family,
  harmony: Harmony = 'full',
  vineAxis: VineAxis | null = null,
  popMood: PopMood = 'some',
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const hosts = placements
    .filter((p) => p.pop && p.scale >= 0.08 && !p.wash && !p.heart && !p.stem)
    .sort((a, b) => b.scale - a.scale)
    .slice(0, pickWeighted(rng, [0, 1, 2], popMood === 'few' || popMood === 'some' ? [10, 40, 50] : [12, 28, 60]));
  const stemPass = Math.max(2, lastPass - 1);
  for (const p of hosts) {
    const side = pickVineSide(rng, vineAxis);
    const pin =
      side === 'top'
        ? pinPastEdge(side, Math.max(0.08, Math.min(0.92, p.cx + range(rng, -0.05, 0.05))), rng)
        : {
            cx: p.cx + range(rng, -0.08, 0.08),
            cy: Math.min(1.02, Math.max(p.cy + 0.1, 0.62)),
          };
    if (rng() < 0.84) {
      const brace = braceToBloom(p, rng, plates ?? [], vineAxis);
      if (brace) {
        brace.scale *= 0.62;
        brace.alpha *= 0.85;
        branches.push(brace);
      }
    }
    const steps = pickWeighted(rng, [89, 144, 233], [36, 44, 20]);
    const sway = (rng() < 0.5 ? -1 : 1) * range(rng, 0.1, 0.26);
    const midX = (pin.cx + p.cx) / 2 + sway;
    const midY = (pin.cy + p.cy) / 2 + range(rng, -0.16, 0.16);
    const dx = p.cx - pin.cx;
    const dy = p.cy - pin.cy;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const leafAt = 0.35 + rng() * 0.3;
    const meander = range(rng, 0.035, 0.11);
    const waves = 1.15 + rng() * 1.7;
    const curve: { t: number; x: number; y: number }[] = [];
    for (let s = 0; s < steps; s++) {
      const t = ((s + 0.35) / steps) * 0.92;
      const u = 1 - t;
      let cx = u * u * pin.cx + 2 * u * t * midX + t * t * p.cx;
      let cy = u * u * pin.cy + 2 * u * t * midY + t * t * p.cy;
      const bend = Math.sin(t * Math.PI * waves) * meander;
      cx += px * bend;
      cy += py * bend * 0.45;
      curve.push({ t, x: cx, y: cy });
      placements.push({
        plate: pick(rng, pool),
        cx,
        cy,
        scale: range(rng, 0.016, 0.032) * (0.75 + Math.sin(t * Math.PI) * 0.45),
        rot: range(rng, -8, 8),
        alpha: range(rng, 0.62, 0.92),
        ghost: false,
        travel: 0.12 + t * 0.2,
        layer: 'fore',
        pass: stemPass,
        stem: true,
        lean: range(rng, 0.04, 0.22),
      });
      if (Math.abs(t - leafAt) < 0.04 && rng() < 0.85) {
        const off = range(rng, 0.018, 0.04) * (rng() < 0.5 ? -1 : 1);
        placements.push({
          plate: pick(rng, pool),
          cx: cx + px * off,
          cy: cy + py * off * 0.6,
          scale: range(rng, 0.028, 0.055),
          rot: range(rng, -28, 28),
          alpha: range(rng, 0.7, 0.95),
          ghost: false,
          travel: 0.2,
          layer: 'fore',
          pass: stemPass,
          stem: true,
          lean: range(rng, 0.08, 0.32),
        });
      }
    }
    const blooms = bloomPool(heroes, heroes.filter((h) => h.kind === 'figure'));
    if (blooms.length && curve.length && popMood !== 'none') {
      const nOn =
        popMood === 'few' ? 1 + Math.floor(rng() * 2) : popMood === 'some' ? 3 + Math.floor(rng() * 3) : 1;
      for (let k = 0; k < nOn; k++) {
        const t = 0.22 + (k / Math.max(1, nOn - 1)) * 0.72 + range(rng, -0.04, 0.04);
        const at = curve[Math.max(0, Math.min(curve.length - 1, Math.floor(t * (curve.length - 1))))];
        plantFlower(
          placements,
          rng,
          blooms,
          family,
          lastPass,
          Math.max(0.08, Math.min(0.92, at.x)),
          Math.max(0.08, Math.min(0.94, at.y)),
          k === nOn - 1 ? range(rng, 0.08, 0.14) : range(rng, 0.05, 0.09),
          harmony,
          { depth: recede(at.y), popMood, marks },
        );
      }
    }
  }
}

function plantGrass(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  lastPass: number,
  grassMood: GrassMood,
  horizon: number,
) {
  const pool = marks.filter((m) => m.id.startsWith('blade-'));
  if (!pool.length || grassMood === 'none') return;
  const n =
    grassMood === 'sparse'
      ? 800 + Math.floor(rng() * 1200)
      : grassMood === 'mid'
        ? 2600 + Math.floor(rng() * 2200)
        : 5600 + Math.floor(rng() * 3200);
  const patchN = grassMood === 'sparse' ? 2 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * (grassMood === 'thick' ? 6 : 4));
  const patches = Array.from({ length: patchN }, () => ({
    x: range(rng, 0.04, 0.96),
    y: range(rng, Math.max(0.42, horizon), 0.98),
    r: range(rng, 0.05, grassMood === 'thick' ? 0.24 : 0.12),
    lean: range(rng, -30, 30),
  }));
  const y0 = Math.max(0.3, horizon - 0.04);
  const pass = Math.max(2, lastPass - 1);
  const patchChance = grassMood === 'sparse' ? 0.5 : grassMood === 'thick' ? 0.78 : 0.66;
  for (let i = 0; i < n; i++) {
    let x: number;
    let y: number;
    let lean: number;
    if (patches.length && rng() < patchChance) {
      const p = pick(rng, patches);
      const a = rng() * Math.PI * 2;
      const d = Math.pow(rng(), 0.62) * p.r;
      x = p.x + Math.cos(a) * d;
      y = p.y + Math.sin(a) * d * 0.52;
      lean = p.lean;
    } else {
      x = rng();
      y = y0 + Math.pow(rng(), grassMood === 'thick' ? 0.48 : 0.72) * (1.02 - y0);
      lean = range(rng, -18, 18);
    }
    placements.push({
      plate: pick(rng, pool),
      cx: Math.max(0.01, Math.min(0.99, x)),
      cy: Math.max(0.1, Math.min(1.02, y)),
      scale: range(rng, 0.01, grassMood === 'thick' ? 0.03 : 0.036) * (y > 0.78 ? 1.18 : 0.8),
      rot: lean + range(rng, -14, 14),
      alpha: range(rng, 0.26, grassMood === 'thick' ? 0.84 : 0.7),
      ghost: rng() < 0.14,
      travel: 0.4 + rng() * 0.4,
      layer: y < horizon + 0.08 ? 'horizon' : y < 0.7 ? 'mid' : 'fore',
      pass,
      stem: true,
      lean: range(rng, 0.04, 0.28),
    });
  }
}

/** Free-flowing vertical trunks — dense stem marks, not a single dashed line. */
function plantTrunks(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  lastPass: number,
  vineAxis: VineAxis | null = null,
  family: Family = 'garden',
  harmony: Harmony = 'full',
  popMood: PopMood = 'some',
  vanish: Vanish = { x: 0.5, y: 0.4 },
  horizon = 0.42,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const hang = vineAxis === 'top';
  const rise = vineAxis === 'bottom' || !hang;
  if (hang && rng() < 0.45) {
    /* pergola still allowed, but Study-161 rises from the land */
  }
  const nTrunks = hang
    ? 4 + Math.floor(rng() * 4)
    : 6 + Math.floor(rng() * 10);
  const stemPass = Math.max(2, lastPass - 1);
  for (let i = 0; i < nTrunks; i++) {
    const fromTop = hang && rng() < 0.55;
    const near = Math.pow(rng(), 0.55);
    const side = rng() < 0.5 ? -1 : 1;
    const x0 = fromTop
      ? 0.08 + (i / Math.max(1, nTrunks - 1)) * 0.84 + range(rng, -0.03, 0.03)
      : vanish.x + side * (0.05 + near * range(rng, 0.28, 0.48));
    const y0 = fromTop ? range(rng, -0.1, 0.04) : horizon + 0.04 + near * range(rng, 0.12, 0.28);
    const y1 = fromTop
      ? range(rng, 0.55, 1.02)
      : horizon - near * range(rng, 0.06, 0.28);
    const midX = x0 + range(rng, hang ? -0.05 : -0.12, hang ? 0.05 : 0.12);
    const midY = (y0 + y1) / 2 + range(rng, -0.1, 0.1);
    const steps = pickWeighted(rng, [34, 55], [60, 40]);
    const lean = range(rng, -0.08, 0.08);
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.4) / steps;
      const u = 1 - t;
      const cx = u * u * x0 + 2 * u * t * midX + t * t * (x0 + lean) + range(rng, -0.01, 0.01);
      const cy = u * u * y0 + 2 * u * t * midY + t * t * y1 + range(rng, -0.008, 0.008);
      placements.push({
        plate: pick(rng, pool),
        cx,
        cy,
        scale: range(rng, 0.008, 0.02) * (0.55 + near * 0.7) * (1.08 - t * 0.3),
        rot: range(rng, -8, 8),
        alpha: range(rng, 0.48, 0.86),
        ghost: false,
        travel: 0.1 + t * 0.22,
        layer: cy < 0.4 ? 'mid' : 'fore',
        pass: stemPass,
        stem: true,
        lean: range(rng, 0.02, 0.24),
      });
    }
    const blooms = bloomPool(heroes, heroes.filter((h) => h.kind === 'figure' || h.kind === 'bloom'));
    if (popMood !== 'none' && blooms.length && (popMood === 'few' ? rise : rng() < 0.4)) {
      const nOn = popMood === 'few' ? 1 + Math.floor(rng() * 2) : 1;
      for (let k = 0; k < nOn; k++) {
        const t = fromTop ? 0.35 + k * 0.28 : 0.55 + k * 0.28;
        const u = 1 - t;
        const fx = u * u * x0 + 2 * u * t * midX + t * t * (x0 + lean);
        const fy = u * u * y0 + 2 * u * t * midY + t * t * y1;
        plantFlower(
          placements,
          rng,
          blooms,
          family,
          lastPass,
          Math.max(0.08, Math.min(0.92, fx)),
          Math.max(0.08, Math.min(0.9, fy)),
          k === 0 ? range(rng, 0.08, 0.14) : range(rng, 0.055, 0.1),
          harmony,
          { depth: recede(fy), popMood, marks },
        );
      }
    }
  }
}

/** Dense stem ribbon along a golden / Fibonacci spine. */
function plantFlowSpine(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  flow: FlowKind,
  lastPass: number,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  if (flow !== 'phi-spiral' && flow !== 'fibonacci' && flow !== 'whirl' && flow !== 'fan' && flow !== 'arc') return;
  const n = pickWeighted(rng, [34, 55], [55, 45]);
  const pts = flowPoints(flow, n, rng);
  const stemPass = Math.max(2, lastPass - 1);
  for (const p of pts) {
    placements.push({
      plate: pick(rng, pool),
      cx: p.x + range(rng, -0.01, 0.01),
      cy: p.y + range(rng, -0.01, 0.01),
      scale: range(rng, 0.01, 0.022),
      rot: range(rng, -8, 8),
      alpha: range(rng, 0.48, 0.84),
      ghost: false,
      travel: p.t,
      layer: p.y < 0.42 ? 'mid' : 'fore',
      pass: stemPass,
      stem: true,
      lean: range(rng, 0.04, 0.26),
    });
  }
}

function plantGlaze(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  pass: number,
  horizon: number,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const n = 1_400 + Math.floor(rng() * 1_400);
  for (let i = 0; i < n; i++) {
    const x = rng();
    const y = horizon + rng() * (1.02 - horizon);
    placements.push({
      plate: pick(rng, pool),
      cx: x,
      cy: y,
      scale: range(rng, 0.016, 0.038),
      rot: markRot(rng, n),
      alpha: range(rng, 0.1, 0.28),
      ghost: true,
      travel: 0.4 + rng() * 0.2,
      layer: 'mid',
      pass,
      lean: range(rng, 0.12, 0.48),
    });
  }
}

function plantVeil(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  family: Family,
  pass: number,
  harmony: Harmony = 'full',
  horizon = 0.38,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const n = 520 + Math.floor(rng() * 520);
  for (let i = 0; i < n; i++) {
    const x = rng();
    const y = Math.max(horizon, 0.45) + rng() * 0.55;
    placements.push({
      plate: pick(rng, pool),
      cx: x,
      cy: Math.min(1.02, y),
      scale: range(rng, 0.012, 0.032),
      rot: markRot(rng, n),
      alpha: range(rng, 0.1, 0.26),
      ghost: true,
      travel: 0.55 + rng() * 0.2,
      layer: 'fore',
      pass,
      pop: false,
      accent: rollAccent(rng, family, harmony),
      lean: range(rng, 0.62, 0.98),
    });
  }
}

function plantSkyLate(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  pass: number,
  horizon: number,
  vanish: Vanish,
  light: Light,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const n = 1_200 + Math.floor(rng() * 1_400);
  for (let i = 0; i < n; i++) {
    const towardPinch = rng() < 0.38;
    const x = towardPinch ? vanish.x + range(rng, -0.28, 0.28) : rng();
    const y = -0.04 + Math.pow(rng(), 0.72) * (horizon + 0.04);
    const pinch = Math.exp(-((x - vanish.x) ** 2 + (y - horizon) ** 2) / 0.12);
    placements.push({
      plate: pick(rng, pool),
      cx: x,
      cy: y,
      scale: range(rng, 0.03, 0.07),
      rot: markRot(rng, n),
      alpha: range(rng, 0.08, 0.28) + pinch * 0.12,
      ghost: true,
      travel: 0.12,
      layer: 'sky',
      pass,
      wash: true,
      lean: range(rng, 0.72, 1) + (light.kind !== 'none' ? pinch * 0.08 : 0),
    });
  }
}

function plantScumble(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  pass: number,
  horizon: number,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const n = 900 + Math.floor(rng() * 900);
  for (let i = 0; i < n; i++) {
    const x = rng();
    const y = horizon + rng() * (1.02 - horizon);
    placements.push({
      plate: pick(rng, pool),
      cx: x,
      cy: y,
      scale: range(rng, 0.01, 0.026),
      rot: markRot(rng, n),
      alpha: range(rng, 0.08, 0.22),
      ghost: true,
      travel: 0.7 + rng() * 0.2,
      layer: 'fore',
      pass,
      lean: range(rng, 0.78, 1),
    });
  }
}

function plantFinale(
  placements: Placement[],
  rng: () => number,
  heroes: Catalog['heroes'],
  figures: Catalog['heroes'],
  marks: Catalog['marks'],
  family: Family,
  pass: number,
  harmony: Harmony = 'full',
) {
  const pool = marks.length ? marks : heroes;
  if (pool.length && rng() < 0.55) {
    plantFlower(
      placements,
      rng,
      heroes,
      family,
      pass,
      range(rng, 0.18, 0.82),
      range(rng, 0.62, 0.9),
      range(rng, 0.08, 0.16),
      harmony,
      { depth: 0.85, popMood: 'few', marks },
    );
  }
  if (!pool.length) return;
  const fleck = 400 + Math.floor(rng() * 280);
  for (let i = 0; i < fleck; i++) {
    const cy = range(rng, 0.55, 0.98);
    placements.push({
      plate: pick(rng, pool),
      cx: rng(),
      cy,
      scale: range(rng, 0.008, 0.02),
      rot: range(rng, -80, 80),
      alpha: range(rng, 0.12, 0.32),
      ghost: true,
      travel: 0.9,
      layer: 'fore',
      pass,
      lean: range(rng, 0.8, 1),
    });
  }
}

function plantDepthVeil(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  horizon: number,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const n = 8 + Math.floor(rng() * 18);
  for (let i = 0; i < n; i++) {
    const x = rng();
    const y = horizon + rng() * (1.02 - horizon);
    placements.push({
      plate: pick(rng, pool),
      cx: x,
      cy: y,
      scale: range(rng, 0.008, 0.024),
      rot: range(rng, -80, 80),
      alpha: range(rng, 0.08, 0.24),
      ghost: true,
      travel: rng(),
      layer: 'fore',
      lean: range(rng, 0.55, 0.95),
    });
  }
}

function plantHighlights(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  family: Family,
  lastPass: number,
  harmony: Harmony,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const hosts = placements.filter((p) => p.pop && !p.wash && !p.stem && !p.heart);
  const n = 520 + Math.floor(rng() * 580);
  for (let i = 0; i < n; i++) {
    let cx = rng();
    let cy = range(rng, 0.48, 0.98);
    let scale = range(rng, 0.005, 0.014);
    if (hosts.length && rng() < 0.78) {
      const h = pick(rng, hosts);
      const a = rng() * Math.PI * 2;
      const d = Math.pow(rng(), 0.55) * h.scale * 0.58;
      cx = h.cx + Math.cos(a) * d;
      cy = h.cy + Math.sin(a) * d * 0.86;
      scale = h.scale * range(rng, 0.035, 0.11);
    }
    placements.push({
      plate: pick(rng, pool),
      cx,
      cy,
      scale,
      rot: range(rng, -80, 80),
      alpha: range(rng, 0.22, 0.58),
      ghost: true,
      travel: 0.94,
      layer: 'fore',
      pass: lastPass,
      pop: true,
      accent: rollAccent(rng, family, harmony),
      lean: range(rng, 0.82, 1),
    });
  }
}

function plantFibPetals(
  placements: Placement[],
  rng: () => number,
  marks: Catalog['marks'],
  heroes: Catalog['heroes'],
  path: PaintPath,
  lastPass: number,
) {
  const pool = marks.length ? marks : heroes;
  if (!pool.length) return;
  const pathFit = path === 'fibonacci' || path === 'phi-spiral' || path === 'whirl';
  if (!pathFit && rng() > 0.55) return;
  if (pathFit) {
    const kind = path === 'whirl' ? 'whirl' : path === 'phi-spiral' ? 'phi-spiral' : 'fibonacci';
    const n = 55 + Math.floor(rng() * 80);
    const pts = flowPoints(kind, n, rng);
    for (const p of pts) {
      placements.push({
        plate: pick(rng, pool),
        cx: p.x + range(rng, -0.012, 0.012),
        cy: p.y + range(rng, -0.012, 0.012),
        scale: range(rng, 0.01, 0.03),
        rot: range(rng, -50, 50),
        alpha: range(rng, 0.1, 0.3),
        ghost: true,
        travel: p.t,
        layer: 'mid',
        pass: Math.max(2, lastPass - 1),
        lean: range(rng, 0.55, 0.95),
      });
    }
  }
  const clusters = 2 + Math.floor(rng() * 4);
  for (let c = 0; c < clusters; c++) {
    const ox = range(rng, 0.08, 0.92);
    const oy = range(rng, 0.08, 0.72);
    const n = pickWeighted(rng, [21, 34, 55], [36, 40, 24]);
    const rad = range(rng, 0.04, 0.14);
    for (let i = 0; i < n; i++) {
      const a = i * GOLDEN_ANGLE;
      const r = rad * Math.sqrt((i + 0.5) / n);
      placements.push({
        plate: pick(rng, pool),
        cx: ox + Math.cos(a) * r,
        cy: oy + Math.sin(a) * r * 0.86,
        scale: range(rng, 0.008, 0.022),
        rot: (a * 180) / Math.PI + range(rng, -12, 12),
        alpha: range(rng, 0.08, 0.24),
        ghost: true,
        travel: i / n,
        layer: oy < 0.38 ? 'sky' : 'mid',
        pass: Math.max(2, lastPass - 1),
        lean: range(rng, 0.6, 0.98),
      });
    }
  }
}

function applyView(placements: Placement[], view: ViewLean, rng: () => number, mode: Mode, vanish: Vanish) {
  if (!placements.length) return;
  const gentle = mode === 'wave' || mode === 'bloom' || mode === 'sheet' || mode === 'flow';
  const vx = vanish.x;
  const vy = vanish.y;
  if (view === 'flat') {
    if (mode === 'meadow' || mode === 'field') {
      const horizon = Math.max(0.12, Math.min(0.56, vy * 0.4 + range(rng, 0.16, 0.36)));
      for (const p of placements) {
        const near = Math.max(0, Math.min(1, (p.cy - horizon) / Math.max(0.2, 1 - horizon)));
        p.scale *= 0.55 + near * 0.7;
      }
    }
    const amt = gentle ? 0.1 : 0.16;
    for (const p of placements) {
      const sky = Math.max(0, 1 - p.cy);
      p.cx = p.cx + (vx - p.cx) * amt * sky;
    }
    return;
  }
  if (view === 'rise') {
    const horizon = Math.max(0.08, Math.min(0.52, vy < 0.55 ? vy : range(rng, 0.14, 0.4)));
    for (const p of placements) {
      if (p.wash || p.layer === 'sky') continue;
      const near = Math.max(0, Math.min(1, (p.cy - horizon) / Math.max(0.2, 1 - horizon)));
      if (!gentle) {
        p.cy = horizon + (p.cy - horizon) * (0.58 + near * 0.48);
        p.cx = vx + (p.cx - vx) * (0.58 + near * 0.46);
      } else {
        p.cx = vx + (p.cx - vx) * (0.86 + near * 0.14);
      }
      p.scale *= (gentle ? 0.76 : 0.42) + near * (gentle ? 0.42 : 0.95);
    }
    return;
  }
  if (view === 'side') {
    const fromLeft = vx < 0.5;
    for (const p of placements) {
      if (p.wash || p.layer === 'sky') continue;
      const near = fromLeft ? p.cx : 1 - p.cx;
      if (!gentle) {
        p.cx = vx + (p.cx - vx) * (0.62 + near * 0.42);
        p.cy = vy + (p.cy - vy) * (0.64 + near * 0.4);
      } else {
        p.cx = vx + (p.cx - vx) * (0.9 + near * 0.1);
      }
      p.scale *= (gentle ? 0.78 : 0.48) + near * (gentle ? 0.4 : 0.88);
    }
    return;
  }
  for (const p of placements) {
    if (p.wash || p.layer === 'sky') continue;
    const dx = p.cx - vx;
    const dy = p.cy - vy;
    const dist = Math.hypot(dx, dy);
    const near = Math.max(0, Math.min(1, dist / 1.15));
    if (!gentle) {
      p.cx = vx + dx * (0.56 + near * 0.48);
      p.cy = vy + dy * (0.56 + near * 0.48);
    } else {
      p.cx = vx + dx * (0.88 + near * 0.12);
      p.cy = vy + dy * (0.9 + near * 0.1);
    }
    p.scale *= (gentle ? 0.74 : 0.4) + near * (gentle ? 0.44 : 0.98);
  }
}

function scoreRarity(opts: {
  mode: Mode;
  family: Family;
  ground: Ground;
  countRarity: 'normal' | 'rare' | 'ultra';
  shift: boolean;
  rothko: boolean;
  view: ViewLean;
  passes: number;
  harmony: Harmony;
}): number {
  const famSum = Object.values(FAMILY_W).reduce((s, n) => s + n, 0);
  const modeP: Record<string, number> = { meadow: 0.34, wave: 0.28, bloom: 0.28, close: 0.1, flow: 0.28, sheet: 0.28 };
  const famP = (FAMILY_W[opts.family] ?? 12) / famSum;
  const pref = GROUND_FOR[opts.family];
  const gi = pref.grounds.indexOf(opts.ground);
  const gSum = pref.weights.reduce((s, n) => s + n, 0);
  const groundP = gi >= 0 ? pref.weights[gi] / gSum : 0.15;
  const countP = opts.countRarity === 'ultra' ? 1 / 2048 : opts.countRarity === 'rare' ? 1 / 256 : 0.995;
  const viewP: Record<ViewLean, number> = { flat: 0.42, rise: 0.28, side: 0.18, corner: 0.12 };
  const passP: Record<number, number> = { 3: 0.28, 4: 0.32, 5: 0.18, 6: 0.12, 7: 0.07, 8: 0.03 };
  const freq =
    (modeP[opts.mode] ?? 0.2) *
    famP *
    groundP *
    countP *
    (opts.shift ? 0.16 : 0.84) *
    (opts.rothko ? 0.14 : 0.86) *
    viewP[opts.view] *
    (passP[opts.passes] ?? 0.2) *
    (opts.harmony === 'mono' ? 0.03 : opts.harmony === 'flare' ? 0.1 : opts.harmony === 'pair' ? 0.15 : 0.72);
  const rarity = Math.round(100 * (1 - Math.pow(Math.max(freq, 1e-12), 0.18)));
  return Math.max(1, Math.min(99, rarity));
}

const MODE_W: Record<Mode, number> = {
  solitary: 0,
  triad: 0,
  cluster: 0,
  cascade: 8,
  sheet: 12,
  field: 8,
  flow: 18,
  wave: 22,
  bloom: 22,
  meadow: 28,
  close: 10,
};

const FAMILY_W: Record<Family, number> = {
  garden: 18,
  nikxname: 22,
  water: 14,
  sun: 8,
  pool: 8,
  earth: 16,
  night: 14,
};

const GROUND_FOR: Record<Family, { grounds: Ground[]; weights: number[] }> = {
  garden: { grounds: ['blush', 'cream', 'paper', 'mist', 'lawn', 'harvest', 'rose'], weights: [22, 16, 12, 12, 12, 10, 8] },
  nikxname: { grounds: ['blush', 'rose', 'dusk', 'cream', 'charcoal', 'paper', 'mist'], weights: [20, 16, 16, 12, 12, 8, 8] },
  water: { grounds: ['mist', 'cream', 'pool', 'harvest', 'blush', 'lawn', 'paper'], weights: [18, 16, 16, 12, 12, 10, 8] },
  sun: { grounds: ['cream', 'paper', 'harvest', 'blush', 'rose', 'mist', 'lawn'], weights: [18, 14, 14, 16, 12, 10, 8] },
  pool: { grounds: ['mist', 'cream', 'pool', 'harvest', 'blush', 'lawn', 'paper'], weights: [16, 16, 18, 12, 12, 10, 8] },
  earth: { grounds: ['cream', 'paper', 'lawn', 'rose', 'mist', 'harvest', 'blush'], weights: [16, 14, 14, 12, 12, 10, 14] },
  night: { grounds: ['dusk', 'charcoal', 'rose', 'blush', 'cream', 'mist'], weights: [24, 18, 16, 14, 10, 8] },
};

function rollGround(rng: () => number, family: Family): Ground {
  if (rng() < 0.12) return pick(rng, GROUNDS);
  const pref = GROUND_FOR[family];
  return pickWeighted(rng, pref.grounds, pref.weights);
}

type Landform = 'grade' | 'band' | 'hills' | 'peak' | 'wedge';
type SkyShare = 'vast' | 'open' | 'split' | 'low';

function landCrest(
  x: number,
  form: Landform,
  horizon: number,
  vanish: Vanish,
  amp: number,
  freq: number,
  phase: number,
  tilt: number,
) {
  if (form === 'grade') return horizon;
  if (form === 'band') {
    return (
      horizon +
      Math.sin(x * 3.6 + phase) * 0.028 +
      Math.sin(x * 9.1 + phase * 1.4) * 0.012
    );
  }
  if (form === 'hills') {
    return (
      horizon +
      Math.sin(x * freq + phase) * amp +
      Math.sin(x * freq * 2.15 + 0.7) * amp * 0.38 +
      (x - 0.5) * tilt
    );
  }
  if (form === 'peak') {
    const d = x - vanish.x;
    return horizon - amp * 1.55 * Math.exp(-(d * d) / 0.05) + Math.sin(x * 8 + phase) * amp * 0.1;
  }
  const sign = vanish.x < 0.5 ? 1 : -1;
  return horizon + (x - 0.5) * sign * 0.18 + Math.sin(x * 5 + phase) * amp * 0.18;
}

function studyX(rng: () => number, vanishX: number) {
  if (rng() < 0.3) return Math.max(-0.06, Math.min(1.06, vanishX + range(rng, -0.24, 0.24)));
  if (rng() < 0.16) return rng() < 0.5 ? range(rng, -0.07, 0.07) : range(rng, 0.93, 1.07);
  return range(rng, -0.05, 1.05);
}

type FineMood = 'ink' | 'light' | 'edge' | 'dust' | 'counter';

function gradeT(y: number, horizon: number) {
  const yy = Math.max(0, Math.min(1, y));
  if (yy < horizon) return 0.5 * (yy / Math.max(0.06, horizon));
  return 0.5 + 0.5 * ((yy - horizon) / Math.max(0.06, 1 - horizon));
}

function leanAt(rng: () => number, x: number, y: number, horizon: number, light: Light) {
  const t = gradeT(y, horizon) - lightAmt(x, y, light) * 0.22;
  const wave = 0.055 * Math.sin(x * 5.4 + y * 2.8) + 0.03 * Math.sin(x * 13.7 - y * 8.2);
  return Math.max(0, Math.min(1, t + wave + range(rng, -0.04, 0.04)));
}

function lightAt(
  rng: () => number,
  x: number,
  y: number,
  horizon: number,
  light: Light,
  crestY: number,
  bias = 0,
) {
  const lamp = lightAmt(x, y, light);
  const fall = 1 - gradeT(y, horizon);
  let L = 0.26 + fall * 0.22 + lamp * 0.5 + bias;
  if (lamp > 0.55) L = Math.max(L, 0.78 + lamp * 0.16);
  if (y > crestY + 0.006 && light.y < crestY) L *= 0.58 + lamp * 0.24;
  return Math.max(0.16, Math.min(0.94, L + range(rng, -0.03, 0.03)));
}

function keepOffHighlight(x: number, y: number, light: Light, rng: () => number) {
  const minD = Math.max(0.07, light.r * 0.38);
  const dx = x - light.x;
  const dy = y - light.y;
  const d = Math.hypot(dx, dy);
  if (d >= minD) return { x, y };
  const ang = d < 1e-4 ? rng() * Math.PI * 2 : Math.atan2(dy, dx);
  const out = minD + range(rng, 0.01, 0.06);
  return { x: light.x + Math.cos(ang) * out, y: light.y + Math.sin(ang) * out };
}

function pushStudyMark(
  placements: Placement[],
  rng: () => number,
  pool: Catalog['marks'],
  n: number,
  spec: {
    x: number;
    y: number;
    scale: number;
    alpha: number;
    layer: NonNullable<Placement['layer']>;
    pass: number;
    horizon: number;
    vanish: Vanish;
    grade: GradeKind;
    light: Light;
    crest: (x: number) => number;
    ghost: boolean;
    pop?: boolean;
    accent?: number;
    lightBias?: number;
    lean?: number;
  },
) {
  placements.push({
    plate: pick(rng, pool),
    cx: spec.x,
    cy: spec.y,
    scale: spec.scale,
    rot: markRot(rng, n),
    alpha: spec.alpha,
    ghost: spec.ghost,
    travel: lightAt(rng, spec.x, spec.y, spec.horizon, spec.light, spec.crest(spec.x), spec.lightBias ?? 0),
    layer: spec.layer,
    pass: spec.pass,
    wash: true,
    lean: spec.lean ?? leanAt(rng, spec.x, spec.y, spec.horizon, spec.light),
    pop: spec.pop,
    accent: spec.accent,
  });
}

/** Simple color-and-composition studies. Flowers come later. */
function composeStudy(
  catalog: Catalog,
  seed: number,
  rng: () => number,
  opts: {
    mode: Mode;
    family: Family;
    ground: Ground;
    brush: Flow;
    aspect: Aspect;
    harmony: Harmony;
    grade?: GradeKind;
  },
): Painting {
  const { mode, family, ground, brush, aspect, harmony } = opts;
  const marks = catalog.marks.length ? catalog.marks : catalog.heroes;
  const pool = Array.from({ length: Math.min(8, marks.length || 1) }, () => pick(rng, marks));
  const vanish = rollVanish(rng);
  const skyShare: SkyShare = pickWeighted(rng, ['vast', 'open', 'split', 'low'] as const, [34, 34, 20, 12]);
  let horizon =
    skyShare === 'vast'
      ? range(rng, 0.68, 0.84)
      : skyShare === 'open'
        ? range(rng, 0.54, 0.68)
        : skyShare === 'split'
          ? range(rng, 0.42, 0.54)
          : range(rng, 0.24, 0.4);
  if (rng() < 0.16) horizon = rng() < 0.5 ? PHI_LO : PHI_HI;
  const form: Landform = pickWeighted(
    rng,
    ['band', 'hills', 'peak', 'wedge', 'grade'] as const,
    [26, 32, 22, 16, 4],
  );
  const amp = range(rng, 0.04, 0.12);
  const freq = range(rng, 4.2, 9.5);
  const phase = rng() * Math.PI * 2;
  const tilt = range(rng, -0.045, 0.045);
  const rolledGrade: GradeKind =
    form === 'grade'
      ? pickWeighted(rng, ['fall', 'dome', 'bloom', 'twin', 'sweep'] as const, [22, 24, 20, 18, 16])
      : pickWeighted(
          rng,
          ['fall', 'well', 'dome', 'sweep', 'bloom', 'twin', 'corner'] as const,
          [30, 18, 16, 12, 10, 8, 6],
        );
  const grade = opts.grade ?? rolledGrade;
  const light = rollStudyLight(rng, horizon, vanish, skyShare);
  const mood: FineMood = pickWeighted(rng, ['ink', 'light', 'edge', 'dust', 'counter'] as const, [24, 18, 22, 20, 16]);
  const rolled = rollCount(rng, brush);
  const n = Math.min(Math.max(14_000, Math.floor(rolled.n * 0.34)), 34_000);
  const placements: Placement[] = [];
  const crest = (x: number) =>
    Math.max(0.1, Math.min(0.92, landCrest(x, form, horizon, vanish, amp, freq, phase, tilt)));
  const farOn = form !== 'grade' && (skyShare === 'vast' || skyShare === 'open') && rng() < 0.46;
  const farH = Math.max(0.22, horizon - range(rng, 0.12, 0.24));
  const farCrest = (x: number) =>
    Math.max(0.12, Math.min(horizon - 0.06, landCrest(x, 'hills', farH, vanish, amp * 0.45, freq * 0.72, phase + 1.2, tilt * 0.4)));
  const accentOn = harmony === 'flare' || harmony === 'pair' || mood === 'counter';
  const here = { horizon, vanish, grade, light, crest };

  const ridgeHeads = Array.from({ length: 4 + Math.floor(rng() * 4) }, () => {
    const hx = studyX(rng, vanish.x);
    return organicHead(rng, hx, crest(hx) + range(rng, 0.01, 0.05), range(rng, 0.08, 0.18));
  });
  const landHeads = Array.from({ length: 5 + Math.floor(rng() * 5) }, () => {
    const hx = studyX(rng, vanish.x);
    return organicHead(rng, hx, crest(hx) + range(rng, 0.1, 0.42), range(rng, 0.1, 0.22));
  });
  const farHeads = farOn
    ? Array.from({ length: 3 + Math.floor(rng() * 3) }, () => {
        const hx = range(rng, 0.05, 0.95);
        return organicHead(rng, hx, farCrest(hx) + range(rng, -0.02, 0.04), range(rng, 0.1, 0.2));
      })
    : [];

  const spot = (weights: [number, number, number, number, number]) => {
    const zone = pickWeighted(rng, ['lamp', 'sky', 'ridge', 'land', 'far'] as const, weights);
    if (zone === 'lamp') {
      const ang = rng() * Math.PI * 2;
      const d = light.r * range(rng, 0.42, 1.05);
      const x = light.x + Math.cos(ang) * d;
      const y0 = crest(x);
      const y = Math.max(-0.04, Math.min(y0 - 0.012, light.y + Math.sin(ang) * d * 0.7));
      return { x, y, layer: 'sky' as const, near: 0, far: false };
    }
    if (zone === 'sky') {
      const x = range(rng, -0.05, 1.05);
      const y0 = crest(x);
      const y = -0.04 + rng() * Math.max(0.08, y0 - 0.02);
      return { x, y, layer: 'sky' as const, near: 0, far: false };
    }
    if (zone === 'far' && farHeads.length) {
      const p = inHead(rng, pick(rng, farHeads));
      return { x: p.x, y: p.y, layer: 'horizon' as const, near: 0.04, far: true };
    }
    if (zone === 'ridge' || (zone === 'far' && !farHeads.length)) {
      const p = rng() < 0.62 ? inHead(rng, pick(rng, ridgeHeads)) : { x: studyX(rng, vanish.x), y: 0 };
      const x = p.x;
      const y0 = crest(x);
      const y = rng() < 0.62 ? Math.max(y0 + 0.004, p.y || y0 + range(rng, 0.006, 0.055)) : y0 + range(rng, 0.004, 0.05);
      return { x, y, layer: 'horizon' as const, near: 0.14, far: false };
    }
    const p = rng() < 0.48 ? inHead(rng, pick(rng, landHeads)) : { x: studyX(rng, vanish.x), y: 0 };
    const x = p.x;
    const y0 = crest(x);
    const y = Math.max(y0 + 0.01, p.y || y0 + 0.01 + Math.pow(rng(), 0.62) * (1.05 - y0));
    const near = Math.max(0, Math.min(1, (y - y0) / Math.max(0.08, 1.02 - y0)));
    return {
      x,
      y,
      layer: (near < 0.22 ? 'horizon' : near < 0.55 ? 'mid' : 'fore') as 'horizon' | 'mid' | 'fore',
      near,
      far: false,
    };
  };

  const passesPlan: {
    count: number;
    scale: [number, number];
    alpha: [number, number];
    weights: [number, number, number, number, number];
    bias: number;
    glaze: boolean;
  }[] = [
    { count: Math.floor(n * 0.18), scale: [0.055, 0.11], alpha: [0.32, 0.56], weights: [6, 26, 24, 36, 8], bias: 0.04, glaze: false },
    { count: Math.floor(n * 0.17), scale: [0.048, 0.095], alpha: [0.26, 0.48], weights: [6, 24, 26, 36, 8], bias: 0.02, glaze: false },
    { count: Math.floor(n * 0.17), scale: [0.042, 0.088], alpha: [0.22, 0.44], weights: [5, 22, 24, 41, 8], bias: 0, glaze: false },
    { count: Math.floor(n * 0.18), scale: [0.05, 0.1], alpha: [0.1, 0.22], weights: [8, 30, 20, 34, 8], bias: 0, glaze: true },
    { count: Math.floor(n * 0.15), scale: [0.03, 0.065], alpha: [0.16, 0.38], weights: [5, 22, 32, 33, 8], bias: 0.02, glaze: false },
    { count: 0, scale: [0.026, 0.055], alpha: [0.18, 0.42], weights: [4, 20, 18, 52, 6], bias: -0.06, glaze: false },
  ];
  passesPlan[5].count = Math.max(800, n - passesPlan.slice(0, 5).reduce((s, p) => s + p.count, 0));

  for (let pass = 1; pass <= 6; pass++) {
    const plan = passesPlan[pass - 1];
    for (let i = 0; i < plan.count; i++) {
      const raw = spot(plan.weights);
      const held = keepOffHighlight(raw.x, raw.y, light, rng);
      const s = { ...raw, x: held.x, y: held.y };
      const lamp = lightAmt(s.x, s.y, light);
      const land = s.layer === 'mid' || s.layer === 'fore';
      const counter = pass >= 4 && s.layer === 'horizon' && !s.far && accentOn && rng() < (mood === 'counter' ? 0.28 : 0.1);
      const veil = Math.max(0.06, 1 - Math.pow(lamp, 1.15) * 0.92);
      const ridgeScale = s.layer === 'horizon' && !s.far ? 0.72 : 1;
      pushStudyMark(placements, rng, pool, plan.count, {
        x: s.x,
        y: s.y,
        scale: range(rng, plan.scale[0], plan.scale[1]) * (land ? 0.82 + s.near * 0.4 : ridgeScale) * (s.far ? 1.15 : 1),
        alpha:
          (range(rng, plan.alpha[0], plan.alpha[1]) + (land && !plan.glaze ? s.near * 0.08 : 0)) *
          veil *
          (s.far ? 0.55 : 1),
        layer: s.layer,
        pass,
        ...here,
        pop: counter,
        accent: counter ? rollAccent(rng, family, harmony) : undefined,
        lightBias:
          plan.bias +
          (s.far ? 0.12 : s.layer === 'sky' ? 0.06 : land ? -0.1 - s.near * 0.06 : -0.05) +
          lamp * 0.1,
        ghost: true,
      });
    }
  }

  const kind = workKindOf(mode);
  const path: PaintPath = 'speckle';
  const passes = 6;
  const rarity = scoreRarity({
    mode,
    family,
    ground,
    countRarity: rolled.rarity,
    shift: false,
    rothko: form === 'grade',
    view: 'flat',
    passes,
    harmony,
  });
  const colorName = FAMILY_LABELS[family] ?? family;
  const harmNote = harmony === 'full' ? '' : ` · ${harmony}`;
  const lead = vanish.x < 0.28 ? ' · lead-left' : vanish.x > 0.72 ? ' · lead-right' : '';
  const gradeNote = grade === 'fall' ? '' : ` · ${grade}`;
  const lit =
    light.y > horizon * 0.55
      ? ' · low-sun'
      : light.x < 0.16 || light.x > 0.84
        ? ' · side-light'
        : light.y < 0.18
          ? ' · high-sun'
          : '';
  const note = `study · ${colorName} · ${placements.length} marks · ${skyShare} · ${form}${gradeNote}${harmNote}${lead}${lit}`;
  return {
    seed,
    mode,
    family,
    ground,
    count: placements.length,
    countRarity: rolled.rarity,
    kind,
    view: 'flat',
    vanish,
    horizon,
    rarity,
    passes,
    aspect,
    path,
    harmony,
    grade,
    weight: { x: light.x, y: light.y, kind: 'glow', r: light.r },
    placements,
    branches: [],
    note,
  };
}

export function composePainting(
  catalog: Catalog,
  seed: number,
  lock?: {
    mode?: Mode;
    family?: Family;
    ground?: Ground;
    band?: CountBand;
    flow?: Flow;
    aspect?: Aspect;
    grade?: GradeKind;
  },
): Painting {
  const rng = mulberry32(seed);
  let mode = coerceMode(
    lock?.mode ?? pickWeighted(rng, ['meadow', 'wave', 'bloom', 'close'] as const, [34, 28, 26, 12]),
  );
  let family = coerceFamily(
    lock?.family ??
      pickWeighted(
        rng,
        ['garden', 'nikxname', 'water', 'sun', 'pool', 'earth', 'night'] as const,
        [
          FAMILY_W.garden,
          FAMILY_W.nikxname,
          FAMILY_W.water,
          FAMILY_W.sun,
          FAMILY_W.pool,
          FAMILY_W.earth,
          FAMILY_W.night,
        ],
      ),
  );
  if (family === 'water' && rng() < 0.38) family = 'pool';
  const ground = lock?.ground ?? rollGround(rng, family);
  const brush = coerceFlow(lock?.flow ?? lock?.band);
  const aspect: Aspect = lock?.aspect ?? '1:1';
  if (mode === 'solitary' || mode === 'triad' || mode === 'cluster') mode = 'close';
  const harmony: Harmony = pickWeighted(rng, ['full', 'pair', 'flare', 'mono'] as const, [28, 32, 18, 22]);
  return composeStudy(catalog, seed, rng, {
    mode,
    family,
    ground,
    brush,
    aspect,
    harmony,
    grade: lock?.grade,
  });
}
