/**
 * On The Block — Voices Of Time.
 *
 * A 1/1 triptych. Panel 02 (center) is auctioned. Panels 01 (Devil) and
 * 03 (Angel) transfer to the winning wallet so the set leaves together.
 *
 * Token IDs stay null until mint. Set BLOCK_LISTING.manifoldId / dates
 * when the Gallery listing is live, then flip status off `framework`.
 */

export const BLOCK_CONTRACT = '0x1641b09e11d19e6f6b9f80273158f9da28555593';
export const BLOCK_CHAIN = 'ethereum' as const;
export const BLOCK_TREASURY = '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763';

export const BLOCK_PAGE = 'https://explore.nikxart.xyz/on-the-block';
export const BLOCK_TITLE = 'Voices Of Time · On The Block';
export const BLOCK_DESC =
  'Voices Of Time — a triptych: three canvases, one painting. Auctioned as a 1 of 1. The center is on the block; Devil and Angel follow the winning wallet.';
export const BLOCK_WORK_TITLE = 'Voices Of Time';
export const BLOCK_BLIP = "Mirror Mirror.. Who's whisper rings truer?";
export const BLOCK_SHARE = '/voices-of-time/share.jpg';
export const BLOCK_PLACEHOLDER = false;

const CDN = 'https://assets.nikxart.xyz/explore/media/a-familiar-burn';

export type BlockStatus = 'framework' | 'scheduled' | 'live' | 'settled';

export const BLOCK_LISTING = {
  manifoldId: null as string | null,
  seaportHash: null as string | null,
  startsAt: null as string | null,
  endsAt: null as string | null,
  reserveEth: null as string | null,
  status: 'framework' as BlockStatus,
};

export type BlockPanel = {
  panel: 1 | 2 | 3;
  role: 'auction' | 'awarded';
  label: string;
  tokenId: number | null;
  name: string;
  /** Light motion for the hang — cover GIF, never the 5K master. */
  thumb: string;
  still: string;
  look: string;
  lookHi?: string;
  video?: string;
  revealed: boolean;
};

export const BLOCK_PANELS: BlockPanel[] = [
  {
    panel: 1,
    role: 'awarded',
    label: '01 · Awarded with the win',
    tokenId: null,
    name: 'Devil',
    thumb: '/voices-of-time/devil-cover.gif',
    still: '/voices-of-time/devil-still.webp',
    look: `${CDN}/voices-devil-look.gif`,
    lookHi: `${CDN}/voices-devil-full.gif`,
    video: `${CDN}/voices-devil-1080.mp4`,
    revealed: true,
  },
  {
    panel: 2,
    role: 'auction',
    label: '02 · On the block',
    tokenId: null,
    name: 'The whisper',
    thumb: '/voices-of-time/unrevealed.webp',
    still: '/voices-of-time/unrevealed.webp',
    look: '/voices-of-time/unrevealed.webp',
    revealed: false,
  },
  {
    panel: 3,
    role: 'awarded',
    label: '03 · Awarded with the win',
    tokenId: null,
    name: 'Angel',
    thumb: '/voices-of-time/halo-cover.gif',
    still: '/voices-of-time/halo-still.webp',
    look: `${CDN}/voices-halo-look.gif`,
    lookHi: `${CDN}/voices-halo-full.gif`,
    video: `${CDN}/voices-halo-1080.mp4`,
    revealed: true,
  },
];

export function blockOpenSeaItem(tokenId: number | null): string | null {
  if (tokenId == null) return null;
  return `https://opensea.io/item/${BLOCK_CHAIN}/${BLOCK_CONTRACT}/${tokenId}`;
}

export function blockStatusAt(now = Date.now()): BlockStatus {
  if (BLOCK_LISTING.status === 'settled' || BLOCK_LISTING.status === 'framework') {
    return BLOCK_LISTING.status;
  }
  const start = BLOCK_LISTING.startsAt ? Date.parse(BLOCK_LISTING.startsAt) : NaN;
  const end = BLOCK_LISTING.endsAt ? Date.parse(BLOCK_LISTING.endsAt) : NaN;
  if (Number.isFinite(end) && now >= end) return 'settled';
  if (Number.isFinite(start) && now < start) return 'scheduled';
  if (BLOCK_LISTING.manifoldId || BLOCK_LISTING.seaportHash) return 'live';
  return BLOCK_LISTING.status;
}

export function blockStatusLabel(status: BlockStatus): string {
  if (status === 'live') return 'Live';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'settled') return 'Settled';
  return 'Framework · not live';
}
