import type { SeriesId } from '../config/catalog';

export type CollectionSite = {
  seriesId: Exclude<SeriesId, 'market'>;
  host: string;
  origin: string;
};

const HOSTS: { seriesId: CollectionSite['seriesId']; host: string }[] = [
  { seriesId: 'a-familiar-burn', host: 'afamiliarburn' },
  { seriesId: 'the-void', host: 'thevoid' },
  { seriesId: 'life-impressions', host: 'lifeimpressions' },
  { seriesId: 'for-her', host: 'forher' },
  { seriesId: 'for-you', host: 'foryou' },
  { seriesId: 'one-of-ones', host: 'oneofones' },
];

export const COLLECTION_SITES: CollectionSite[] = HOSTS.map((s) => ({
  seriesId: s.seriesId,
  host: s.host,
  origin: `https://${s.host}.nikxart.xyz`,
}));

export const HOST_TO_SERIES: Record<string, CollectionSite['seriesId']> = Object.fromEntries(
  COLLECTION_SITES.map((s) => [`${s.host}.nikxart.xyz`, s.seriesId]),
);

export const SERIES_IDS = COLLECTION_SITES.map((s) => s.seriesId);

export function collectionSite(seriesId: string): CollectionSite | undefined {
  return COLLECTION_SITES.find((s) => s.seriesId === seriesId);
}

/** Working share URL (Explore path). Subdomains resolve once DNS CNAMEs are live. */
export function collectionHref(seriesId: string, slug?: string): string {
  const base = `https://explore.nikxart.xyz/${seriesId}`;
  return slug ? `${base}/${slug}` : base;
}

export function isCollectionSeries(id: string): id is CollectionSite['seriesId'] {
  return SERIES_IDS.includes(id as CollectionSite['seriesId']);
}
