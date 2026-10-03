/** Crockford without 0 / O / I / L / 1 — 32 glyphs, TV-safe. */
export const PAIR_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function normalizePairCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, '');
  return t.length === 4 ? t : null;
}

export function randomPairCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += PAIR_ALPHABET[b % PAIR_ALPHABET.length];
  return out;
}
