import { pick, pickWeighted, range } from './rng';

export type RippleSchema =
  | 'thirds'
  | 'phi'
  | 'pyramid'
  | 'diagonal'
  | 'bowl'
  | 'shelf'
  | 'path'
  | 'sea'
  | 'trunk'
  | 'hedge'
  | 'hills'
  | 'valley';
export type RippleRole = 'land' | 'sky';
export type Topo = 'roll' | 'jag';

export type RippleLane = {
  x0: number;
  x1: number;
  lean: number;
};

export type Ripple = {
  y: number;
  thick: number;
  near: number;
  tilt: number;
  lanes: RippleLane[];
  cut?: { x0: number; x1: number };
  layer: 'sky' | 'horizon' | 'mid' | 'fore';
  form?: 'band' | 'ring' | 'rise' | 'field' | 'ridge' | 'swell';
  ox?: number;
  oy?: number;
  rx?: number;
  ry?: number;
  /** Rolling hills vs jagged silhouette. */
  topo?: Topo;
};

export type StreetEdge = { x0: number; y0: number; x1: number; y1: number };

export type RipplePlan = {
  role: RippleRole;
  schema: RippleSchema;
  vanishX: number;
  horizon: number;
  /** Whole-field twist in radians. Breaks the left–right slab. */
  slant: number;
  ripples: Ripple[];
  street?: StreetEdge;
  topo?: Topo;
};

function layerOf(t: number, role: RippleRole): Ripple['layer'] {
  if (role === 'sky') return t < 0.45 ? 'sky' : 'horizon';
  if (t < 0.2) return 'horizon';
  if (t < 0.7) return 'mid';
  return 'fore';
}

function planSea(
  rng: () => number,
  kind: 'wave' | 'bloom',
  role: RippleRole,
  vanishX: number,
  horizon: number,
  openSky: boolean,
): RipplePlan {
  const chop = rng() < 0.62;
  const ox = vanishX;
  const oy = openSky ? horizon : range(rng, 0.18, 0.42);
  const ripples: Ripple[] = [];
  if (chop) {
    const n = kind === 'wave' ? 7 + Math.floor(rng() * 6) : 5 + Math.floor(rng() * 4);
    const yBot = 1.02;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 1 : i / (n - 1);
      const y = oy + t * (yBot - oy);
      const thick = 0.028 + t * (kind === 'bloom' ? 0.09 : 0.06);
      ripples.push({
        y,
        thick,
        near: t,
        tilt: range(rng, -0.12, 0.12) + Math.sin(i * 1.1) * 0.06,
        lanes: [{ x0: -0.08, x1: 1.08, lean: 0.12 + t * 0.2 }],
        layer: layerOf(t, role),
        form: 'swell',
        ox: 0.9 + rng() * 0.8,
        oy: rng() * Math.PI * 2,
        rx: range(rng, 0.04, 0.1),
        ry: y,
        topo: 'roll',
      });
    }
    return { role, schema: 'sea', vanishX, horizon: oy, slant: range(rng, -0.14, 0.14), ripples };
  }
  const n = kind === 'wave' ? 10 + Math.floor(rng() * 8) : 6 + Math.floor(rng() * 5);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    const rx = 0.14 + t * range(rng, 0.52, 0.82);
    const ry = rx * (0.28 + t * range(rng, 0.32, 0.55));
    const thick = 0.024 + t * (kind === 'bloom' ? 0.07 : 0.045);
    ripples.push({
      y: oy + t * 0.045,
      thick,
      near: t,
      tilt: 0,
      lanes: [{ x0: ox - rx, x1: ox + rx, lean: t }],
      layer: layerOf(t, role),
      form: 'ring',
      ox,
      oy,
      rx,
      ry,
    });
  }
  return { role, schema: 'sea', vanishX, horizon, slant: range(rng, -0.18, 0.18), ripples };
}

function planTrunk(
  rng: () => number,
  kind: 'wave' | 'bloom',
  role: RippleRole,
  vanishX: number,
  horizon: number,
): RipplePlan {
  const limbs = pickWeighted(rng, [1, 2, 3, 4], [16, 32, 34, 18]);
  const lean = (rng() < 0.5 ? -1 : 1) * range(rng, 0.04, 0.18);
  const ripples: Ripple[] = [];
  for (let i = 0; i < limbs; i++) {
    const t = limbs === 1 ? 0.5 : i / (limbs - 1);
    const xBase = vanishX + range(rng, -0.22, 0.22) + (t - 0.5) * lean * 0.35;
    const xTop = vanishX + (xBase - vanishX) * range(rng, 0.12, 0.42) + range(rng, -0.04, 0.04);
    const y0 = range(rng, -0.12, 0.04);
    const y1 = range(rng, 1.04, 1.16);
    const thick = range(rng, 0.055, 0.14) * (kind === 'bloom' ? 1.25 : 1);
    ripples.push({
      y: (y0 + y1) / 2,
      thick,
      near: 0.35 + t * 0.55,
      tilt: lean,
      lanes: [{ x0: Math.min(xBase, xTop) - thick, x1: Math.max(xBase, xTop) + thick, lean: t }],
      layer: layerOf(0.3 + t * 0.6, role),
      form: 'rise',
      ox: xBase,
      oy: y0,
      rx: xTop,
      ry: y1,
    });
  }
  return { role, schema: 'trunk', vanishX, horizon, slant: lean * 0.6, ripples };
}

export function planHedge(
  rng: () => number,
  kind: 'wave' | 'bloom',
  role: RippleRole,
  vanishX: number,
  horizon: number,
  opts?: { edge?: boolean; topo?: Topo; schema?: 'hedge' | 'hills'; skyline?: 'blend' | 'edge' | 'hills' },
): RipplePlan {
  const topo = opts?.topo ?? pickWeighted(rng, ['roll', 'jag'] as const, [70, 30]);
  const skyline = opts?.skyline ?? pickWeighted(rng, ['blend', 'edge', 'hills'] as const, [40, 42, 18]);
  const schema = opts?.schema ?? (skyline === 'hills' ? 'hills' : 'hedge');
  const farY = Math.max(0.16, Math.min(0.82, horizon + range(rng, -0.05, 0.05)));
  const nearY = range(rng, 0.98, 1.06);
  const x0 = -0.1;
  const x1 = 1.1;
  const freq = topo === 'jag' ? 2.4 + rng() * 2.2 : 1.05 + rng() * 1.35;
  const phase = rng() * Math.PI * 2;
  const amp = range(rng, 0.06, kind === 'bloom' ? 0.16 : 0.12);
  const pinch = false;
  const gap = pinch ? range(rng, 0.025, 0.07) : 0;
  const leftTilt = range(rng, 0.08, 0.22);
  const rightTilt = range(rng, -0.22, -0.08);
  const field = (
    xa: number,
    xb: number,
    tilt: number,
    layer: Ripple['layer'],
    near: number,
    ry: number,
    rx: number,
  ): Ripple => ({
    y: farY,
    thick: amp * (skyline === 'blend' ? 1.28 : 1),
    near,
    tilt,
    lanes: [{ x0: xa, x1: xb, lean: 0.28 }],
    layer,
    form: 'field',
    topo,
    ox: freq,
    oy: phase,
    rx,
    ry,
  });
  const ripples: Ripple[] = pinch
    ? [
        field(x0, vanishX - gap, leftTilt, 'fore', 0.72, farY, nearY),
        field(vanishX + gap, x1, rightTilt, 'fore', 0.72, farY, nearY),
      ]
    : [
        field(
          x0,
          x1,
          range(rng, -0.04, 0.04),
          'fore',
          0.72,
          skyline === 'blend' ? farY - amp * range(rng, 0.22, 0.5) : farY,
          nearY,
        ),
      ];
  if (skyline === 'hills') {
    const back = farY - range(rng, 0.04, 0.09);
    ripples.unshift({
      y: back,
      thick: amp * 0.7,
      near: 0.24,
      tilt: range(rng, -0.06, 0.06),
      lanes: [{ x0: vanishX - range(rng, 0.12, 0.22), x1: vanishX + range(rng, 0.12, 0.22), lean: 0.2 }],
      layer: 'horizon',
      form: 'field',
      topo,
      ox: freq * 0.9,
      oy: phase + 0.6,
      rx: farY + range(rng, 0.02, 0.06),
      ry: back,
    });
  }
  const recede = rng() < 0.62;
  const street: StreetEdge = recede
    ? {
        x0: x0 + range(rng, 0.04, 0.14),
        y0: nearY - 0.04,
        x1: vanishX + range(rng, -0.08, 0.08),
        y1: farY + range(rng, 0.02, 0.1),
      }
    : {
        x0: x0 + 0.04,
        y0: nearY - range(rng, 0.04, 0.1),
        x1: x1 - 0.04,
        y1: nearY - range(rng, 0.03, 0.08),
      };
  return { role, schema, vanishX, horizon: farY, slant: range(rng, -0.1, 0.1), ripples, street, topo };
}

/** Field pouring into a trough that reads as water at the pinch. */
function planValley(
  rng: () => number,
  kind: 'wave' | 'bloom',
  role: RippleRole,
  vanishX: number,
  horizon: number,
): RipplePlan {
  const plan = planHedge(rng, kind, role, vanishX, horizon, { edge: true, schema: 'hills' });
  const far = plan.horizon;
  const fromLeft = rng() < 0.5;
  const vx0 = fromLeft ? range(rng, -0.06, 0.18) : range(rng, 0.82, 1.08);
  const vx1 = vanishX + range(rng, -0.08, 0.08);
  const y0 = range(rng, 0.78, 0.98);
  const y1 = Math.min(0.92, far + range(rng, 0.06, 0.18));
  const trough: Ripple = {
    y: (y0 + y1) / 2,
    thick: range(rng, 0.048, 0.1),
    near: 0.9,
    tilt: (vx1 - vx0) * 0.08,
    lanes: [{ x0: Math.min(vx0, vx1) - 0.04, x1: Math.max(vx0, vx1) + 0.04, lean: 0.05 }],
    layer: 'fore',
    form: 'rise',
    ox: vx0,
    oy: y0,
    rx: vx1,
    ry: y1,
  };
  const water = planSea(rng, kind, role, vx1, y1, false);
  const pool = water.ripples.slice(0, 3).map((r) => ({
    ...r,
    ox: vx1,
    oy: y1,
    rx: (r.rx ?? 0.22) * 0.42,
    ry: (r.ry ?? 0.08) * 0.5,
    near: 0.96,
    layer: 'fore' as const,
  }));
  return {
    ...plan,
    schema: 'valley',
    ripples: [...plan.ripples, trough, ...pool],
    street: { x0: vx0, y0, x1: vx1, y1 },
  };
}

/**
 * Landscape ripples. Cownie / Ranger:
 * thirds + phi for weight, large/medium/small masses,
 * horizon not swallowed by sky, negative space is a decision,
 * slight break in symmetry, leading pinch toward a vanish.
 */
export function planRipples(
  rng: () => number,
  kind: 'wave' | 'bloom',
  skyline: 'blend' | 'edge' | 'hills' = 'blend',
): RipplePlan {
  const role: RippleRole = rng() < 0.18 ? 'sky' : 'land';
  const schema = pickWeighted(
    rng,
    ['thirds', 'phi', 'pyramid', 'diagonal', 'bowl', 'shelf', 'path', 'sea', 'trunk', 'hedge', 'hills', 'valley'] as const,
    [5, 5, 5, 5, 5, 5, 7, 14, 8, 12, 16, 13],
  );
  const openSky = role === 'land' && (kind === 'wave' ? rng() < 0.8 : rng() < 0.58);

  const horizon =
    role === 'sky' ? range(rng, 0.36, 0.5) : openSky ? range(rng, 0.5, 0.62) : range(rng, 0.1, 0.26);
  const yTop = role === 'sky' ? range(rng, 0.02, 0.08) : horizon;
  const yBot = role === 'sky' ? horizon : 0.975;

  const n = kind === 'wave' ? 22 + Math.floor(rng() * 16) : 7 + Math.floor(rng() * 8);

  const vanishSlot = pickWeighted(
    rng,
    ['edge', 'phi', 'thirds', 'wander', 'off'] as const,
    [22, 16, 16, 28, 18],
  );
  const vanishX =
    vanishSlot === 'edge'
      ? rng() < 0.5
        ? range(rng, -0.06, 0.18)
        : range(rng, 0.82, 1.06)
      : vanishSlot === 'phi'
        ? rng() < 0.5
          ? 0.382
          : 0.618
        : vanishSlot === 'thirds'
          ? rng() < 0.5
            ? 1 / 3
            : 2 / 3
          : vanishSlot === 'off'
            ? rng() < 0.5
              ? range(rng, -0.22, -0.02)
              : range(rng, 1.02, 1.22)
            : range(rng, 0.08, 0.92);

  if (schema === 'sea') {
    return planSea(rng, kind, role, vanishX, horizon, openSky);
  }
  if (schema === 'trunk') {
    return planTrunk(rng, kind, role, vanishX, horizon);
  }
  if (schema === 'hedge' && skyline !== 'blend') {
    return planHedge(rng, kind, role, vanishX, horizon, { edge: rng() < 0.62, schema: 'hedge', skyline });
  }
  if (schema === 'hills' && skyline !== 'blend') {
    return planHedge(rng, kind, role, vanishX, horizon, { edge: true, schema: 'hills', skyline });
  }
  if (schema === 'valley') {
    return planValley(rng, kind, role, vanishX, horizon);
  }

  const nLanes = 3 + Math.floor(rng() * 3);
  const slantStyle = pickWeighted(rng, ['level', 'soft', 'lean', 'steep', 'rise'] as const, [14, 30, 28, 18, 10]);
  const slant =
    slantStyle === 'level'
      ? range(rng, -0.05, 0.05)
      : slantStyle === 'soft'
        ? range(rng, -0.22, 0.22)
        : slantStyle === 'lean'
          ? range(rng, -0.52, 0.52)
          : slantStyle === 'steep'
            ? (rng() < 0.5 ? -1 : 1) * range(rng, 0.55, 0.98)
            : (rng() < 0.5 ? -1 : 1) * range(rng, 1.05, 1.48);
  const usedSlant = schema === 'path' ? range(rng, -0.32, 0.32) : slant;
  const ripples: Ripple[] = [];

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    const te =
      schema === 'path'
        ? Math.pow(t, 2.15)
        : role === 'sky'
          ? Math.pow(t, 0.7)
          : Math.pow(t, 1.42);
    let y = yTop + te * (yBot - yTop);
    y += Math.sin(i * 0.85 + rng() * 2) * (0.003 + t * 0.007);

    const thick =
      schema === 'path'
        ? 0.01 + t * (kind === 'bloom' ? 0.07 : 0.042)
        : kind === 'bloom'
          ? 0.04 + t * 0.09
          : 0.016 + t * 0.05;
    const toEdge = rng() < 0.9;
    const inset =
      toEdge
        ? range(rng, -0.04, 0.02)
        : (1 - t) *
          (schema === 'path'
            ? range(rng, 0.16, 0.3)
            : schema === 'pyramid' || schema === 'bowl'
              ? range(rng, 0.1, 0.2)
              : range(rng, 0.02, 0.08));
    let x0 = Math.max(-0.12, inset + range(rng, -0.04, 0.04));
    let x1 = Math.min(1.12, 1 - inset + range(rng, -0.04, 0.04));

    const pinch =
      (1 - t) *
      (schema === 'path'
        ? range(rng, 0.38, 0.68)
        : schema === 'bowl' || schema === 'pyramid'
          ? range(rng, 0.16, 0.3)
          : schema === 'diagonal'
            ? range(rng, 0.12, 0.22)
            : range(rng, 0.06, 0.16));
    x0 = vanishX + (x0 - vanishX) * (1 - pinch * 0.72);
    x1 = vanishX + (x1 - vanishX) * (1 - pinch * 0.72);

    let cut: { x0: number; x1: number } | undefined;
    if (rng() < (kind === 'wave' ? 0.24 : 0.16)) {
      const cx = pick(rng, [1 / 3, 0.5, 0.618, 2 / 3]);
      const w = range(rng, 0.05, 0.15);
      cut = { x0: cx - w, x1: cx + w };
    } else if (rng() < 0.2) {
      if (rng() < 0.5) x0 = range(rng, 0.16, 0.44);
      else x1 = range(rng, 0.56, 0.84);
    }

    const lanes: RippleLane[] = [];
    const span = Math.max(0.08, x1 - x0);
    let cursor = x0;
    const weights = Array.from({ length: nLanes }, () => 0.55 + rng());
    const wsum = weights.reduce((a, b) => a + b, 0);
    const base = Math.floor(rng() * 3);
    for (let L = 0; L < nLanes; L++) {
      const w = (weights[L] / wsum) * span;
      const lean = Math.max(0, Math.min(1, (base + L) / 4 + range(rng, -0.03, 0.03)));
      lanes.push({ x0: cursor, x1: cursor + w, lean });
      cursor += w;
    }

    const layer: Ripple['layer'] =
      role === 'sky'
        ? t < 0.45
          ? 'sky'
          : 'horizon'
        : t < 0.2
          ? 'horizon'
          : t < 0.7
            ? 'mid'
            : 'fore';

    const tilt =
      range(rng, -0.14, 0.14) +
      (schema === 'diagonal' ? range(rng, -0.12, 0.12) : 0) +
      (vanishX - 0.5) * 0.08 * (1 - t);

    ripples.push({
      y,
      thick,
      near: t,
      tilt,
      lanes,
      cut,
      layer,
      form: skyline === 'edge' && layer === 'horizon' ? 'ridge' : 'swell',
    });
  }

  if (rng() < 0.72 && ripples.length > 6) {
    const meetX = pick(rng, schema === 'phi' ? [0.382, 0.618] : [1 / 3, 0.5, 2 / 3]);
    const start = 2 + Math.floor(rng() * Math.max(1, ripples.length - 6));
    const count = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < count && start + k < ripples.length; k++) {
      const r = ripples[start + k];
      const pull = 0.14 * (1 - k / count);
      r.lanes = r.lanes.map((ln) => ({
        ...ln,
        x0: ln.x0 + (meetX - ln.x0) * pull,
        x1: ln.x1 + (meetX - ln.x1) * pull,
      }));
    }
  }

  const low = ripples.reduce((m, r) => Math.max(m, r.y + r.thick), 0);
  if (role === 'land' && low < 0.86 && rng() < 0.7) {
    ripples.push({
      y: 0.92,
      thick: 0.1,
      near: 0.96,
      tilt: 0,
      lanes: [{ x0: -0.12, x1: 1.12, lean: 0.16 }],
      layer: 'fore',
      form: 'field',
      rx: 1.08,
      ry: Math.max(0.68, low - 0.04),
    });
  }

  return { role, schema, vanishX, horizon, slant: usedSlant, ripples };
}

export function fillRipple(
  ripple: Ripple,
  n: number,
  rng: () => number,
  slant = 0,
): { x: number; y: number; lean: number; near: number; layer: Ripple['layer'] }[] {
  const out: { x: number; y: number; lean: number; near: number; layer: Ripple['layer'] }[] = [];
  if (ripple.form === 'ring' && ripple.ox != null && ripple.oy != null && ripple.rx && ripple.ry) {
    const ox = ripple.ox;
    const oy = ripple.oy;
    const rx = ripple.rx;
    const ry = ripple.ry;
    const a0 = range(rng, 0.12, 0.35);
    const a1 = Math.PI - a0;
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1);
      const a = a0 + u * (a1 - a0) + range(rng, -0.04, 0.04);
      const wob = 1 + range(rng, -0.04, 0.04);
      out.push({
        x: ox + Math.cos(a) * rx * wob,
        y: oy + Math.sin(a) * ry * wob + range(rng, -ripple.thick, ripple.thick),
        lean: ripple.lanes[0]?.lean ?? ripple.near,
        near: ripple.near,
        layer: ripple.layer,
      });
    }
    return out;
  }
  if (ripple.form === 'swell') {
    const x0 = ripple.lanes[0]?.x0 ?? -0.08;
    const x1 = ripple.lanes[ripple.lanes.length - 1]?.x1 ?? 1.08;
    const span = Math.max(0.12, x1 - x0);
    const freq = ripple.ox ?? 1.2;
    const phase = ripple.oy ?? 0;
    const amp = ripple.rx ?? ripple.thick;
    for (let i = 0; i < n; i++) {
      const u = rng();
      const x = x0 + u * span;
      const crest =
        ripple.y +
        Math.sin(u * Math.PI * freq + phase) * amp +
        Math.sin(u * Math.PI * freq * 1.7 + 0.8) * amp * 0.35 +
        (x - 0.5) * ripple.tilt;
      const foam = rng() < 0.22;
      const y = foam
        ? crest + range(rng, -ripple.thick * 0.35, ripple.thick * 0.12)
        : crest + Math.pow(rng(), 0.62) * ripple.thick * 1.35;
      out.push({
        x,
        y,
        lean: foam ? range(rng, 0.72, 0.98) : range(rng, 0.06, 0.32),
        near: ripple.near,
        layer: foam || ripple.near < 0.28 ? ripple.layer : ripple.near < 0.62 ? 'mid' : 'fore',
      });
    }
    return out;
  }
  if (ripple.form === 'field' || ripple.form === 'ridge') {
    const x0 = ripple.lanes[0]?.x0 ?? -0.08;
    const x1 = ripple.lanes[ripple.lanes.length - 1]?.x1 ?? 1.08;
    const span = Math.max(0.12, x1 - x0);
    const bot = ripple.rx ?? 1.02;
    const base = ripple.ry ?? ripple.y;
    const freq = ripple.ox ?? 1.2;
    const phase = ripple.oy ?? 0;
    const amp = ripple.thick;
    const hill = (x: number) => {
      const u = (x - x0) / span;
      if (ripple.topo === 'jag') {
        const a = Math.pow(Math.abs(Math.sin(u * Math.PI * freq + phase)), 1.65);
        const b = Math.pow(Math.abs(Math.sin(u * Math.PI * freq * 2.35 + 1.15)), 2.7);
        return base - amp * (0.35 + a * 0.75 + b * 0.55);
      }
      return (
        base +
        Math.sin(u * Math.PI * freq + phase) * amp +
        Math.sin(u * Math.PI * freq * 2.05 + 0.7) * amp * 0.36
      );
    };
    const ridge = ripple.form === 'ridge';
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const x = ridge
        ? x0 + u * span + range(rng, -0.008, 0.008)
        : rng() < 0.18
          ? rng() < 0.5
            ? x0 + rng() * span * 0.08
            : x1 - rng() * span * 0.08
          : x0 + rng() * span;
      if (!ridge && rng() < 0.05) continue;
      const top = hill(x);
      const y = ridge
        ? top + range(rng, -0.012, 0.018)
        : rng() < 0.2
          ? top + range(rng, -0.01, 0.024)
          : top + Math.pow(rng(), 0.68) * Math.max(0.08, bot - top);
      const near = ridge ? 0.2 : Math.max(0, Math.min(1, (y - top) / Math.max(0.08, bot - top)));
      out.push({
        x,
        y,
        lean: ridge ? range(rng, 0.06, 0.28) : 0.58 * (1 - near) + 0.05 * near,
        near,
        layer: ridge || near < 0.22 ? 'horizon' : near < 0.58 ? 'mid' : 'fore',
      });
    }
    return out;
  }
  if (ripple.form === 'rise' && ripple.ox != null && ripple.oy != null && ripple.rx != null && ripple.ry != null) {
    const x0 = ripple.ox;
    const x1 = ripple.rx;
    const y0 = ripple.oy;
    const y1 = ripple.ry;
    const midX = (x0 + x1) / 2 + range(rng, -0.06, 0.06);
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const u = 1 - t;
      const width = ripple.thick * (0.22 + t * 0.9);
      const x = u * u * x0 + 2 * u * t * midX + t * t * x1 + range(rng, -width, width);
      const y = y0 + t * (y1 - y0) + range(rng, -0.008, 0.008);
      out.push({
        x,
        y,
        lean: ripple.lanes[0]?.lean ?? t,
        near: 0.2 + t * 0.8,
        layer: y < 0.35 ? 'horizon' : y < 0.65 ? 'mid' : 'fore',
      });
    }
    return out;
  }
  const x0 = ripple.lanes[0]?.x0 ?? 0;
  const x1 = ripple.lanes[ripple.lanes.length - 1]?.x1 ?? 1;
  const span = Math.max(0.04, x1 - x0);
  const lobes = 2 + Math.floor(rng() * 3);
  const phase = rng() * Math.PI * 2;
  const cos = Math.cos(slant);
  const sin = Math.sin(slant);
  const feather = 0.06;
  for (let i = 0; i < n; i++) {
    const u = i / Math.max(1, n - 1) + (rng() - 0.5) * 0.02;
    const edge = Math.min(Math.max(0, u), Math.max(0, 1 - u));
    const fade = Math.min(1, edge / feather);
    if (rng() > 0.88 + fade * 0.12) continue;
    let x = x0 + u * span + range(rng, -0.012, 0.012);
    if (ripple.cut && x > ripple.cut.x0 && x < ripple.cut.x1) continue;
    let lean = ripple.lanes[0]?.lean ?? 0.5;
    for (const ln of ripple.lanes) {
      if (x >= ln.x0 && x <= ln.x1) {
        lean = ln.lean;
        break;
      }
    }
    const lobe = 0.45 + 0.55 * Math.abs(Math.sin(u * Math.PI * lobes + phase));
    const yHill =
      ripple.topo === 'jag'
        ? Math.pow(Math.abs(Math.sin(u * Math.PI * 3.4 + phase)), 2.2) * ripple.thick * 1.1
        : Math.sin(u * Math.PI * 1.4 + phase) * ripple.thick * 0.55;
    const y0 =
      ripple.y +
      (x - 0.5) * ripple.tilt +
      (rng() - 0.5) * ripple.thick * (0.7 + lobe + (1 - fade) * 1.4) +
      Math.sin(u * 6.2 + phase) * ripple.thick * 0.35 +
      yHill;
    const dx = x - 0.5;
    const dy = y0 - 0.55;
    out.push({
      x: 0.5 + dx * cos - dy * sin,
      y: 0.55 + dx * sin + dy * cos,
      lean,
      near: ripple.near,
      layer: ripple.layer,
    });
  }
  return out;
}

export function rippleMass(r: Ripple) {
  const span = Math.max(0.04, (r.lanes.at(-1)?.x1 ?? 1) - (r.lanes[0]?.x0 ?? 0));
  if (r.form === 'ridge') return span * Math.max(0.035, r.thick) * 2.4;
  if (r.form === 'swell') return span * Math.max(0.03, r.thick) * 1.6;
  if (r.form === 'field') {
    const depth = Math.max(0.12, (r.rx ?? 1) - (r.ry ?? r.y));
    return span * depth;
  }
  return r.thick * span * (0.55 + r.near);
}
