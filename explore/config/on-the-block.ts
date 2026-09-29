/**
 * On The Block — 1/1 triptych auction frame.
 *
 * Will It.. fractioned a painting across fifteen editions. This is the other
 * thesis: three canvases, one painting, one wallet.
 *
 * Swap when the real work is ready:
 * 1. Replace each panel's `thumb` / `look` (and the hang stills).
 * 2. Set tokenId on panels 02 and 03 once those tokens exist.
 * 3. Set BLOCK_LISTING.manifoldId (Gallery listing) or a Seaport order later.
 * 4. Set startsAt, endsAt, reserveEth, then flip status off `framework`.
 *
 * Settlement: panel 01 is the token on the block. 02 and 03 stay in the
 * studio wallet and transfer to the winning address after the bid settles,
 * so the set leaves together.
 */

import { WOULD_IT_CONTRACT, WOULD_UNREVEALED, WOULD_UNREVEALED_THUMB } from './would-it';

export const BLOCK_CONTRACT = WOULD_IT_CONTRACT;
export const BLOCK_CHAIN = 'ethereum' as const;
export const BLOCK_TREASURY = '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763';

export const BLOCK_PAGE = 'https://explore.nikxart.xyz/on-the-block';
export const BLOCK_TITLE = 'On The Block · Nikxname';
export const BLOCK_DESC =
  'A triptych: three canvases, one painting. Auctioned as a 1 of 1 — one panel on the block, the other two follow the winning wallet.';

/** Working title until the painting is named. TORCHED is the stand-in token. */
export const BLOCK_WORK_TITLE = 'TORCHED';
export const BLOCK_PLACEHOLDER = true;

export type BlockStatus = 'framework' | 'scheduled' | 'live' | 'settled';

export const BLOCK_LISTING = {
  /** Manifold Gallery listing id when the auction is created in Studio. */
  manifoldId: null as string | null,
  /** Optional Seaport order hash if we settle on our own rails later. */
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
  thumb: string;
  look: string;
  revealed: boolean;
};

const TORCHED_THUMB = '/embers/thumbs/watermelon.webp';
const TORCHED_LOOK = '/embers/close/watermelon.webp';

export const BLOCK_PANELS: BlockPanel[] = [
  {
    panel: 1,
    role: 'auction',
    label: '01 · On the block',
    tokenId: 825,
    name: 'TORCHED',
    thumb: TORCHED_THUMB,
    look: TORCHED_LOOK,
    revealed: true,
  },
  {
    panel: 2,
    role: 'awarded',
    label: '02 · Awarded with the win',
    tokenId: null,
    name: 'Panel 02',
    thumb: WOULD_UNREVEALED_THUMB,
    look: WOULD_UNREVEALED,
    revealed: false,
  },
  {
    panel: 3,
    role: 'awarded',
    label: '03 · Awarded with the win',
    tokenId: null,
    name: 'Panel 03',
    thumb: WOULD_UNREVEALED_THUMB,
    look: WOULD_UNREVEALED,
    revealed: false,
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
