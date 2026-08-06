import type { ExploreWork, SeriesId } from '../config/catalog';

export type ChainToken = {
  tokenId: number;
  name: string;
  description?: string;
  image: string;
  animationUrl?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  tokenUri: string;
  editionCount?: number;
};

export type ChainCollectionJson = {
  seriesId: string;
  label: string;
  contract: string;
  standard?: string;
  name: string;
  symbol?: string;
  chainId: number;
  fetchedAt: string;
  count: number;
  tokens: ChainToken[];
};

export type VoidSubgroup = 'artwork' | 'flutter-editions' | 'guardians';

import voidJson from '../data/collections/the-void.json';
import lifeJson from '../data/collections/life-impressions.json';
import forYouJson from '../data/collections/for-you.json';
import forHerJson from '../data/collections/for-her.json';
import burnJson from '../data/collections/a-familiar-burn.json';

const STATIC_BY_SERIES: Record<string, ChainCollectionJson> = {
  'the-void': voidJson as ChainCollectionJson,
  'life-impressions': lifeJson as ChainCollectionJson,
  'for-you': forYouJson as ChainCollectionJson,
  'for-her': forHerJson as ChainCollectionJson,
  'a-familiar-burn': burnJson as ChainCollectionJson,
};

export function getChainCollection(seriesId: string): ChainCollectionJson | null {
  const col = STATIC_BY_SERIES[seriesId];
  if (!col || !col.tokens?.length) return null;
  return col;
}

function classifyVoidSubgroup(name: string): VoidSubgroup {
  const n = name.trim().toLowerCase();
  if (n.includes('flutter into the void')) return 'flutter-editions';
  if (n.includes('guardian')) return 'guardians';
  return 'artwork';
}

function subgroupSortKey(g: VoidSubgroup): number {
  if (g === 'artwork') return 0;
  if (g === 'flutter-editions') return 1;
  return 2;
}

/**
 * Collapse identical titles into one gallery card with editionCount (xN).
 * Keeps lowest tokenId as the representative media.
 */
export function collapseByEdition(tokens: ChainToken[]): ChainToken[] {
  const map = new Map<string, ChainToken & { editionCount: number; tokenIds: number[] }>();
  for (const t of tokens) {
    const key = t.name.trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...t, editionCount: t.editionCount ?? 1, tokenIds: [t.tokenId] });
    } else {
      existing.editionCount += 1;
      existing.tokenIds.push(t.tokenId);
      if (t.tokenId < existing.tokenId) {
        existing.tokenId = t.tokenId;
        existing.image = t.image;
        existing.mediaUrl = t.mediaUrl;
        existing.mediaType = t.mediaType;
        existing.animationUrl = t.animationUrl;
        existing.tokenUri = t.tokenUri;
        existing.description = t.description;
      }
    }
  }
  // Prefer precomputed editionCount from sync when present and higher
  for (const t of tokens) {
    const key = t.name.trim().toLowerCase();
    const row = map.get(key)!;
    if ((t.editionCount ?? 0) > row.editionCount) row.editionCount = t.editionCount!;
  }
  return [...map.values()].sort((a, b) => a.tokenId - b.tokenId);
}

export function chainTokensToWorks(
  collection: ChainCollectionJson,
  options?: { collapseEditions?: boolean },
): ExploreWork[] {
  const seriesId = collection.seriesId as SeriesId;
  const openSeaBase = `https://opensea.io/assets/ethereum/${collection.contract}`;
  const manifoldCreator = 'https://manifold.xyz/@nikxnames-art';

  const tokens =
    options?.collapseEditions === false
      ? collection.tokens
      : collapseByEdition(collection.tokens);

  return tokens.map((t) => {
    const editionCount = t.editionCount ?? 1;
    const voidGroup =
      seriesId === 'the-void' ? classifyVoidSubgroup(t.name) : undefined;

    return {
      id: `${collection.seriesId}-${t.tokenId}`,
      seriesId,
      title: t.name,
      subtitle:
        editionCount > 1
          ? `${collection.label} · x${editionCount}`
          : `${collection.label} · #${t.tokenId}`,
      kind: 'edition' as const,
      coverUrl: t.image || t.mediaUrl,
      mediaUrl: t.mediaUrl,
      mediaType: t.mediaType,
      manifoldUrl: manifoldCreator,
      tags: [
        collection.symbol || collection.label,
        ...(editionCount > 1 ? [`x${editionCount}`] : [`#${t.tokenId}`]),
      ],
      blurb: t.description,
      sort: t.tokenId,
      contractAddress: collection.contract,
      tokenId: t.tokenId,
      openSeaUrl: `${openSeaBase}/${t.tokenId}`,
      editionCount,
      voidSubgroup: voidGroup,
    };
  });
}

export function getChainWorksForSeries(seriesId: string): ExploreWork[] {
  const col = getChainCollection(seriesId);
  if (!col) return [];
  const works = chainTokensToWorks(col);

  if (seriesId === 'the-void') {
    return works.sort((a, b) => {
      const ga = subgroupSortKey((a.voidSubgroup as VoidSubgroup) || 'artwork');
      const gb = subgroupSortKey((b.voidSubgroup as VoidSubgroup) || 'artwork');
      if (ga !== gb) return ga - gb;
      return a.sort - b.sort;
    });
  }

  return works.sort((a, b) => a.sort - b.sort);
}

export function getAllChainWorks(): ExploreWork[] {
  return Object.keys(STATIC_BY_SERIES).flatMap((id) => getChainWorksForSeries(id));
}

export function getVoidSectionLabel(subgroup: VoidSubgroup): string {
  if (subgroup === 'artwork') return 'Artworks';
  if (subgroup === 'flutter-editions') return 'Flutter Into The Void · Editions';
  return 'Guardians';
}
