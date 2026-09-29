import type { Family, GradeKind, Ground, Harmony, Rgb, Vanish, ViewLean } from './types';
import { coerceFamily } from './types';

export function stemRgb(family: Family): Rgb {
  const f = coerceFamily(family);
  if (f === 'garden') return { r: 62, g: 78, b: 36 };
  if (f === 'nikxname') return { r: 86, g: 32, b: 30 };
  if (f === 'water') return { r: 56, g: 78, b: 86 };
  if (f === 'sun') return { r: 36, g: 52, b: 92 };
  if (f === 'pool') return { r: 28, g: 92, b: 64 };
  if (f === 'earth') return { r: 78, g: 58, b: 38 };
  return { r: 42, g: 28, b: 32 };
}

export function stemRamp(family: Family): Ramp {
  const ink = stemRgb(family);
  return {
    petals: 4,
    lobe: 0,
    stops: [
      { t: 0, c: { r: Math.round(ink.r * 0.42), g: Math.round(ink.g * 0.42), b: Math.round(ink.b * 0.42) } },
      { t: 0.55, c: ink },
      { t: 1, c: mix(ink, { r: 214, g: 200, b: 176 }, 0.38) },
    ],
  };
}

export const GROUND_RGB: Record<Ground, Rgb> = {
  cream: { r: 244, g: 234, b: 220 },
  paper: { r: 248, g: 244, b: 236 },
  dusk: { r: 38, g: 30, b: 32 },
  charcoal: { r: 18, g: 16, b: 20 },
  mist: { r: 186, g: 198, b: 214 },
  harvest: { r: 62, g: 92, b: 168 },
  pool: { r: 92, g: 186, b: 220 },
  blush: { r: 255, g: 168, b: 186 },
  rose: { r: 232, g: 210, b: 188 },
  lawn: { r: 168, g: 196, b: 142 },
};

type Wash = { a: Rgb; mid?: Rgb; b: Rgb; dir: 'vertical' | 'diagonal' | 'radial' };

/** Ground *is* the gradient. Family no longer overrides it. */
export function groundWash(ground: Ground, salt: number): Wash {
  if (ground === 'mist') {
    return { a: { r: 214, g: 224, b: 236 }, mid: { r: 186, g: 176, b: 168 }, b: { r: 168, g: 132, b: 86 }, dir: 'vertical' };
  }
  if (ground === 'harvest') {
    return { a: { r: 36, g: 58, b: 142 }, mid: { r: 168, g: 148, b: 120 }, b: { r: 242, g: 188, b: 48 }, dir: 'vertical' };
  }
  if (ground === 'pool') {
    return { a: { r: 92, g: 186, b: 220 }, mid: { r: 140, g: 204, b: 168 }, b: { r: 168, g: 214, b: 92 }, dir: 'vertical' };
  }
  if (ground === 'blush') {
    return { a: { r: 255, g: 176, b: 190 }, mid: { r: 255, g: 204, b: 168 }, b: { r: 255, g: 220, b: 112 }, dir: 'vertical' };
  }
  if (ground === 'rose') {
    return { a: { r: 244, g: 232, b: 220 }, mid: { r: 220, g: 188, b: 164 }, b: { r: 196, g: 164, b: 132 }, dir: 'vertical' };
  }
  if (ground === 'lawn') {
    return { a: { r: 214, g: 226, b: 188 }, mid: { r: 168, g: 196, b: 132 }, b: { r: 232, g: 228, b: 204 }, dir: 'vertical' };
  }
  if (ground === 'cream') {
    return { a: { r: 248, g: 240, b: 226 }, b: { r: 236, g: 214, b: 196 }, dir: salt > 0.5 ? 'radial' : 'vertical' };
  }
  if (ground === 'paper') {
    return { a: { r: 252, g: 248, b: 240 }, b: { r: 236, g: 220, b: 188 }, dir: salt > 0.55 ? 'radial' : 'diagonal' };
  }
  if (ground === 'dusk') {
    return { a: { r: 52, g: 32, b: 38 }, mid: { r: 32, g: 24, b: 30 }, b: { r: 18, g: 14, b: 18 }, dir: 'vertical' };
  }
  return { a: { r: 28, g: 26, b: 34 }, b: { r: 12, g: 11, b: 14 }, dir: salt > 0.4 ? 'radial' : 'vertical' };
}

/** In-hue luminance walk for wash strokes. Slight tone, not a new colour. */
export function groundStrokeStack(ground: Ground): Rgb[] {
  if (ground === 'dusk' || ground === 'charcoal') {
    return [
      { r: 22, g: 6, b: 14 },
      { r: 62, g: 12, b: 28 },
      { r: 108, g: 28, b: 48 },
      { r: 158, g: 72, b: 92 },
      { r: 206, g: 156, b: 168 },
      { r: 242, g: 226, b: 232 },
    ];
  }
  if (ground === 'rose') {
    return [
      { r: 48, g: 14, b: 10 },
      { r: 112, g: 36, b: 24 },
      { r: 168, g: 72, b: 48 },
      { r: 204, g: 128, b: 96 },
      { r: 228, g: 186, b: 158 },
      { r: 248, g: 236, b: 220 },
    ];
  }
  if (ground === 'cream' || ground === 'paper') {
    return [
      { r: 42, g: 14, b: 10 },
      { r: 98, g: 32, b: 18 },
      { r: 156, g: 68, b: 40 },
      { r: 204, g: 128, b: 86 },
      { r: 232, g: 196, b: 164 },
      { r: 250, g: 240, b: 226 },
    ];
  }
  if (ground === 'harvest') {
    return [
      { r: 28, g: 42, b: 98 },
      { r: 62, g: 86, b: 148 },
      { r: 132, g: 128, b: 96 },
      { r: 196, g: 164, b: 72 },
      { r: 228, g: 196, b: 86 },
      { r: 246, g: 228, b: 160 },
    ];
  }
  if (ground === 'mist') {
    return [
      { r: 92, g: 86, b: 78 },
      { r: 148, g: 142, b: 136 },
      { r: 186, g: 188, b: 196 },
      { r: 210, g: 214, b: 220 },
      { r: 228, g: 224, b: 214 },
      { r: 242, g: 236, b: 224 },
    ];
  }
  if (ground === 'pool') {
    return [
      { r: 18, g: 72, b: 98 },
      { r: 42, g: 132, b: 148 },
      { r: 92, g: 176, b: 168 },
      { r: 148, g: 206, b: 176 },
      { r: 198, g: 226, b: 196 },
      { r: 232, g: 240, b: 220 },
    ];
  }
  if (ground === 'blush') {
    return [
      { r: 28, g: 8, b: 24 },
      { r: 78, g: 24, b: 58 },
      { r: 132, g: 64, b: 108 },
      { r: 186, g: 118, b: 158 },
      { r: 220, g: 176, b: 200 },
      { r: 244, g: 230, b: 238 },
    ];
  }
  if (ground === 'lawn') {
    return [
      { r: 48, g: 72, b: 28 },
      { r: 92, g: 124, b: 52 },
      { r: 148, g: 172, b: 86 },
      { r: 196, g: 208, b: 142 },
      { r: 224, g: 228, b: 186 },
      { r: 240, g: 238, b: 214 },
    ];
  }
  return [
    { r: 168, g: 118, b: 72 },
    { r: 196, g: 148, b: 96 },
    { r: 220, g: 184, b: 132 },
    { r: 236, g: 214, b: 176 },
    { r: 244, g: 232, b: 208 },
    { r: 252, g: 246, b: 232 },
  ];
}

export function groundStrokeRamp(ground: Ground, lean: number): Ramp {
  const stack = groundStrokeStack(ground);
  const x = Math.max(0, Math.min(1, lean));
  const idx = x * (stack.length - 1);
  const i = Math.max(0, Math.min(stack.length - 2, Math.floor(idx)));
  const body = mix(stack[i], stack[i + 1], idx - i);
  const dark = stack[Math.max(0, i - 1)];
  const light = stack[Math.min(stack.length - 1, i + 2)];
  return {
    petals: 5,
    lobe: 0.06,
    stops: [
      { t: 0, c: mix(dark, { r: 0, g: 0, b: 0 }, 0.12) },
      { t: 0.38, c: dark },
      { t: 0.68, c: body },
      { t: 1, c: mix(light, { r: 248, g: 236, b: 210 }, 0.18) },
    ],
  };
}

export function heartRamp(family: Family): Ramp {
  const hint = accentRgb(family);
  return {
    petals: 5,
    lobe: 0.08,
    stops: [
      { t: 0, c: mix(hint, { r: 214, g: 196, b: 168 }, 0.35) },
      { t: 0.45, c: { r: 242, g: 232, b: 214 } },
      { t: 1, c: { r: 255, g: 252, b: 246 } },
    ],
  };
}

export function familyWarm(family: Family) {
  const f = coerceFamily(family);
  if (f === 'sun' || f === 'earth') return 0.48;
  if (f === 'nikxname') return 0.32;
  if (f === 'water' || f === 'pool') return -0.28;
  if (f === 'garden') return 0.12;
  return 0.06;
}

/** Luminance of a pigment, with a slight family temperature. */
export function familyHue(family: Family) {
  const f = coerceFamily(family);
  if (f === 'garden') return 98;
  if (f === 'nikxname') return 8;
  if (f === 'water') return 208;
  if (f === 'pool') return 172;
  if (f === 'sun') return 36;
  if (f === 'earth') return 26;
  return 348;
}

export function inkOf(c: Rgb, warm = 0): Rgb {
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return {
    r: clamp(Math.round(y + warm * 16)),
    g: clamp(Math.round(y + warm * 4)),
    b: clamp(Math.round(y - warm * 12)),
  };
}

/** Tinted worlds for rare mono — still one hue family, never gray. */
const MONO_WORLDS: Record<Family, number[]> = {
  garden: [98, 168, 210, 28],
  nikxname: [8, 348, 310, 18],
  water: [208, 230, 250, 310],
  sun: [36, 18, 28, 348],
  pool: [172, 196, 150, 28],
  earth: [26, 18, 210, 310],
  night: [348, 310, 230, 8],
};

export function monoHue(family: Family, salt = 0.5): number {
  const worlds = MONO_WORLDS[coerceFamily(family)] ?? [210, 8, 310, 28];
  const i = Math.max(0, Math.min(worlds.length - 1, Math.floor(salt * 0.999 * worlds.length)));
  return worlds[i];
}

/** One-hue ink: blue / wine / peach / lilac, with a slight shift along the ramp. */
export function tintedMono(c: Rgb, family: Family, shift = 0, salt = 0.5): Rgb {
  const y = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  const chroma = 0.22 + Math.abs(familyWarm(family)) * 0.14;
  const h = monoHue(family, salt) + shift * 16;
  return hsl(h, chroma, Math.max(0.04, Math.min(0.94, y * 0.9 + 0.05)));
}

export function inkRamp(ramp: Ramp, family: Family, salt = 0.5): Ramp {
  const n = Math.max(1, ramp.stops.length - 1);
  return {
    ...ramp,
    stops: ramp.stops.map((s, i) => ({ t: s.t, c: tintedMono(s.c, family, (i / n) * 2 - 1, salt) })),
  };
}

type Lane = { bed: Rgb; land: Rgb; body: Rgb; air: Rgb; sky: Rgb; top: Rgb };

function css(c: Rgb, a = 1) {
  if (a >= 0.995) return `rgb(${c.r},${c.g},${c.b})`;
  return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a))})`;
}

function layStops(grd: CanvasGradient, stops: { t: number; c: Rgb; a?: number }[]) {
  const items = stops
    .map((s) => ({ t: Math.max(0, Math.min(1, s.t)), c: s.c, a: s.a ?? 1 }))
    .sort((a, b) => a.t - b.t);
  let last = -1;
  for (const s of items) {
    let t = s.t;
    if (t <= last) t = Math.min(1, last + 1e-4);
    last = t;
    grd.addColorStop(t, css(s.c, s.a));
  }
}

/** Family pigment in the ground — the sit starts as colour, not a wash. */
function gradeLane(ground: Ground, family: Family, harmony: Harmony, salt: number): Lane {
  const g = groundStrokeStack(ground);
  const f = hueStack(family);
  const gi = (i: number) => g[Math.max(0, Math.min(g.length - 1, i))];
  const fi = (i: number) => f[Math.max(0, Math.min(f.length - 1, i))];
  let bed = mix(gi(0), fi(0), 0.55);
  let land = mix(gi(1), fi(1), 0.42);
  let body = mix(gi(2), fi(2), 0.48);
  let air = mix(gi(3), fi(3), 0.52);
  let sky = mix(gi(4), fi(4), 0.34);
  let top = mix(gi(5), fi(5), 0.2);
  if (harmony === 'pair') {
    const counter = complementStops(family, salt)[1].c;
    air = mix(air, counter, 0.46);
    sky = mix(sky, counter, 0.16);
  } else if (harmony === 'flare') {
    const hot = flareStops(family, salt)[1].c;
    air = mix(air, hot, 0.55);
    body = mix(body, hot, 0.18);
  } else if (harmony === 'mono') {
    bed = tintedMono(bed, family, 0.85, salt);
    land = tintedMono(land, family, 0.7, salt);
    body = tintedMono(body, family, 0.5, salt);
    air = tintedMono(air, family, 0.32, salt);
    sky = tintedMono(sky, family, 0.16, salt);
    top = tintedMono(top, family, 0.04, salt);
  }
  return { bed, land, body, air, sky, top };
}

const laneMemo = new Map<string, Lane>();

function laneOf(ground: Ground, family: Family, harmony: Harmony, salt: number): Lane {
  const k = `${ground}|${family}|${harmony}|${Math.round(salt * 8)}`;
  const hit = laneMemo.get(k);
  if (hit) return hit;
  const lane = gradeLane(ground, family, harmony, salt);
  if (laneMemo.size > 80) laneMemo.clear();
  laneMemo.set(k, lane);
  return lane;
}

/** Position in the base grade: 0 at the top light, 1 at the bed. */
export function sampleGrade(ground: Ground, family: Family, harmony: Harmony, salt: number, t: number): Rgb {
  const lane = laneOf(ground, family, harmony, salt);
  const stops: { t: number; c: Rgb }[] = [
    { t: 0, c: lane.top },
    { t: 0.18, c: lane.sky },
    { t: 0.38, c: lane.air },
    { t: 0.52, c: lane.body },
    { t: 0.76, c: lane.land },
    { t: 1, c: lane.bed },
  ];
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i].t) {
      const a = stops[i - 1];
      const b = stops[i];
      const u = (x - a.t) / Math.max(1e-6, b.t - a.t);
      return mix(a.c, b.c, u);
    }
  }
  return lane.bed;
}

/**
 * Brush sits on the grade. Local colour ±15–25%, then a lighting bias.
 * Dark plates stay in-hue instead of falling to the stack's black.
 */
export function followRamp(
  ground: Ground,
  family: Family,
  harmony: Harmony,
  salt: number,
  t: number,
  light = 0.5,
  pop = false,
): Ramp {
  let local = sampleGrade(ground, family, harmony, salt, t);
  if (pop) {
    const counter = harmony === 'flare' ? flareStops(family, salt)[1].c : complementStops(family, salt)[1].c;
    local = mix(local, counter, 0.48);
  }
  const lift = Math.max(0, Math.min(1, light));
  const bias = (lift - 0.5) * 0.5;
  const shifted =
    bias >= 0 ? mix(local, { r: 255, g: 252, b: 246 }, bias) : mix(local, { r: 10, g: 8, b: 12 }, -bias);
  const span = 0.15 + salt * 0.1;
  const darkSpan = span * (1 - lift * 0.88);
  const lightSpan = span + lift * 0.1;
  return {
    petals: 5,
    lobe: 0.05,
    stops: [
      { t: 0, c: mix(shifted, { r: 0, g: 0, b: 0 }, darkSpan) },
      { t: 0.48, c: shifted },
      { t: 1, c: mix(shifted, { r: 255, g: 252, b: 246 }, lightSpan) },
    ],
  };
}

function paintFall(ctx: CanvasRenderingContext2D, w: number, h: number, lane: Lane, split: number) {
  const glow = Math.max(0.08, split * 0.74);
  const meet = Math.max(glow + 0.02, split * 0.92);
  const after = Math.min(0.97, split + 0.08);
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  layStops(grd, [
    { t: 0, c: lane.top },
    { t: Math.max(0.04, glow * 0.38), c: lane.top },
    { t: glow, c: lane.sky },
    { t: meet, c: lane.air },
    { t: split, c: lane.body },
    { t: after, c: lane.land },
    { t: 1, c: lane.bed },
  ]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function paintRadial(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  stops: { t: number; c: Rgb; a?: number }[],
) {
  const grd = ctx.createRadialGradient(cx, cy, Math.max(0, r0), cx, cy, Math.max(r0 + 1, r1));
  layStops(grd, stops);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The base *is* the study. Fall keeps the view; dome / well / bloom / sweep
 * sit as colour fields on that grade — circular and diagonal, not only linear.
 */
export function paintGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ground: Ground,
  family: Family,
  salt: number,
  flare?: { x: number; y: number; r?: number },
  _view?: ViewLean,
  harmony?: Harmony,
  horizon = 0.4,
  grade: GradeKind = 'fall',
  vanish?: Vanish,
) {
  const harm = harmony ?? 'full';
  const lane = gradeLane(ground, family, harm, salt);
  const split = Math.max(0.16, Math.min(0.86, horizon));
  const vx = (flare?.x ?? vanish?.x ?? 0.5) * w;
  const vy = (flare?.y ?? vanish?.y ?? split * 0.55) * h;
  const span = Math.hypot(w, h);

  paintFall(ctx, w, h, lane, split);

  if (flare) {
    const reach = Math.max(0.12, flare.r ?? 0.22);
    const inner = Math.min(w, h) * reach * 0.12;
    const outer = Math.min(w, h) * reach * 3.6;
    ctx.save();
    ctx.globalAlpha = 0.9;
    paintRadial(ctx, w, h, flare.x * w, flare.y * h, inner, outer, [
      { t: 0, c: mix(lane.top, { r: 255, g: 252, b: 244 }, 0.62), a: 1 },
      { t: 0.18, c: mix(lane.sky, { r: 255, g: 250, b: 236 }, 0.28), a: 0.55 },
      { t: 0.52, c: lane.air, a: 0.2 },
      { t: 1, c: lane.body, a: 0 },
    ]);
    ctx.restore();
  }

  if (grade === 'fall') return;

  ctx.save();
  if (grade === 'dome') {
    ctx.globalAlpha = 0.72;
    paintRadial(ctx, w, h, w * 0.5, h * -0.04, span * 0.04, span * 0.92, [
      { t: 0, c: lane.top, a: 0.9 },
      { t: 0.35, c: lane.sky, a: 0.55 },
      { t: 0.7, c: lane.air, a: 0.22 },
      { t: 1, c: lane.body, a: 0 },
    ]);
  } else if (grade === 'well') {
    const x = vx;
    const y = Math.max(h * 0.08, Math.min(h * split, vy));
    ctx.globalAlpha = 0.78;
    paintRadial(ctx, w, h, x, y, Math.min(w, h) * 0.03, Math.min(w, h) * 0.72, [
      { t: 0, c: mix(lane.air, lane.top, 0.45), a: 0.92 },
      { t: 0.28, c: lane.air, a: 0.62 },
      { t: 0.62, c: lane.sky, a: 0.28 },
      { t: 1, c: lane.body, a: 0 },
    ]);
  } else if (grade === 'bloom') {
    const x = w * (salt < 0.5 ? 0.18 + salt * 0.3 : 0.52 + (salt - 0.5) * 0.4);
    const y = h * (0.12 + (1 - salt) * 0.28);
    ctx.globalAlpha = 0.7;
    paintRadial(ctx, w, h, x, y, Math.min(w, h) * 0.02, Math.min(w, h) * 0.58, [
      { t: 0, c: lane.air, a: 0.88 },
      { t: 0.4, c: lane.sky, a: 0.45 },
      { t: 1, c: lane.top, a: 0 },
    ]);
  } else if (grade === 'twin') {
    const counter = complementStops(family, salt)[1].c;
    ctx.globalAlpha = 0.62;
    paintRadial(ctx, w, h, w * 0.28, h * 0.22, 0, span * 0.55, [
      { t: 0, c: lane.air, a: 0.8 },
      { t: 1, c: lane.sky, a: 0 },
    ]);
    ctx.globalAlpha = 0.55;
    paintRadial(ctx, w, h, w * 0.74, h * (split * 0.7), 0, span * 0.5, [
      { t: 0, c: mix(counter, lane.body, 0.25), a: 0.75 },
      { t: 1, c: lane.bed, a: 0 },
    ]);
  } else if (grade === 'sweep') {
    const flip = salt > 0.5;
    const grd = ctx.createLinearGradient(flip ? w : 0, 0, flip ? 0 : w, h);
    layStops(grd, [
      { t: 0, c: lane.sky, a: 0.55 },
      { t: 0.45, c: lane.air, a: 0.32 },
      { t: 1, c: lane.body, a: 0 },
    ]);
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'corner') {
    const left = salt < 0.5;
    ctx.globalAlpha = 0.68;
    paintRadial(ctx, w, h, left ? 0 : w, salt > 0.62 ? h : 0, 0, span * 0.7, [
      { t: 0, c: lane.air, a: 0.85 },
      { t: 0.45, c: lane.sky, a: 0.4 },
      { t: 1, c: lane.top, a: 0 },
    ]);
  }
  ctx.restore();
}

export function accentRgb(family: Family): Rgb {
  const f = coerceFamily(family);
  if (f === 'sun') return { r: 236, g: 186, b: 196 };
  if (f === 'garden') return { r: 232, g: 168, b: 176 };
  if (f === 'nikxname') return { r: 236, g: 214, b: 176 };
  if (f === 'water') return { r: 232, g: 164, b: 132 };
  if (f === 'pool') return { r: 255, g: 214, b: 92 };
  if (f === 'earth') return { r: 168, g: 186, b: 204 };
  return { r: 212, g: 168, b: 96 };
}

/** Pulled from Together It Blooms / canvas state / blossom still + site tokens. */
export const NIKX = {
  void: { r: 13, g: 17, b: 29 },
  wineDeep: { r: 83, g: 13, b: 14 },
  oxblood: { r: 108, g: 10, b: 10 },
  crimson: { r: 131, g: 23, b: 22 },
  ember: { r: 145, g: 30, b: 28 },
  dusty: { r: 128, g: 69, b: 68 },
  mauve: { r: 150, g: 97, b: 98 },
  blush: { r: 215, g: 196, b: 197 },
  roseGold: { r: 196, g: 164, b: 132 },
  cream: { r: 240, g: 232, b: 220 },
} as const;

function clamp(n: number, a = 0, b = 255) {
  return Math.max(a, Math.min(b, n));
}

export function hsl(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: clamp(Math.round((r + m) * 255)),
    g: clamp(Math.round((g + m) * 255)),
    b: clamp(Math.round((b + m) * 255)),
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: clamp(Math.round(lerp(a.r, b.r, t))),
    g: clamp(Math.round(lerp(a.g, b.g, t))),
    b: clamp(Math.round(lerp(a.b, b.b, t))),
  };
}

export type Stop = { t: number; c: Rgb };
export type Ramp = { stops: Stop[]; petals: number; lobe: number };

function sample(stops: Stop[], t: number): Rgb {
  const x = Math.max(0, Math.min(1, t));
  if (x <= stops[0].t) return stops[0].c;
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i].t) {
      const a = stops[i - 1];
      const b = stops[i];
      const u = (x - a.t) / Math.max(1e-6, b.t - a.t);
      return mix(a.c, b.c, u);
    }
  }
  return stops[stops.length - 1].c;
}

/**
 * 5 in-hue steps, well → flare. Nikxname layers 3–5 of these
 * over and beside each other — same pigment, different light.
 */
export function hueStack(family: Family): Rgb[] {
  const f = coerceFamily(family);
  if (f === 'nikxname') {
    return [
      { r: 48, g: 6, b: 8 },
      { r: 86, g: 10, b: 12 },
      { r: 132, g: 22, b: 22 },
      { r: 168, g: 42, b: 36 },
      { r: 196, g: 96, b: 72 },
      { r: 252, g: 232, b: 220 },
    ];
  }
  if (f === 'water') {
    return [
      { r: 8, g: 12, b: 42 },
      { r: 18, g: 36, b: 88 },
      { r: 36, g: 72, b: 132 },
      { r: 72, g: 118, b: 168 },
      { r: 148, g: 186, b: 214 },
      { r: 214, g: 232, b: 242 },
    ];
  }
  if (f === 'pool') {
    return [
      { r: 4, g: 28, b: 64 },
      { r: 10, g: 72, b: 108 },
      { r: 24, g: 128, b: 138 },
      { r: 64, g: 176, b: 152 },
      { r: 148, g: 214, b: 168 },
      { r: 216, g: 238, b: 214 },
    ];
  }
  if (f === 'garden') {
    return [
      { r: 8, g: 16, b: 6 },
      { r: 22, g: 48, b: 14 },
      { r: 52, g: 96, b: 28 },
      { r: 96, g: 142, b: 48 },
      { r: 156, g: 186, b: 86 },
      { r: 236, g: 244, b: 214 },
    ];
  }
  if (f === 'sun') {
    return [
      { r: 42, g: 10, b: 4 },
      { r: 148, g: 54, b: 18 },
      { r: 196, g: 98, b: 36 },
      { r: 224, g: 148, b: 68 },
      { r: 240, g: 196, b: 118 },
      { r: 252, g: 232, b: 186 },
    ];
  }
  if (f === 'earth') {
    return [
      { r: 22, g: 12, b: 8 },
      { r: 62, g: 36, b: 20 },
      { r: 118, g: 74, b: 40 },
      { r: 164, g: 118, b: 72 },
      { r: 196, g: 168, b: 128 },
      { r: 232, g: 216, b: 186 },
    ];
  }
  return [
    { r: 14, g: 6, b: 12 },
    { r: 48, g: 12, b: 24 },
    { r: 88, g: 24, b: 38 },
    { r: 142, g: 56, b: 54 },
    { r: 186, g: 118, b: 112 },
    { r: 228, g: 196, b: 186 },
  ];
}

/**
 * Colorists method: each family is a lifetime fingerprint — well, body,
 * complementary counter, flare, light. A painting windows a stretch of
 * that fingerprint so the flock has range, not five neighbouring mids.
 */
function fingerprint(family: Family): Stop[] {
  const f = coerceFamily(family);

  if (f === 'garden') {
    // Deep sap to near-white leaf. Neighbours take opposite ends (Albers).
    return [
      { t: 0, c: { r: 8, g: 16, b: 6 } },
      { t: 0.18, c: { r: 28, g: 52, b: 16 } },
      { t: 0.38, c: { r: 72, g: 118, b: 42 } },
      { t: 0.58, c: { r: 132, g: 168, b: 64 } },
      { t: 0.78, c: { r: 186, g: 208, b: 112 } },
      { t: 1, c: { r: 236, g: 242, b: 206 } },
    ];
  }

  if (f === 'nikxname') {
    // Fragments blossoms: dusty rose hearts to cream-white petals on a wine ground.
    return [
      { t: 0, c: { r: 128, g: 64, b: 68 } },
      { t: 0.28, c: NIKX.mauve },
      { t: 0.55, c: NIKX.blush },
      { t: 0.78, c: NIKX.cream },
      { t: 1, c: { r: 252, g: 248, b: 242 } },
    ];
  }

  if (f === 'water') {
    return [
      { t: 0, c: { r: 8, g: 14, b: 42 } },
      { t: 0.2, c: { r: 22, g: 36, b: 78 } },
      { t: 0.4, c: { r: 48, g: 118, b: 108 } },
      { t: 0.62, c: { r: 214, g: 122, b: 88 } },
      { t: 0.8, c: { r: 128, g: 193, b: 227 } },
      { t: 1, c: { r: 242, g: 246, b: 250 } },
    ];
  }

  if (f === 'sun') {
    return [
      { t: 0, c: { r: 156, g: 62, b: 28 } },
      { t: 0.3, c: { r: 214, g: 118, b: 64 } },
      { t: 0.62, c: { r: 236, g: 164, b: 98 } },
      { t: 1, c: { r: 252, g: 220, b: 176 } },
    ];
  }

  if (f === 'pool') {
    return [
      { t: 0, c: { r: 2, g: 28, b: 88 } },
      { t: 0.22, c: { r: 8, g: 56, b: 142 } },
      { t: 0.44, c: { r: 48, g: 168, b: 72 } },
      { t: 0.64, c: { r: 232, g: 78, b: 148 } },
      { t: 0.82, c: { r: 255, g: 216, b: 52 } },
      { t: 1, c: { r: 255, g: 252, b: 244 } },
    ];
  }

  if (f === 'earth') {
    return [
      { t: 0, c: { r: 8, g: 12, b: 8 } },
      { t: 0.2, c: { r: 16, g: 34, b: 17 } },
      { t: 0.42, c: { r: 50, g: 33, b: 25 } },
      { t: 0.62, c: { r: 177, g: 111, b: 56 } },
      { t: 0.8, c: { r: 160, g: 168, b: 176 } },
      { t: 1, c: { r: 240, g: 228, b: 196 } },
    ];
  }

  return [
    { t: 0, c: { r: 4, g: 3, b: 6 } },
    { t: 0.22, c: NIKX.wineDeep },
    { t: 0.46, c: { r: 196, g: 148, b: 52 } },
    { t: 0.68, c: mix(NIKX.ember, { r: 210, g: 64, b: 48 }, 0.4) },
    { t: 0.86, c: { r: 236, g: 214, b: 200 } },
    { t: 1, c: { r: 250, g: 242, b: 232 } },
  ];
}

function windowFingerprint(full: Stop[], salt: number, travel: number, lean = 0.5): Stop[] {
  const span = 0.78 + salt * 0.16;
  const origin = Math.max(
    0,
    Math.min(1 - span, lean * 0.26 + salt * 0.06 + (travel - 0.5) * 0.08),
  );
  const a = origin;
  const b = origin + span;
  const mid = sample(full, a + (b - a) * 0.38);
  return [
    { t: 0, c: sample(full, a) },
    { t: 0.28, c: mid },
    { t: 0.55, c: mix(mid, sample(full, a + (b - a) * 0.62), 0.28) },
    { t: 0.78, c: sample(full, a + (b - a) * 0.82) },
    { t: 1, c: sample(full, b) },
  ];
}

const ACCENT_PIGMENTS: Rgb[][] = [
  [
    { r: 128, g: 48, b: 62 },
    { r: 224, g: 148, b: 158 },
    { r: 252, g: 240, b: 236 },
  ],
  [
    { r: 120, g: 72, b: 28 },
    { r: 214, g: 176, b: 118 },
    { r: 248, g: 236, b: 210 },
  ],
  [
    { r: 176, g: 156, b: 118 },
    { r: 232, g: 220, b: 196 },
    { r: 255, g: 252, b: 246 },
  ],
  [
    { r: 168, g: 56, b: 42 },
    { r: 232, g: 124, b: 86 },
    { r: 255, g: 214, b: 186 },
  ],
  [
    { r: 168, g: 112, b: 28 },
    { r: 236, g: 196, b: 72 },
    { r: 255, g: 244, b: 196 },
  ],
  [
    { r: 86, g: 52, b: 128 },
    { r: 168, g: 138, b: 214 },
    { r: 236, g: 226, b: 248 },
  ],
  [
    { r: 16, g: 82, b: 92 },
    { r: 68, g: 168, b: 164 },
    { r: 196, g: 232, b: 222 },
  ],
  [
    { r: 176, g: 86, b: 64 },
    { r: 236, g: 168, b: 132 },
    { r: 255, g: 228, b: 210 },
  ],
];

function accentStops(family: Family, accent = 0): Stop[] {
  const f = coerceFamily(family);
  const i = Math.max(0, Math.min(ACCENT_PIGMENTS.length - 1, Math.round(accent)));
  if (f === 'earth' && i === 0) {
    return [
      { t: 0, c: { r: 48, g: 64, b: 88 } },
      { t: 0.5, c: { r: 156, g: 176, b: 198 } },
      { t: 1, c: { r: 230, g: 236, b: 242 } },
    ];
  }
  const [a, b, c] = ACCENT_PIGMENTS[i];
  return [
    { t: 0, c: a },
    { t: 0.48, c: b },
    { t: 1, c: c },
  ];
}

export type RampOpts = {
  pop?: boolean;
  layer?: 'sky' | 'horizon' | 'mid' | 'fore';
  lean?: number;
  accent?: number;
  harmony?: Harmony;
};

function complementStops(family: Family, salt: number): Stop[] {
  const h = (familyHue(family) + 180) % 360;
  const sat = 0.4 + salt * 0.14;
  return [
    { t: 0, c: hsl(h, sat, 0.16) },
    { t: 0.48, c: hsl(h, sat, 0.48) },
    { t: 1, c: hsl(h, sat * 0.55, 0.88) },
  ];
}

function flareStops(family: Family, salt: number): Stop[] {
  const h = familyHue(family);
  const a = salt < 0.38 ? (h + 148) % 360 : salt < 0.72 ? (h + 212) % 360 : (h + 78) % 360;
  const sat = 0.46 + salt * 0.12;
  return [
    { t: 0, c: hsl(a, sat, 0.18) },
    { t: 0.5, c: hsl(a, sat, 0.5) },
    { t: 1, c: hsl(a, sat * 0.5, 0.9) },
  ];
}

/** Broad ramps. lean picks an in-hue lane; travel is depth. Pair / flare widen, never shrink. */
export function rampFor(family: Family, travel: number, salt: number, opts?: RampOpts): Ramp {
  const f = coerceFamily(family);
  const petals = f === 'pool' ? 4 : f === 'water' ? 6 : 5;
  const lobe = f === 'pool' || f === 'sun' ? 0.08 : 0.12;
  const lean = opts?.lean ?? salt;
  const harmony = opts?.harmony ?? 'full';

  if (opts?.pop) {
    const base =
      harmony === 'pair'
        ? complementStops(f, salt)
        : harmony === 'flare'
          ? flareStops(f, salt)
          : accentStops(f, opts.accent ?? 0);
    let stops = windowFingerprint(base, salt, travel, lean);
    const airLayer = opts.layer;
    if (airLayer === 'sky' || airLayer === 'horizon') {
      const air = daylightAir(f, airLayer);
      const amt = airLayer === 'sky' ? 0.3 : 0.14;
      stops = stops.map((s) => ({ t: s.t, c: mix(s.c, air, amt) }));
    }
    return { petals: 5, lobe: 0.1, stops };
  }

  const stack = hueStack(f);
  const idx = Math.max(0, Math.min(stack.length - 1, Math.round(lean * (stack.length - 1))));
  const dark = stack[Math.max(0, idx - 1)];
  const body = stack[idx];
  const light = stack[Math.min(stack.length - 1, idx + 1)];
  let stops: Stop[] = [
    { t: 0, c: mix(dark, { r: 0, g: 0, b: 0 }, 0.28) },
    { t: 0.34, c: dark },
    { t: 0.66, c: body },
    { t: 1, c: mix(light, { r: 255, g: 252, b: 246 }, 0.22) },
  ];
  if (harmony === 'flare') {
    const a = flareStops(f, salt)[1].c;
    stops = [
      stops[0],
      stops[1],
      { t: 0.66, c: mix(body, a, 0.12) },
      stops[3],
    ];
  }
  const layer = opts?.layer;
  if (layer === 'sky' || layer === 'horizon') {
    const air = daylightAir(f, layer);
    const amt = layer === 'sky' ? 0.32 : 0.14;
    stops = stops.map((s) => ({ t: s.t, c: mix(s.c, air, amt) }));
  }
  return { petals, lobe, stops };
}

function daylightAir(family: Family, layer: 'sky' | 'horizon'): Rgb {
  const f = coerceFamily(family);
  if (f === 'night' || f === 'nikxname') {
    return layer === 'sky' ? { r: 186, g: 92, b: 78 } : { r: 48, g: 14, b: 18 };
  }
  if (f === 'water' || f === 'pool') {
    return layer === 'sky' ? { r: 228, g: 238, b: 246 } : { r: 36, g: 64, b: 86 };
  }
  if (f === 'sun') {
    return layer === 'sky' ? { r: 255, g: 236, b: 196 } : { r: 62, g: 28, b: 12 };
  }
  if (f === 'earth') {
    return layer === 'sky' ? { r: 252, g: 236, b: 206 } : { r: 42, g: 24, b: 12 };
  }
  return layer === 'sky' ? { r: 240, g: 246, b: 228 } : { r: 22, g: 36, b: 14 };
}

/**
 * Colorize from the brush, not a pinwheel.
 * Luminance walks the ramp (the mark *is* the petal). A soft radial
 * (heart deeper, edge lighter) plus a faint raised-cosine lobe — never a fan.
 */
export function colorizeImageData(src: ImageData, ramp: Ramp, wobble = 0): ImageData {
  const out = new ImageData(src.width, src.height);
  const s = src.data;
  const d = out.data;
  const cx = src.width * 0.5;
  const cy = src.height * 0.5;
  const inv = 1 / Math.max(cx, cy);
  const petals = Math.max(4, ramp.petals);
  const lobeAmt = (ramp.lobe ?? 0) * 0.055;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      const a = s[i + 3];
      if (a < 6) continue;
      const lum = (0.2126 * s[i] + 0.7152 * s[i + 1] + 0.0722 * s[i + 2]) / 255;
      const nx = (x - cx) * inv;
      const ny = (y - cy) * inv;
      const rad = Math.min(1, Math.hypot(nx, ny));
      const ang = Math.atan2(ny, nx) + wobble * Math.PI * 2;
      const petal = Math.pow(0.5 + 0.5 * Math.cos(ang * petals), 2.2);
      // Stretch mid-gray plates across the whole ramp so hearts go dark and rims go light.
      const stretch = Math.max(0, Math.min(1, (lum - 0.05) / 0.82));
      const t = Math.max(
        0,
        Math.min(1, stretch * 0.92 + (1 - rad) * 0.06 + (petal - 0.35) * lobeAmt),
      );
      const c = sample(ramp.stops, t);
      d[i] = c.r;
      d[i + 1] = c.g;
      d[i + 2] = c.b;
      d[i + 3] = a;
    }
  }
  return out;
}
