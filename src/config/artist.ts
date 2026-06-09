export const BANNER_SIZES =
  '(max-width:680px) calc(100vw - 32px),(max-width:1100px) calc(100vw - 64px),1400px';

const makeBanner = (base: string) => ({
  src: `${base}?width=1400&quality=88&format=auto`,
  srcSet: [
    `${base}?width=640&quality=85&format=auto 640w`,
    `${base}?width=960&quality=85&format=auto 960w`,
    `${base}?width=1400&quality=88&format=auto 1400w`,
  ].join(', '),
});

export const BANNER_DARK = makeBanner('https://assets.nikxart.xyz/Banner-Medium.jpg');
export const BANNER_LIGHT = makeBanner('https://assets.nikxart.xyz/main_grid_light_2500px.jpg');

/** Evolved banner per fragment collected — puzzle piece revealed in the grid. */
export const EVOLVED_BANNERS: Record<number, { dark: string; light: string }> = {
  1: {
    dark: 'https://assets.nikxart.xyz/Banner-Main-Dark-2.jpg',
    light: 'https://assets.nikxart.xyz/Banner-Main-Light-2.jpg',
  },
};

export function getEvolvedBanner(pieceLevel: number, theme: 'dark' | 'light') {
  const urls = EVOLVED_BANNERS[pieceLevel];
  if (!urls) return null;
  return makeBanner(theme === 'dark' ? urls.dark : urls.light);
}

/**
 * Direct on-chain media URLs per fragment (from token metadata).
 * Used as the display source and as fallback if metadata fetch is slow.
 * Fragment 01: Arweave gateway for the minted ERC-721 token media.
 */
export const ON_CHAIN_MEDIA: Record<number, string> = {
  1: 'https://bofrf7ruayhxwfcht2a3bw2h4hcfpulrekva5xqch6iky5j5o6ba.arweave.net/C4sS_jQGD3sUR56BsNtH4cRX0XEiqg7eAj-QrHU9d4I',
};

/**
 * On-chain tokenURI markers for each fragment's Manifold claim mints.
 * Only tokens matching these are counted in collection / banner evolution.
 * (Earlier contract tokens 1–5 used legacy metadata and are excluded.)
 */
export const FRAGMENT_CLAIM_URI_MARKERS: Record<number, string[]> = {
  1: ['y59jKPO1M12WQ81y-h4sRouWXegvhxYV_Wxg1ccjyQk'],
};

/** Manifold claim instance per fragment — add a row when each piece drops. */
export const CLAIM_INSTANCES: Record<
  number,
  { instanceId: string; manifoldUrl: string; mintPrice: string }
> = {
  1: {
    instanceId: '4056113392',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4056113392',
    mintPrice: '0.00044 ETH',
  },
};

export const DROP_SCHEDULE: { piece: number; startsUTC: string }[] = [
  { piece: 1, startsUTC: '2026-06-08T15:00:00Z' },
  { piece: 2, startsUTC: '2026-06-12T15:00:00Z' },
  { piece: 3, startsUTC: '2026-06-15T15:00:00Z' },
  { piece: 4, startsUTC: '2026-06-17T15:00:00Z' },
  { piece: 5, startsUTC: '2026-06-19T15:00:00Z' },
  { piece: 6, startsUTC: '2026-06-22T15:00:00Z' },
  { piece: 7, startsUTC: '2026-06-24T15:00:00Z' },
  { piece: 8, startsUTC: '2026-06-26T15:00:00Z' },
  { piece: 9, startsUTC: '2026-06-29T15:00:00Z' },
  { piece: 10, startsUTC: '2026-07-01T15:00:00Z' },
  { piece: 11, startsUTC: '2026-07-03T15:00:00Z' },
  { piece: 12, startsUTC: '2026-07-07T15:00:00Z' },
  { piece: 13, startsUTC: '2026-07-09T15:00:00Z' },
  { piece: 14, startsUTC: '2026-07-11T15:00:00Z' },
  { piece: 15, startsUTC: '2026-07-13T15:00:00Z' },
  { piece: 16, startsUTC: '2026-07-15T15:00:00Z' },
  { piece: 17, startsUTC: '2026-07-17T15:00:00Z' },
  { piece: 18, startsUTC: '2026-07-20T15:00:00Z' },
  { piece: 19, startsUTC: '2026-07-22T15:00:00Z' },
  { piece: 20, startsUTC: '2026-07-24T15:00:00Z' },
  { piece: 21, startsUTC: '2026-07-27T15:00:00Z' },
  { piece: 22, startsUTC: '2026-07-29T15:00:00Z' },
  { piece: 23, startsUTC: '2026-07-31T15:00:00Z' },
  { piece: 24, startsUTC: '2026-08-03T15:00:00Z' },
  { piece: 25, startsUTC: '2026-08-05T15:00:00Z' },
  { piece: 26, startsUTC: '2026-08-07T15:00:00Z' },
  { piece: 27, startsUTC: '2026-08-10T15:00:00Z' },
];

export const PREVIEW_MODE = false;

export const SHARE_PIECES: {
  number: number;
  label: string;
  thumbUrl: string;
  downloadUrl: string;
}[] = [];

export const PIECE_NAMES: Record<number, string> = {
  1: 'Fragment I',
  2: 'Fragment II',
  3: 'Fragment III',
  4: 'Fragment IV',
  5: 'Fragment V',
  6: 'Fragment VI',
  7: 'Fragment VII',
  8: 'Fragment VIII',
  9: 'Fragment IX',
  10: 'Fragment X',
  11: 'Fragment XI',
  12: 'Fragment XII',
  13: 'Fragment XIII',
  14: 'Fragment XIV',
  15: 'Fragment XV',
  16: 'Fragment XVI',
  17: 'Fragment XVII',
  18: 'Fragment XVIII',
  19: 'Fragment XIX',
  20: 'Fragment XX',
  21: 'Fragment XXI',
  22: 'Fragment XXII',
  23: 'Fragment XXIII',
  24: 'Fragment XXIV',
  25: 'Fragment XXV',
  26: 'Fragment XXVI',
  27: 'Fragment XXVII',
};