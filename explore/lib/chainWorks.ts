import type { ExploreWork, SeriesId } from '../config/catalog';
import { claimedEditionCount } from '../config/editionClaimed';
import { resolveCatalogueCover } from './previews';

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
  /** Per-token Manifold listing / claim URL when known */
  manifoldUrl?: string;
  attributes?: { trait_type?: string; value?: string | number; display_type?: string }[];
};

export type ChainCollectionJson = {
  seriesId: string;
  label: string;
  contract: string;
  standard?: string;
  chain?: string;
  name: string;
  symbol?: string;
  chainId: number;
  openSeaSlug?: string;
  fetchedAt: string;
  count: number;
  tokens: ChainToken[];
};

export type VoidSubgroup = 'artwork' | 'flutter-editions' | 'guardians';

import voidJson from '../data/collections/the-void.json';
import lifeJson from '../data/collections/life-impressions.json';
import forYouJson from '../data/collections/for-you.json';
import forHerJson from '../data/collections/for-her.json';
import oneOfOnesJson from '../data/collections/one-of-ones.json';
import afbJson from '../data/collections/a-familiar-burn.json';

/** Optional R2 rehosts for Theatre (esp. video 1/1s) */
import mediaCacheJson from '../data/media-cache.json';

const STATIC_BY_SERIES: Record<string, ChainCollectionJson> = {
  'the-void': voidJson as ChainCollectionJson,
  'life-impressions': lifeJson as ChainCollectionJson,
  'for-you': forYouJson as ChainCollectionJson,
  'for-her': forHerJson as ChainCollectionJson,
  'one-of-ones': oneOfOnesJson as ChainCollectionJson,
};

type MediaCacheEntry = {
  seriesId: string;
  workId: string;
  mediaUrl: string;
  mediaUrlHi?: string;
  mediaUrlMax?: string;
  mediaType?: 'image' | 'video';
  posterUrl?: string;
};

const MEDIA_CACHE: MediaCacheEntry[] = Array.isArray((mediaCacheJson as { items?: MediaCacheEntry[] }).items)
  ? ((mediaCacheJson as { items: MediaCacheEntry[] }).items)
  : [];

function mediaCacheFor(seriesId: string, workId: string): MediaCacheEntry | undefined {
  return MEDIA_CACHE.find((e) => e.seriesId === seriesId && e.workId === workId);
}

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

/** Strip "#1/9" style suffixes so numbered edition tokens group as one work. */
export function editionGroupName(name: string): string {
  return name.replace(/\s*#\s*\d+\s*\/\s*\d+\s*$/i, '').trim();
}

/** Minted copies of a numbered fragment from the AFB dump (claimed overlay wins). */
export function afbFragmentCopies(piece: number): number {
  const re = new RegExp(`^fragment\\s*0*${piece}(?:\\b|$)`, 'i');
  const rows = (afbJson as ChainCollectionJson).tokens.filter((t) => re.test(t.name));
  const n = Math.max(rows.length, Number(rows[0]?.editionCount) || 0, 1);
  return claimedEditionCount(
    'a-familiar-burn',
    `Fragment ${String(piece).padStart(2, '0')}`,
    n,
  );
}

/**
 * Collapse identical titles into one gallery card with editionCount (xN).
 * Keeps lowest tokenId as the representative media.
 */
export function collapseByEdition(tokens: ChainToken[]): ChainToken[] {
  const map = new Map<string, ChainToken & { editionCount: number; tokenIds: number[] }>();
  for (const t of tokens) {
    const key = editionGroupName(t.name).toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...t,
        name: editionGroupName(t.name),
        editionCount: 1,
        tokenIds: [t.tokenId],
      });
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
  return [...map.values()].sort((a, b) => a.tokenId - b.tokenId);
}

export function chainTokensToWorks(collection: ChainCollectionJson): ExploreWork[] {
  const seriesId = collection.seriesId as SeriesId;
  const openSeaNetwork =
    collection.openSeaSlug || (collection.chainId === 8453 ? 'base' : 'ethereum');
  const openSeaBase = `https://opensea.io/assets/${openSeaNetwork}/${collection.contract}`;
  const manifoldCreator = 'https://manifold.xyz/@nikxnames-art';

  const tokens = collapseByEdition(collection.tokens);

  return tokens.map((t, mintOrder) => {
    const editionCount = claimedEditionCount(
      seriesId,
      t.name,
      t.editionCount ?? 1,
    );
    const voidGroup = seriesId === 'the-void' ? classifyVoidSubgroup(t.name) : undefined;
    const workId = `${collection.seriesId}-${t.tokenId}`;
    const sourceImage = t.image || t.mediaUrl;
    const cached = mediaCacheFor(seriesId, workId);
    const mediaUrl = cached?.mediaUrl || t.mediaUrl;
    const mediaUrlHi = cached?.mediaUrlHi || undefined;
    const mediaUrlMax = cached?.mediaUrlMax || undefined;
    const mediaType = cached?.mediaType || t.mediaType;
    const originCover = cached?.posterUrl || sourceImage;
    const gifCover = /\.gif(\?|$)/i.test(originCover);

    // Subtext stays empty for most works — mint order is sort only.
    // Edition multiples use the badge (xN), not caption text.
    // Prefer R2 media-cache for Theatre (same smooth path as 1/1s).
    // GIF covers skip the static JPG preview so motion stays in the grid.
    return {
      id: workId,
      seriesId,
      title: t.name,
      kind: 'edition' as const,
      coverUrl: gifCover ? originCover : resolveCatalogueCover(seriesId, workId, originCover),
      originCoverUrl: originCover,
      mediaUrl,
      mediaUrlHi,
      mediaUrlMax,
      mediaType,
      manifoldUrl: t.manifoldUrl || manifoldCreator,
      tags:
        seriesId === 'one-of-ones'
          ? ['1/1']
          : editionCount > 1
            ? [`x${editionCount}`]
            : undefined,
      blurb: t.description,
      sort: t.tokenId || mintOrder + 1,
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

  // Mint order (token id ascending)
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

/** Original Arweave GIF is 4320×7680 / ~66MB. Site uses R2 encodes only. */
const PUZZLING_EYE_COVER =
  'https://assets.nikxart.xyz/explore/media/a-familiar-burn/puzzling-eye.gif';
const PUZZLING_EYE_VIDEO =
  'https://assets.nikxart.xyz/explore/media/a-familiar-burn/puzzling-eye-720.mp4';
const PUZZLING_EYE_HD =
  'https://assets.nikxart.xyz/explore/media/a-familiar-burn/puzzling-eye-1080.mp4';

/**
 * Pre-fragment AFB edition (Puzzling Eye, 9). Shown under the 27-fragment grid.
 */
export function getAfbSpecialEditions(): ExploreWork[] {
  const raw = (afbJson as ChainCollectionJson).tokens.filter((t) =>
    /^puzzling eye/i.test(t.name),
  );
  if (!raw.length) return [];
  const [t] = collapseByEdition(raw);
  const editionCount = claimedEditionCount('a-familiar-burn', 'Puzzling Eye', t.editionCount ?? raw.length);
  return [
    {
      id: 'a-familiar-burn-puzzling-eye',
      seriesId: 'a-familiar-burn',
      title: 'Puzzling Eye',
      kind: 'edition',
      coverUrl: PUZZLING_EYE_COVER,
      originCoverUrl: PUZZLING_EYE_COVER,
      mediaUrl: PUZZLING_EYE_VIDEO,
      mediaUrlHi: PUZZLING_EYE_HD,
      mediaType: 'video',
      contractAddress: (afbJson as ChainCollectionJson).contract,
      tokenId: t.tokenId,
      openSeaUrl: `https://opensea.io/item/ethereum/${(afbJson as ChainCollectionJson).contract}/1`,
      editionCount,
      sort: 0,
      tags: ['portrait'],
      blurb: 'The first edition of A Familiar Burn — nine animated eyes, before the fragments.',
    },
  ];
}
