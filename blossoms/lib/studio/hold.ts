import type { Aspect, CountBand, Family, Flow, Ground, Mode } from './types';

export const HOLD_MAX = 10;
/** Three hours. Pressure, not a vault. */
export const HOLD_MS = 10_800_000;
const KEY = 'bl-studio-holds';

export type HeldStudy = {
  id: string;
  seed: number;
  note: string;
  thumb: string;
  expiresAt: number;
  mode: Mode;
  family: Family;
  ground: Ground;
  band?: CountBand;
  flow?: Flow;
  aspect?: Aspect;
};

function loadRaw(): HeldStudy[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HeldStudy[];
  } catch {
    return [];
  }
}

function save(list: HeldStudy[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

export function pruneHolds(now = Date.now()): HeldStudy[] {
  const next = loadRaw().filter((h) => h.expiresAt > now);
  save(next);
  return next;
}

export function addHold(study: Omit<HeldStudy, 'id' | 'expiresAt'>, now = Date.now()): HeldStudy[] | 'full' {
  const list = pruneHolds(now);
  if (list.length >= HOLD_MAX) return 'full';
  const held: HeldStudy = {
    ...study,
    id: `${study.seed.toString(16)}-${now.toString(36)}`,
    expiresAt: now + HOLD_MS,
  };
  const next = [held, ...list];
  save(next);
  return next;
}

export function dropHold(id: string): HeldStudy[] {
  const next = pruneHolds().filter((h) => h.id !== id);
  save(next);
  return next;
}

export function remainingMs(h: HeldStudy, now = Date.now()) {
  return Math.max(0, h.expiresAt - now);
}
