/** Private “Will It..” triptych — not listed in Explore nav. Flip `revealed` when a canvas opens. */

export const WOULD_IT_MANIFOLD = 'https://manifold.xyz/@nikxnames-art/contract/120996080';
export const WOULD_IT_OPENSEA = 'https://opensea.io/collection/a-familiar-burn';
export const WOULD_IT_OPENSEA_ACTIVITY = 'https://opensea.io/collection/a-familiar-burn/activity';
export const WOULD_IT_COLLECTION = 'https://explore.nikxart.xyz/a-familiar-burn';
export const WOULD_IT_RASTER =
  'https://www.raster.art/artwork/a-familiar-burn-by-nikxname?sort=listing';
export const WOULD_IT_LIST_ETH = '0.008';
/** Panel 2 listings open 10:00 AM Eastern, 14 Sep 2026. */
export const WOULD_IT_PANEL_LIST_AT: Partial<Record<number, string>> = {
  2: '2026-09-14T10:00:00-04:00',
};
export const WOULD_IT_CONTRACT = '0x1641b09e11d19e6f6b9f80273158f9da28555593';
/** Wallets that still hold unsold studio inventory. */
export const WOULD_IT_TREASURY = ['0x81c306bcdc036f334ef4fb8f85a8e6be730a0763']; // ARTIST_MINT_WALLET
export const WOULD_IT_BANNER = '/would-it/banner.webp';
export const WOULD_IT_SHARE = 'https://explore.nikxart.xyz/would-it/share.jpg?v=banner-03';
export const WOULD_IT_PANEL_A = '/would-it/canvas-a.webp';
export const WOULD_IT_PANEL_A_FULL = '/would-it/canvas-a-full.jpg';
export const WOULD_IT_PANEL_B = '/would-it/canvas-b.webp';
export const WOULD_IT_PANEL_B_THUMB = '/would-it/canvas-b-thumb.webp';
export const WOULD_IT_PANEL_B_FULL = '/would-it/canvas-b-full.jpg';

export type WouldCanvasId = 'A' | 'B' | 'C';

export type WouldCanvas = {
  id: WouldCanvasId;
  label: string;
  revealed: boolean;
  manifold: string;
  image?: string;
  thumb?: string;
};

/** Hung left → right as the 15,000px painting reads. A is open; B and C wait on your schedule. */
export const WOULD_CANVASES: WouldCanvas[] = [
  {
    id: 'A',
    label: 'Canvas A',
    revealed: true,
    manifold: `${WOULD_IT_MANIFOLD}/806`,
    image: '/would-it/canvas-a.webp',
    thumb: '/would-it/canvas-a-thumb.webp',
  },
  {
    id: 'B',
    label: 'Canvas B',
    revealed: true,
    manifold: `${WOULD_IT_MANIFOLD}/807`,
    image: '/would-it/canvas-b.webp',
    thumb: '/would-it/canvas-b-thumb.webp',
  },
  {
    id: 'C',
    label: 'Canvas C',
    revealed: false,
    manifold: `${WOULD_IT_MANIFOLD}/808`,
  },
];

export const WOULD_UNREVEALED = '/would-it/unrevealed.webp';
export const WOULD_UNREVEALED_THUMB = '/would-it/unrevealed-thumb.webp';

export const WOULD_SETS = ['A', 'B', 'C', 'D', 'E'] as const;
export const WOULD_PANELS = [1, 2, 3] as const;

export type WouldSetLetter = (typeof WOULD_SETS)[number];
export type WouldPanelStatus = 'available' | 'soon' | 'sold';
export type WouldPanelRow = {
  key: string;
  letter: WouldSetLetter;
  panel: number;
  tokenId: number;
  status: WouldPanelStatus;
  label: string;
  price?: string;
  href: string;
  source?: string;
  offer?: string;
};

/** On-chain token for a lettered panel. A1 = 806 … E3 = 820. */
export function wouldItTokenId(letter: WouldSetLetter, panel: number): number {
  const i = WOULD_SETS.indexOf(letter);
  return 806 + i * 3 + (panel - 1);
}

export function wouldItOpenSeaItem(tokenId: number): string {
  return `https://opensea.io/item/ethereum/${WOULD_IT_CONTRACT}/${tokenId}`;
}

export function wouldPanelRevealed(panel: number): boolean {
  return WOULD_CANVASES[panel - 1]?.revealed === true;
}

export function wouldPanelListed(panel: number, now = Date.now()): boolean {
  if (panel === 1) return true;
  const at = WOULD_IT_PANEL_LIST_AT[panel];
  if (!at) return false;
  return now >= Date.parse(at);
}

export function wouldPanelSoonLabel(panel: number): string {
  if (panel === 2) return 'Available 10AM EST · 14 Sep';
  return 'Coming soon';
}

export function wouldPanelThumb(panel: number): string {
  if (panel === 1 && wouldPanelRevealed(1)) return '/would-it/canvas-a-thumb.webp';
  if (panel === 2 && wouldPanelRevealed(2)) return WOULD_IT_PANEL_B_THUMB;
  return WOULD_UNREVEALED_THUMB;
}
