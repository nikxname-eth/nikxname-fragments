/**
 * On The Block — Voices Of Time.
 *
 * A 1/1 triptych on the 1 of 1s contract (not A Familiar Burn).
 * Panel 02 (center) is auctioned. Panels 01 (Devil) and 03 (Angel)
 * transfer to the winning wallet so the set leaves together.
 *
 * Token IDs stay null until mint. Set BLOCK_LISTING.manifoldId when the
 * Gallery listing is live. Studio listing: 48h from first bid, opens
 * Tuesday 11:00 AM Eastern.
 */

export const BLOCK_SERIES = 'one-of-ones' as const;
export const BLOCK_CONTRACT = '0x07f3bfe5ca8d84108df5c020f885d1d6bf40585e';
export const BLOCK_CHAIN = 'ethereum' as const;
export const BLOCK_TREASURY = '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763';
export const BLOCK_COLLECTION_HREF = '/one-of-ones';
export const BLOCK_COLLECTION_LABEL = "1 of 1's";

export const BLOCK_PAGE = 'https://explore.nikxart.xyz/on-the-block';
export const BLOCK_TITLE = 'Voices Of Time · On The Block';
export const BLOCK_DESC =
  'Voices Of Time — a triptych: three canvases, one painting. A 1 of 1 on the 1 of 1s contract. The center is on the block; Devil and Angel follow the winning wallet.';
export const BLOCK_WORK_TITLE = 'Voices Of Time';
export const BLOCK_BLIP = "Mirror Mirror.. Who's whisper rings truer?";
export const BLOCK_SHARE = '/voices-of-time/share.jpg?v=framed';
export const BLOCK_SHARE_W = '2400';
export const BLOCK_SHARE_H = '1257';
export const BLOCK_PLACEHOLDER = false;

const CDN = 'https://assets.nikxart.xyz/explore/media/a-familiar-burn';
/** Bump when masters are replaced so CDN/browser caches miss. */
const MEDIA_V = 'h264';

/** Center panel stays veiled until this instant (Eastern). */
export const BLOCK_REVEAL_AT = '2026-10-05T17:00:00-04:00';
/** Bidding may open at this instant. Timer then runs 48h from first bid. */
export const BLOCK_BID_OPENS_AT = '2026-10-06T11:00:00-04:00';
export const BLOCK_AUCTION_HOURS = 48;

export type BlockStatus = 'framework' | 'scheduled' | 'live' | 'settled';
export type BlockTier = '1080' | '2k' | '4k';

export const BLOCK_TIERS: { id: BlockTier; label: string }[] = [
  { id: '1080', label: '1080' },
  { id: '2k', label: '2K' },
  { id: '4k', label: '4K' },
];

export const BLOCK_LISTING = {
  manifoldId: null as string | null,
  seaportHash: null as string | null,
  startsAt: BLOCK_BID_OPENS_AT,
  endsAt: null as string | null,
  reserveEth: null as string | null,
  timer: 'first-bid' as const,
  durationHours: BLOCK_AUCTION_HOURS,
  status: 'scheduled' as BlockStatus,
};

export type BlockPanel = {
  panel: 1 | 2 | 3;
  role: 'auction' | 'awarded';
  label: string;
  tokenId: number | null;
  name: string;
  /** Light motion for cards / small screens. */
  thumb: string;
  still: string;
  look: string;
  video?: string;
  video2k?: string;
  video4k?: string;
  revealed: boolean;
};

export const BLOCK_PANELS: BlockPanel[] = [
  {
    panel: 1,
    role: 'awarded',
    label: '01 · Awarded with the win',
    tokenId: null,
    name: 'Devil',
    thumb: `/voices-of-time/devil-cover.gif?v=${MEDIA_V}`,
    still: `/voices-of-time/devil-still.webp?v=${MEDIA_V}`,
    look: `/voices-of-time/devil-still.webp?v=${MEDIA_V}`,
    video: `${CDN}/voices-devil-1080.mp4?v=${MEDIA_V}`,
    video2k: `${CDN}/voices-devil-2k.mp4?v=${MEDIA_V}`,
    video4k: `${CDN}/voices-devil-4k.mp4?v=${MEDIA_V}`,
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
    thumb: `/voices-of-time/halo-cover.gif?v=${MEDIA_V}`,
    still: `/voices-of-time/halo-still.webp?v=${MEDIA_V}`,
    look: `/voices-of-time/halo-still.webp?v=${MEDIA_V}`,
    video: `${CDN}/voices-halo-1080.mp4?v=${MEDIA_V}`,
    video2k: `${CDN}/voices-halo-2k.mp4?v=${MEDIA_V}`,
    video4k: `${CDN}/voices-halo-4k.mp4?v=${MEDIA_V}`,
    revealed: true,
  },
];

export function panelVideo(panel: BlockPanel, tier: BlockTier): string | undefined {
  if (tier === '4k') return panel.video4k || panel.video2k || panel.video;
  if (tier === '2k') return panel.video2k || panel.video;
  return panel.video;
}

export function blockPanelRevealed(panel: BlockPanel, now = Date.now()): boolean {
  if (panel.panel === 2 && now < Date.parse(BLOCK_REVEAL_AT)) return false;
  return panel.revealed;
}

export function blockOpenSeaItem(tokenId: number | null): string | null {
  if (tokenId == null) return null;
  return `https://opensea.io/item/${BLOCK_CHAIN}/${BLOCK_CONTRACT}/${tokenId}`;
}

export function blockManifoldListingUrl(): string | null {
  if (!BLOCK_LISTING.manifoldId) return null;
  return `https://gallery.manifold.xyz/listing?listingId=${BLOCK_LISTING.manifoldId}`;
}

export function blockStatusAt(now = Date.now()): BlockStatus {
  if (BLOCK_LISTING.status === 'settled') return 'settled';
  const start = BLOCK_LISTING.startsAt ? Date.parse(BLOCK_LISTING.startsAt) : NaN;
  const end = BLOCK_LISTING.endsAt ? Date.parse(BLOCK_LISTING.endsAt) : NaN;
  if (Number.isFinite(end) && now >= end) return 'settled';
  if (Number.isFinite(start) && now < start) return 'scheduled';
  if (BLOCK_LISTING.manifoldId || BLOCK_LISTING.seaportHash) return 'live';
  if (BLOCK_LISTING.status === 'framework') return 'framework';
  return 'scheduled';
}

export function blockStatusLabel(status: BlockStatus): string {
  if (status === 'live') return 'Live';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'settled') return 'Settled';
  return 'Framework · not live';
}

export function formatEastern(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(d);
}
