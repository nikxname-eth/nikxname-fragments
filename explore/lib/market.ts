/**
 * Market tab — hubs (OpenSea / Raster / Manifold) + per-collection market entries.
 * Optional listings[] come from `npm run sync:explore:market` when OPENSEA_API_KEY is set.
 */

import marketJson from '../data/market.json';
import { resolveCatalogueCover, PREVIEW_CDN, PREVIEW_PREFIX } from './previews';
import type { ExploreWork } from '../config/catalog';

const SHARE_PREVIEW = 'https://assets.nikxart.xyz/sharepreview.jpg';
const ARTIST_PORTRAIT =
  'https://assets.manifold.xyz/original/7185bec68793d1e8d6fd6c90cd8cb679d23647607064137598a798711958012c.jpg';

type MarketHub = {
  id: string;
  title: string;
  subtitle: string;
  blurb: string;
  url: string;
  kind: 'opensea' | 'raster' | 'manifold';
  coverKey: string;
};

type MarketCollection = {
  id: string;
  seriesId: string;
  title: string;
  subtitle: string;
  contract: string;
  chain: string;
  openSeaCollection: string;
  openSeaContract: string;
  rasterUrl?: string;
  coverFromSeries: string;
  coverWorkId: string;
};

type MarketListing = {
  id: string;
  title: string;
  subtitle?: string;
  price?: string;
  currency?: string;
  image?: string;
  openSeaUrl?: string;
  contract?: string;
  tokenId?: number;
  chain?: string;
  seriesId?: string;
};

type MarketJson = {
  fetchedAt: string;
  hubs: MarketHub[];
  collections: MarketCollection[];
  listings: MarketListing[];
};

const data = marketJson as MarketJson;

function hubCover(hub: MarketHub): string {
  if (hub.kind === 'manifold') return ARTIST_PORTRAIT;
  return SHARE_PREVIEW;
}

function collectionCover(c: MarketCollection): { cover: string; origin: string } {
  // Reuse series R2 previews already synced under explore/previews/<series>/
  const preview = `${PREVIEW_CDN}/${PREVIEW_PREFIX}/${c.coverFromSeries}/${c.coverWorkId}.jpg`;
  return { cover: preview, origin: preview };
}

export function getMarketWorks(): ExploreWork[] {
  const hubs: ExploreWork[] = data.hubs.map((h, i) => {
    const origin = hubCover(h);
    return {
      id: h.id,
      seriesId: 'market' as const,
      title: h.title,
      subtitle: h.subtitle,
      kind: 'market' as const,
      coverUrl: resolveCatalogueCover('market', h.coverKey || h.id, origin),
      originCoverUrl: origin,
      mediaUrl: origin,
      mediaType: 'image' as const,
      openSeaUrl: h.kind === 'opensea' ? h.url : undefined,
      rasterUrl: h.kind === 'raster' ? h.url : undefined,
      manifoldUrl: h.kind === 'manifold' ? h.url : undefined,
      blurb: h.blurb,
      sort: i + 1,
      tags: ['hub'],
    };
  });

  const collections: ExploreWork[] = data.collections.map((c, i) => {
    const { cover, origin } = collectionCover(c);
    return {
      id: c.id,
      seriesId: 'market' as const,
      title: c.title,
      subtitle: c.subtitle,
      kind: 'market' as const,
      coverUrl: cover,
      originCoverUrl: origin,
      mediaUrl: origin,
      mediaType: 'image' as const,
      openSeaUrl: c.openSeaCollection || c.openSeaContract,
      rasterUrl: c.rasterUrl,
      contractAddress: c.contract,
      blurb: `Browse secondary listings for ${c.title} on OpenSea (${c.chain}).`,
      sort: 100 + i,
      tags: ['collection', c.chain],
    };
  });

  const listings: ExploreWork[] = (data.listings || []).map((l, i) => {
    const origin = l.image || SHARE_PREVIEW;
    return {
      id: l.id || `listing-${i}`,
      seriesId: 'market' as const,
      title: l.title,
      subtitle: l.price
        ? `${l.price}${l.currency ? ` ${l.currency}` : ''}`
        : l.subtitle,
      kind: 'market' as const,
      coverUrl: resolveCatalogueCover('market', l.id || `listing-${i}`, origin),
      originCoverUrl: origin,
      mediaUrl: origin,
      mediaType: 'image' as const,
      openSeaUrl: l.openSeaUrl,
      contractAddress: l.contract,
      tokenId: l.tokenId,
      blurb: 'Active listing (synced).',
      sort: 200 + i,
      tags: ['listing'],
    };
  });

  return [...hubs, ...collections, ...listings];
}

export function getMarketFetchedAt(): string {
  return data.fetchedAt;
}
