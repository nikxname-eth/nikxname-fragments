/** Mulberry32 — small, deterministic, good enough for a studio preview. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}

export function pickWeighted<T>(rng: () => number, items: readonly T[], weights: readonly number[]): T {
  const w = weights.reduce((s, n) => s + n, 0);
  let u = rng() * w;
  for (let i = 0; i < items.length; i++) {
    if (u < weights[i]) return items[i] as T;
    u -= weights[i];
  }
  return items[items.length - 1] as T;
}

export function range(rng: () => number, a: number, b: number) {
  return a + rng() * (b - a);
}

export function seedFromClick(t: number, x: number, y: number, extra = 0) {
  const a = Math.imul(t, 374761393);
  const b = Math.imul(x | 1, 668265263);
  const c = Math.imul(y | 1, 1274126177);
  const d = Math.imul(extra | 1, 2246822519);
  return (a ^ b ^ c ^ d ^ (t >>> 5)) >>> 0;
}

export function intRange(rng: () => number, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
