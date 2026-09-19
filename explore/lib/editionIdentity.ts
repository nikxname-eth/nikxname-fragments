/**
 * One identity for “the same artwork” across dumps, gardens, market, and desk.
 * Unique 1/1s (Embers variants, Will It letters) stay distinct.
 * Numbered editions (#1/9) and fragment copies collapse.
 */

export type EditionIdentity = {
  key: string;
  label: string;
};

const ROMAN: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
  xiii: 13,
  xiv: 14,
  xv: 15,
  xvi: 16,
  xvii: 17,
  xviii: 18,
  xix: 19,
  xx: 20,
  xxi: 21,
  xxii: 22,
  xxiii: 23,
  xxiv: 24,
  xxv: 25,
  xxvi: 26,
  xxvii: 27,
};

export function stripEditionSuffix(name: string): string {
  return name.replace(/\s*#\s*\d+\s*\/\s*\d+\s*$/i, '').trim();
}

function fragmentNumber(name: string): number | null {
  const t = stripEditionSuffix(name);
  const digits = t.match(/^fragment\s*0*(\d{1,2})\b/i);
  if (digits) return Number(digits[1]);
  const roman = t.match(/^fragment\s+([ivxlcdm]+)\b/i);
  if (roman) return ROMAN[roman[1].toLowerCase()] ?? null;
  return null;
}

export function editionIdentity(name: string, seriesId = ''): EditionIdentity {
  const raw = name.trim();
  const prefix = seriesId || 'work';

  const will = raw.match(/will\s*it\.?\.\s*\|\s*panel\s*0*(\d+)\s*-\s*([A-E])/i);
  if (will) {
    const n = String(will[1]).padStart(2, '0');
    const letter = will[2].toUpperCase();
    return {
      key: `${prefix}::will-it-${n}-${letter}`,
      label: `Will It.. | Panel ${n} - ${letter}`,
    };
  }

  const piece = fragmentNumber(raw);
  if (piece != null && piece >= 1 && piece <= 27) {
    const pad = String(piece).padStart(2, '0');
    return { key: `${prefix}::fragment-${pad}`, label: `Fragment ${pad}` };
  }

  const label = stripEditionSuffix(raw);
  return { key: `${prefix}::${label.toLowerCase()}`, label };
}

export function collapseByIdentity<T extends { name: string; quantity?: number }>(
  items: T[],
  seriesId: string,
  pick: (current: T, incoming: T) => T = (current) => current,
): (T & { quantity: number })[] {
  const map = new Map<string, T & { quantity: number }>();
  for (const item of items) {
    const { key, label } = editionIdentity(item.name, seriesId);
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, name: label, quantity: qty });
      continue;
    }
    const merged = pick(existing, item);
    map.set(key, {
      ...merged,
      name: label,
      quantity: existing.quantity + qty,
    });
  }
  return [...map.values()];
}
