import type { CSSProperties } from 'react';

export type FrameTone = 'dark' | 'med' | 'light';

export type FrameFinish = {
  shadow: string;
  metal: [number, string][];
  edge: string;
  highlight: string;
  shade: string;
  mat: string;
  well: string;
};

const BASE: Record<FrameTone, FrameFinish> = {
  dark: {
    shadow: 'rgba(0,0,0,0.38)',
    metal: [
      [0, '#3a3c40'],
      [0.22, '#26282c'],
      [0.55, '#18191c'],
      [0.82, '#101114'],
      [1, '#0a0a0c'],
    ],
    edge: 'rgba(255,255,255,0.08)',
    highlight: 'rgba(255,255,255,0.1)',
    shade: 'rgba(0,0,0,0.5)',
    mat: '#0c0c0e',
    well: '#050506',
  },
  med: {
    shadow: 'rgba(0,0,0,0.32)',
    metal: [
      [0, '#c8c4be'],
      [0.22, '#a8a49e'],
      [0.52, '#88847e'],
      [0.78, '#5c5854'],
      [1, '#3a3836'],
    ],
    edge: 'rgba(255,255,255,0.08)',
    highlight: 'rgba(255,255,255,0.22)',
    shade: 'rgba(0,0,0,0.42)',
    mat: '#141416',
    well: '#080809',
  },
  light: {
    shadow: 'rgba(40,32,24,0.14)',
    metal: [
      [0, '#e4ded2'],
      [0.3, '#c8c0b2'],
      [0.62, '#a89e90'],
      [1, '#6e665c'],
    ],
    edge: 'rgba(40,32,24,0.28)',
    highlight: 'rgba(255,255,255,0.32)',
    shade: 'rgba(0,0,0,0.36)',
    mat: '#efe8dc',
    well: '#e4ddd0',
  },
};

function parseHex(hex: string): [number, number, number] | null {
  const n = hex.replace('#', '').trim();
  if (n.length === 3) {
    return [
      parseInt(n[0] + n[0], 16),
      parseInt(n[1] + n[1], 16),
      parseInt(n[2] + n[2], 16),
    ];
  }
  if (n.length < 6) return null;
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;
}

function lum(rgb: [number, number, number]): number {
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const LIGHT_TARGET: [number, number, number] = [214, 208, 198];
const DARK_TARGET: [number, number, number] = [42, 40, 38];
const SHIFT = 0.3;

/** Matte frame offset ~30% from the wall so moulding reads when saved. */
export function contrastFinish(tone: FrameTone, wallHex?: string): FrameFinish {
  const base = BASE[tone];
  const wall = wallHex ? parseHex(wallHex) : null;
  const towardLight = wall ? lum(wall) < 0.48 : tone !== 'dark';
  const target = towardLight ? LIGHT_TARGET : DARK_TARGET;
  const metals = base.metal.map(([, c]) => parseHex(c) || DARK_TARGET);
  const mean: [number, number, number] = [
    metals.reduce((n, m) => n + m[0], 0) / metals.length,
    metals.reduce((n, m) => n + m[1], 0) / metals.length,
    metals.reduce((n, m) => n + m[2], 0) / metals.length,
  ];
  const metal: [number, string][] = base.metal.map(([stop, color], i) => {
    const rgb = metals[i];
    const flattened = mix(rgb, mean, 0.42);
    const shifted = mix(flattened, target, SHIFT);
    return [stop, toHex(shifted)];
  });
  const matRgb = parseHex(base.mat) || DARK_TARGET;
  const wellRgb = parseHex(base.well) || DARK_TARGET;
  return {
    ...base,
    metal,
    mat: toHex(mix(matRgb, target, 0.12)),
    well: toHex(mix(wellRgb, towardLight ? DARK_TARGET : LIGHT_TARGET, 0.08)),
    highlight: towardLight ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
    shade: towardLight ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.48)',
  };
}

export function frameCssVars(wallHex: string, tone: FrameTone): CSSProperties {
  const f = contrastFinish(tone, wallHex);
  const grad = f.metal.map(([s, c]) => `${c} ${Math.round(s * 100)}%`).join(', ');
  return {
    ['--frame-metal' as string]: `linear-gradient(155deg, ${grad})`,
    ['--frame-edge' as string]: f.edge,
    ['--frame-hi' as string]: f.highlight,
    ['--frame-shade' as string]: f.shade,
  };
}
