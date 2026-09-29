import { intRange } from './rng';
import { coerceFlow } from './types';
import type { CountBand, CountRarity, Flow } from './types';

/** Mark count follows Flow. Myth counts stay auto-only so the renderer isn't a slider. */
export function rollCount(rng: () => number, flow: Flow | CountBand = 'auto'): { n: number; rarity: CountRarity } {
  const f = coerceFlow(flow);
  if (f === 'still') return { n: intRange(rng, 36_000, 54_000), rarity: 'normal' };
  if (f === 'low') return { n: intRange(rng, 48_000, 70_000), rarity: 'normal' };
  if (f === 'high') return { n: intRange(rng, 78_000, 110_000), rarity: 'normal' };
  if (rng() < 1 / 2048) return { n: intRange(rng, 120_000, 160_000), rarity: 'ultra' };
  if (rng() < 1 / 256) return { n: intRange(rng, 90_000, 120_000), rarity: 'rare' };
  return { n: intRange(rng, 64_000, 92_000), rarity: 'normal' };
}
