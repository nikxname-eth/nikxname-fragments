import type { ExploreWork } from '../config/catalog';
import {
  BLOCK_CONTRACT,
  BLOCK_PANELS,
  blockManifoldItem,
  blockOpenSeaItem,
  blockPanelRevealed,
  type BlockPanel,
} from '../config/on-the-block';

function panelTitle(panel: BlockPanel): string {
  const n = String(panel.panel).padStart(2, '0');
  return `Voices Of Time | Panel ${n} · ${panel.name}`;
}

/** Minted triptych panels. The chain dump still ends at token 4. */
export function getVoicesWorks(now = Date.now()): ExploreWork[] {
  return BLOCK_PANELS.map((panel) => {
    const open = blockPanelRevealed(panel, now);
    const poster = open ? panel.look : panel.still;
    const tokenId = panel.tokenId ?? undefined;
    return {
      id: `one-of-ones-${panel.tokenId}`,
      seriesId: 'one-of-ones' as const,
      title: panelTitle(panel),
      subtitle: panel.name,
      kind: 'edition' as const,
      coverUrl: poster,
      originCoverUrl: poster,
      motionUrl: open ? panel.thumb : undefined,
      mediaUrl: open ? panel.video : poster,
      mediaUrlHi: open ? panel.video2k : undefined,
      mediaUrlMax: open ? panel.video4k : undefined,
      mediaType: open && panel.video ? ('video' as const) : ('image' as const),
      manifoldUrl: blockManifoldItem(panel.tokenId) || undefined,
      openSeaUrl: blockOpenSeaItem(panel.tokenId) || undefined,
      contractAddress: BLOCK_CONTRACT,
      tokenId,
      tokenIds: tokenId != null ? [tokenId] : undefined,
      tags: ['1/1'],
      blurb: 'Voices Of Time. Three canvases, one painting.',
      sort: 100 + panel.panel,
      editionCount: 1,
      nativeFps: open && panel.video ? 24 : undefined,
    };
  });
}
