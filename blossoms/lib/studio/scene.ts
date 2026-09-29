import { pickWeighted, range } from './rng';

export type Layer = 'sky' | 'horizon' | 'mid' | 'fore';
export type SceneKind =
  | 'level'
  | 'tilt'
  | 'plunge'
  | 'bowl'
  | 'dome'
  | 'shelf'
  | 'near'
  | 'far'
  | 'corner'
  | 'wedge'
  | 'drift'
  | 'lanes'
  | 'blooms';

export type ScenePt = { x: number; y: number; t: number; layer: Layer };

export const SCENE_KINDS: SceneKind[] = [
  'level',
  'tilt',
  'plunge',
  'bowl',
  'dome',
  'shelf',
  'near',
  'far',
  'corner',
  'wedge',
  'drift',
  'lanes',
  'blooms',
];

function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n));
}

type Horizon = {
  yL: number;
  yR: number;
  curve: number;
  ripple: number;
  freq: number;
  phase: number;
  zoom: 'in' | 'mid' | 'out';
  fill: 'to-edge' | 'band' | 'fade';
};

function makeHorizon(kind: SceneKind, rng: () => number): Horizon {
  const phase = rng() * Math.PI * 2;
  const flip = rng() < 0.5 ? 1 : -1;
  if (kind === 'near') {
    const base = range(rng, -0.08, 0.1);
    return {
      yL: base + range(rng, -0.04, 0.08),
      yR: base + range(rng, -0.04, 0.08),
      curve: range(rng, -0.04, 0.05),
      ripple: range(rng, 0, 0.012),
      freq: 1.2 + rng() * 1.4,
      phase,
      zoom: 'in',
      fill: rng() < 0.7 ? 'to-edge' : 'fade',
    };
  }
  if (kind === 'far') {
    const base = range(rng, 0.48, 0.64);
    return {
      yL: base + range(rng, -0.05, 0.05),
      yR: base + range(rng, -0.05, 0.05),
      curve: range(rng, -0.06, 0.07),
      ripple: range(rng, 0, 0.014),
      freq: 1 + rng(),
      phase,
      zoom: 'out',
      fill: rng() < 0.45 ? 'band' : 'fade',
    };
  }
  if (kind === 'plunge') {
    const steep = range(rng, 0.28, 0.48) * flip;
    const mid = range(rng, 0.28, 0.46);
    return {
      yL: clamp(mid - steep * 0.5, 0.08, 0.72),
      yR: clamp(mid + steep * 0.5, 0.08, 0.72),
      curve: range(rng, -0.03, 0.04),
      ripple: range(rng, 0, 0.01),
      freq: 0.8,
      phase,
      zoom: 'mid',
      fill: rng() < 0.55 ? 'to-edge' : 'fade',
    };
  }
  if (kind === 'tilt') {
    const tilt = range(rng, 0.1, 0.22) * flip;
    const mid = range(rng, 0.3, 0.46);
    return {
      yL: clamp(mid - tilt * 0.5, 0.16, 0.62),
      yR: clamp(mid + tilt * 0.5, 0.16, 0.62),
      curve: range(rng, -0.025, 0.03),
      ripple: range(rng, 0, 0.012),
      freq: 1.4 + rng(),
      phase,
      zoom: 'mid',
      fill: rng() < 0.6 ? 'to-edge' : 'fade',
    };
  }
  if (kind === 'bowl') {
    const mid = range(rng, 0.3, 0.44);
    return {
      yL: mid + range(rng, -0.04, 0.04),
      yR: mid + range(rng, -0.04, 0.04),
      curve: range(rng, 0.06, 0.14),
      ripple: range(rng, 0, 0.01),
      freq: 1,
      phase,
      zoom: 'mid',
      fill: 'to-edge',
    };
  }
  if (kind === 'dome') {
    const mid = range(rng, 0.34, 0.5);
    return {
      yL: mid + range(rng, -0.03, 0.03),
      yR: mid + range(rng, -0.03, 0.03),
      curve: range(rng, -0.14, -0.05),
      ripple: range(rng, 0, 0.01),
      freq: 1,
      phase,
      zoom: 'mid',
      fill: rng() < 0.5 ? 'to-edge' : 'band',
    };
  }
  if (kind === 'shelf') {
    const mid = range(rng, 0.36, 0.52);
    return {
      yL: mid,
      yR: mid + range(rng, -0.02, 0.02),
      curve: range(rng, -0.01, 0.01),
      ripple: 0,
      freq: 1,
      phase,
      zoom: 'mid',
      fill: rng() < 0.5 ? 'band' : 'to-edge',
    };
  }
  if (kind === 'corner' || kind === 'wedge') {
    const high = range(rng, 0.18, 0.34);
    const low = range(rng, 0.52, 0.78);
    return {
      yL: rng() < 0.5 ? high : low,
      yR: rng() < 0.5 ? low : high,
      curve: range(rng, -0.04, 0.05),
      ripple: range(rng, 0, 0.01),
      freq: 1,
      phase,
      zoom: 'mid',
      fill: rng() < 0.4 ? 'band' : 'fade',
    };
  }
  if (kind === 'drift') {
    const tilt = range(rng, 0.08, 0.2) * flip;
    const mid = range(rng, 0.28, 0.44);
    return {
      yL: clamp(mid - tilt * 0.5, 0.14, 0.6),
      yR: clamp(mid + tilt * 0.5, 0.14, 0.6),
      curve: range(rng, -0.05, 0.06),
      ripple: range(rng, 0.008, 0.02),
      freq: 1.6 + rng() * 1.8,
      phase,
      zoom: rng() < 0.3 ? 'in' : 'mid',
      fill: 'fade',
    };
  }
  // level — the familiar bottom-weight, almost flat, tiny undulation
  const mid = range(rng, 0.3, 0.44);
  return {
    yL: mid + range(rng, -0.02, 0.02),
    yR: mid + range(rng, -0.02, 0.02),
    curve: range(rng, -0.02, 0.03),
    ripple: range(rng, 0, 0.012),
    freq: 1.6 + rng(),
    phase,
    zoom: 'mid',
    fill: rng() < 0.75 ? 'to-edge' : 'fade',
  };
}

function horizonAt(h: Horizon, x: number) {
  const linear = h.yL + (h.yR - h.yL) * x;
  const bow = h.curve * 4 * x * (1 - x);
  const ripple = h.ripple * Math.sin(x * Math.PI * 2 * h.freq + h.phase);
  return linear + bow + ripple;
}

/** Gradual bands of strokes — sky, far, mid, near — for meadow depth. */
export function meadowBands(
  n: number,
  rng: () => number,
  opts?: { horizon?: number; tilt?: number },
): ScenePt[] {
  const pts: ScenePt[] = [];
  const horizon = opts?.horizon ?? range(rng, 0.16, 0.52);
  const tilt = opts?.tilt ?? range(rng, -0.14, 0.14);
  const skyN = Math.round(n * range(rng, 0.04, 0.09));
  const farN = Math.round(n * 0.22);
  const midN = Math.round(n * 0.38);
  const nearN = Math.max(8, n - skyN - farN - midN);

  const yAt = (x: number, base: number) => clamp(base + (x - 0.5) * tilt);

  for (let i = 0; i < skyN; i++) {
    const x = rng();
    pts.push({ x, y: range(rng, 0, Math.max(0.04, yAt(x, horizon) - 0.04)), t: rng() * 0.15, layer: 'sky' });
  }
  for (let i = 0; i < farN; i++) {
    const x = rng();
    const hy = yAt(x, horizon);
    pts.push({ x, y: clamp(hy + Math.pow(rng(), 0.85) * 0.22), t: 0.2 + rng() * 0.2, layer: 'horizon' });
  }
  for (let i = 0; i < midN; i++) {
    const x = rng();
    const hy = yAt(x, horizon);
    pts.push({ x, y: clamp(hy + 0.16 + Math.pow(rng(), 0.7) * 0.38), t: 0.4 + rng() * 0.25, layer: 'mid' });
  }
  for (let i = 0; i < nearN; i++) {
    const x = rng();
    pts.push({ x, y: clamp(0.58 + Math.pow(rng(), 0.55) * 0.42), t: 0.7 + rng() * 0.3, layer: 'fore' });
  }
  return pts;
}

/** Hidden scene grammar. Horizon can tilt, bow, or leave the frame. */
export function scenePoints(kind: SceneKind, n: number, rng: () => number): ScenePt[] {
  if (kind === 'blooms') {
    const pts: ScenePt[] = [];
    const skyN = Math.max(0, Math.round(n * 0.05));
    const rest = n - skyN;
    for (let i = 0; i < skyN; i++) {
      pts.push({ x: range(rng, 0.04, 0.96), y: range(rng, 0.04, 0.28), t: rng() * 0.12, layer: 'sky' });
    }
    const clusters = 8 + Math.floor(rng() * 22);
    const heads = Array.from({ length: clusters }, () => ({
      x: 0.08 + rng() * 0.84,
      y: 0.28 + rng() * 0.64,
      rx: 0.03 + rng() * 0.12,
      ry: 0.026 + rng() * 0.1,
    }));
    for (let i = 0; i < rest; i++) {
      const h = heads[Math.floor(rng() * heads.length)];
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.38);
      const x = clamp(h.x + Math.cos(a) * h.rx * r);
      const y = clamp(h.y + Math.sin(a) * h.ry * r);
      pts.push({
        x,
        y,
        t: 0.25 + r * 0.75,
        layer: y > 0.68 || r < 0.35 ? 'fore' : 'mid',
      });
    }
    return pts;
  }

  const h = makeHorizon(kind, rng);
  const pts: ScenePt[] = [];
  const skyAmt = h.zoom === 'out' ? 0.16 : h.zoom === 'in' ? 0.02 : 0.07;
  const skyN = Math.max(h.zoom === 'in' ? 0 : 2, Math.round(n * skyAmt));
  const horN = Math.max(4, Math.round(n * (h.zoom === 'out' ? 0.04 : 0.055)));
  let rest = Math.max(8, n - skyN - horN);

  const tilt = Math.atan2(h.yR - h.yL, 1);
  // downhill — perpendicular to the horizon, into the field
  const downX = Math.sin(tilt);
  const downY = Math.cos(tilt);

  for (let i = 0; i < skyN; i++) {
    const x = range(rng, 0.03, 0.97);
    const hy = horizonAt(h, x);
    if (hy < 0.06) continue;
    pts.push({
      x,
      y: range(rng, 0.03, Math.max(0.05, hy - 0.05)),
      t: rng() * 0.12,
      layer: 'sky',
    });
  }

  for (let i = 0; i < horN; i++) {
    const x = range(rng, 0.02, 0.98);
    pts.push({
      x,
      y: clamp(horizonAt(h, x) + range(rng, -0.008, 0.014)),
      t: 0.16 + rng() * 0.1,
      layer: 'horizon',
    });
  }

  const bandDepth = h.fill === 'band' ? range(rng, 0.22, 0.42) : 1;
  const expo = h.fill === 'fade' ? 0.62 : h.zoom === 'in' ? 0.72 : 0.5;

  for (let i = 0; i < rest; i++) {
    let x = range(rng, 0.02, 0.98);
    if (kind === 'lanes') {
      const lane = Math.floor(rng() * 5);
      x = clamp((lane + 0.5) / 5 + (rng() - 0.5) * 0.1);
    } else if (kind === 'corner') {
      x = rng() < 0.5 ? Math.pow(rng(), 1.4) * 0.55 : 1 - Math.pow(rng(), 1.4) * 0.55;
    } else if (kind === 'wedge') {
      x = clamp(0.5 + (rng() - 0.5) * range(rng, 0.35, 0.85));
    }
    const hy = horizonAt(h, x);
    const depth = Math.pow(rng(), expo) * bandDepth;
    const remain = h.fill === 'band' ? bandDepth : Math.max(0.12, 0.98 - hy);
    let px = x + downX * depth * remain * 0.35;
    let py = hy + downY * depth * remain;
    if (kind === 'drift') {
      px += depth * range(rng, 0.04, 0.14) * (downX >= 0 ? 1 : -1);
    }
    px = clamp(px);
    py = clamp(py);
    const near = (py - hy) / Math.max(0.08, 0.98 - hy);
    const layer: Layer = near > 0.58 ? 'fore' : 'mid';
    // t is depth: 0 far, 1 near — colour and scale read this
    const t = Math.max(0.18, Math.min(1, 0.22 + near * 0.78));
    pts.push({ x: px, y: py, t, layer });
  }

  return pts;
}

export function pickScene(rng: () => number): SceneKind {
  return pickWeighted(
    rng,
    SCENE_KINDS,
    [8, 8, 6, 5, 5, 4, 8, 6, 5, 4, 6, 2, 28],
  );
}
