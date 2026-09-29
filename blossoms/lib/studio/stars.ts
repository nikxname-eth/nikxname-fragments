import type { Family, Flow, Ground, Harmony, Mode } from './types';

/** Hard cap — drop lowest stars, then oldest. */
export const STAR_MAX = 48;
const KEY = 'bl-studio-stars';

export type StarredStudy = {
  id: string;
  seed: number;
  stars: number;
  note: string;
  thumb: string;
  mode: Mode;
  family: Family;
  ground: Ground;
  flow?: Flow;
  harmony?: Harmony;
  rarity?: number;
  at: number;
};

function loadRaw(): StarredStudy[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as StarredStudy[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list: StarredStudy[]): StarredStudy[] {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
  } catch {
    if (list.length <= 1) return list;
    const ranked = [...list].sort((a, b) => a.stars - b.stars || a.at - b.at);
    return persist(ranked.slice(1));
  }
}

function capStars(list: StarredStudy[]): StarredStudy[] {
  if (list.length <= STAR_MAX) return list;
  const ranked = [...list].sort((a, b) => a.stars - b.stars || a.at - b.at);
  const drop = new Set(ranked.slice(0, list.length - STAR_MAX).map((s) => s.id));
  return list.filter((s) => !drop.has(s.id));
}

export function loadStars(): StarredStudy[] {
  return loadRaw();
}

export function replaceStars(list: StarredStudy[]): StarredStudy[] {
  return persist(list);
}

export function mergeStars(incoming: Partial<StarredStudy>[]): StarredStudy[] {
  const bySeed = new Map<number, StarredStudy>();
  for (const s of loadRaw()) bySeed.set(s.seed, s);
  for (const s of incoming) {
    if (typeof s.seed !== 'number' || !s.thumb || !s.mode || !s.family || !s.ground) continue;
    const stars = Math.max(1, Math.min(10, Math.round(Number(s.stars) || 1)));
    const have = bySeed.get(s.seed);
    const at = typeof s.at === 'number' ? s.at : Date.now();
    if (have && have.at > at) continue;
    bySeed.set(s.seed, {
      id: String(s.id || have?.id || `${s.seed.toString(16)}-${at.toString(36)}`),
      seed: s.seed,
      stars,
      note: String(s.note ?? have?.note ?? ''),
      thumb: s.thumb,
      mode: s.mode as StarredStudy['mode'],
      family: s.family as StarredStudy['family'],
      ground: s.ground as StarredStudy['ground'],
      flow: s.flow,
      harmony: s.harmony,
      rarity: s.rarity,
      at,
    });
  }
  return persist(capStars([...bySeed.values()].sort((a, b) => b.at - a.at)));
}

export function findStar(seed: number): StarredStudy | undefined {
  return loadRaw().find((s) => s.seed === seed);
}

export function upsertStar(
  study: Omit<StarredStudy, 'id' | 'at'> & { id?: string; at?: number },
): StarredStudy[] {
  const list = loadRaw();
  const now = Date.now();
  const stars = Math.max(1, Math.min(10, Math.round(study.stars)));
  const existing = list.findIndex((s) => s.seed === study.seed);
  const row: StarredStudy = {
    ...study,
    stars,
    id: existing >= 0 ? list[existing].id : `${study.seed.toString(16)}-${now.toString(36)}`,
    at: now,
  };
  const next = existing >= 0 ? list.map((s, i) => (i === existing ? row : s)) : [row, ...list];
  return persist(capStars(next));
}

export function dropStar(id: string): StarredStudy[] {
  return persist(loadRaw().filter((s) => s.id !== id));
}

export function syncStarToDisk(study: StarredStudy | { id: string; drop: true }) {
  if (typeof window === 'undefined') return;
  void fetch('/api/stars', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(study),
  }).catch(() => undefined);
}
