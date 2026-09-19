import type { ExploreWork } from '../config/catalog';
import {
  WOULD_IT_CONTRACT,
  WOULD_IT_PANEL_A,
  WOULD_IT_PANEL_A_FULL,
  WOULD_IT_PANEL_B,
  WOULD_IT_PANEL_B_FULL,
  WOULD_IT_PANEL_B_THUMB,
  WOULD_UNREVEALED,
  WOULD_UNREVEALED_THUMB,
  wouldItOpenSeaItem,
  wouldPanelRevealed,
} from '../config/would-it';
import { rasterPreviewUrl } from './contracts';
import willItJson from '../data/will-it-tokens.json';

type WillItFile = {
  contract: string;
  panel01: string;
  panel02?: string;
  panelUnrevealed: string;
  tokens: {
    tokenId: number;
    letter: string;
    panel: number;
    name: string;
    previewHash: string;
  }[];
};

const FILE = willItJson as WillItFile;

export function willItContentUrl(panel: number): string {
  if (panel === 1) return FILE.panel01;
  if (panel === 2) return FILE.panel02 || WOULD_IT_PANEL_B_FULL;
  return FILE.panelUnrevealed;
}

export function willItLocalImage(panel: number): string {
  if (panel === 1 && wouldPanelRevealed(1)) return WOULD_IT_PANEL_A;
  if (panel === 2 && wouldPanelRevealed(2)) return WOULD_IT_PANEL_B;
  return WOULD_UNREVEALED;
}

/** Page preview for the closer-look frame. */
export function willItPreviewSrc(panel: number): string {
  return willItLocalImage(panel);
}

/** True-size source for the observe viewer. */
export function willItLookSrc(panel: number): string {
  if (panel === 1 && wouldPanelRevealed(1)) return WOULD_IT_PANEL_A_FULL;
  if (panel === 2 && wouldPanelRevealed(2)) return WOULD_IT_PANEL_B_FULL;
  return willItContentUrl(panel);
}

export function getWillItWorks(): ExploreWork[] {
  return FILE.tokens.map((t) => {
    const open = wouldPanelRevealed(t.panel);
    const arweave = willItContentUrl(t.panel);
    const preview = rasterPreviewUrl(t.previewHash, 'image/2', 700) || willItLocalImage(t.panel);
    const hi =
      t.panel === 1 ? WOULD_IT_PANEL_A_FULL : t.panel === 2 ? WOULD_IT_PANEL_B_FULL : arweave;
    const cover = open
      ? t.panel === 2
        ? WOULD_IT_PANEL_B_THUMB
        : WOULD_IT_PANEL_A
      : WOULD_UNREVEALED_THUMB;
    const media = open ? willItLocalImage(t.panel) : preview;
    return {
      id: `a-familiar-burn-${t.tokenId}`,
      seriesId: 'a-familiar-burn' as const,
      title: t.name,
      kind: 'edition' as const,
      coverUrl: cover,
      originCoverUrl: arweave,
      mediaUrl: media,
      mediaUrlHi: hi,
      mediaType: 'image' as const,
      contractAddress: WOULD_IT_CONTRACT,
      tokenId: t.tokenId,
      openSeaUrl: wouldItOpenSeaItem(t.tokenId),
      collectionLabel: 'A Familiar Burn',
      sort: t.tokenId,
      blurb: 'Will It.. triptych panel',
    };
  });
}

export function matchWillItWork(name: string, tokenId?: string | number): ExploreWork | null {
  const works = getWillItWorks();
  if (tokenId != null && tokenId !== '') {
    const n = Number(tokenId);
    const byId = works.find((w) => w.tokenId === n);
    if (byId) return byId;
  }
  const m = name.match(/will\s*it\.?\.\s*\|\s*panel\s*0*(\d+)\s*-\s*([A-E])/i);
  if (!m) return null;
  const panel = Number(m[1]);
  const letter = m[2].toUpperCase();
  return works.find((w) => w.title.endsWith(`Panel 0${panel} - ${letter}`)) ?? null;
}

export { FILE as WILL_IT_TOKEN_FILE };
