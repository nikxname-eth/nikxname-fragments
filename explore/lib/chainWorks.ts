import type { ExploreWork, SeriesId } from '../config/catalog';

export type ChainCollectionJson = {
  seriesId: string;
  label: string;
  contract: string;
  name: string;
  symbol?: string;
  chainId: number;
  fetchedAt: string;
  count: number;
  tokens: {
    tokenId: number;
    name: string;
    description?: string;
    image: string;
    animationUrl?: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    tokenUri: string;
  }[];
};

/** Static imports — run `npm run sync:explore` to refresh. */
import voidJson from '../data/collections/the-void.json';

const STATIC_BY_SERIES: Record<string, ChainCollectionJson> = {
  'the-void': voidJson as ChainCollectionJson,
};

export function getChainCollection(seriesId: string): ChainCollectionJson | null {
  return STATIC_BY_SERIES[seriesId] ?? null;
}

export function chainTokensToWorks(collection: ChainCollectionJson): ExploreWork[] {
  const seriesId = collection.seriesId as SeriesId;
  const openSea = `https://opensea.io/assets/ethereum/${collection.contract}`;
  const manifoldCreator = 'https://manifold.xyz/@nikxnames-art';

  return collection.tokens.map((t) => ({
    id: `${collection.seriesId}-${t.tokenId}`,
    seriesId,
    title: t.name,
    subtitle: `${collection.label} · #${t.tokenId}`,
    kind: 'edition' as const,
    coverUrl: t.image || t.mediaUrl,
    mediaUrl: t.mediaUrl,
    mediaType: t.mediaType,
    // Manifold creator profile; token-specific marketplace deep link as secondary
    manifoldUrl: manifoldCreator,
    tags: [collection.symbol || collection.label, `#${t.tokenId}`],
    blurb: t.description,
    sort: t.tokenId,
    // Extra fields used by stage for on-chain works
    contractAddress: collection.contract,
    tokenId: t.tokenId,
    openSeaUrl: `${openSea}/${t.tokenId}`,
  }));
}

export function getChainWorksForSeries(seriesId: string): ExploreWork[] {
  const col = getChainCollection(seriesId);
  if (!col) return [];
  return chainTokensToWorks(col);
}

export function getAllChainWorks(): ExploreWork[] {
  return Object.keys(STATIC_BY_SERIES).flatMap((id) => getChainWorksForSeries(id));
}
