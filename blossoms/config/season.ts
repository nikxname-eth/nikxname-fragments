/** Season 1 constants. Keep in lockstep with the contract MAX_SUPPLY. */
export const MAX_SUPPLY = 128;
export const N_MIN = 1;
export const N_MAX = 4;
export const LIBRARY_VERSION = 1;
export const SITE_URL = 'https://blossoms.nikxart.xyz';
export const LIVE_SITE = 'https://nikxart.xyz';
export const EXPLORE_SITE = 'https://explore.nikxart.xyz';
export const ARTIST_X = 'https://x.com/Nikxname';

export function tokenIds(): number[] {
  return Array.from({ length: MAX_SUPPLY }, (_, i) => i + 1);
}
