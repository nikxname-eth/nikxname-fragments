import type { OwnedFragment } from './ownedScan';

const CACHE_TTL_MS = 30 * 60 * 1_000;

type OwnedCache = {
  owned: OwnedFragment[];
  balance: number;
  updatedAt: number;
};

function cacheKey(address: string): string {
  return `nikxart-owned-${address.toLowerCase()}`;
}

export function readOwnedCache(address: string): OwnedCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(cacheKey(address));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as OwnedCache;
    if (Date.now() - parsed.updatedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOwnedCache(
  address: string,
  owned: OwnedFragment[],
  balance: number,
): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: OwnedCache = { owned, balance, updatedAt: Date.now() };
    sessionStorage.setItem(cacheKey(address), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}