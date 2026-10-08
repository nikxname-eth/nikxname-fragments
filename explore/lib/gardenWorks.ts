import { getAllWorks, getBlossomCanvasWork, type ExploreWork, type SeriesId } from '../config/catalog';
import { getAfbSpecialEditions } from './chainWorks';
import { getEmbersWorks, matchEmberWork } from './embersWorks';
import { getWillItWorks, matchWillItWork } from './willItWorks';

export type GardenToken = {
  seriesId: SeriesId | string;
  collection: string;
  contract: string;
  chain: string;
  tokenId: string;
  name: string;
  quantity: number;
  previewUrl?: string;
  contentUrl?: string;
};

export function exploreCatalogue(): ExploreWork[] {
  const seen = new Set<string>();
  const out: ExploreWork[] = [];
  for (const w of [
    ...getAfbSpecialEditions(),
    ...getAllWorks(),
    ...getWillItWorks(),
    ...getEmbersWorks(),
  ]) {
    if (w.kind === 'market' || seen.has(w.id)) continue;
    seen.add(w.id);
    out.push(w);
  }
  return out;
}

export function matchWork(token: GardenToken, catalog: ExploreWork[]): ExploreWork | null {
  const id = `${token.seriesId}-${token.tokenId}`;
  const byId = catalog.find((w) => w.id === id);
  if (byId) return byId;
  const ember = matchEmberWork(token.name, token.tokenId);
  if (ember) return ember;
  const will = matchWillItWork(token.name, token.tokenId);
  if (will) return will;
  const title = token.name.trim().toLowerCase();
  if (title.includes('blossom fragment')) {
    return getBlossomCanvasWork(title.includes('anim') ? 'animated' : 'still');
  }
  const byTitle = catalog.find(
    (w) => w.seriesId === token.seriesId && w.title.trim().toLowerCase() === title,
  );
  if (byTitle) return byTitle;
  if (token.seriesId === 'a-familiar-burn') {
    const m = token.name.match(/fragment\s*0*(\d{1,2})/i);
    if (m) {
      const n = Number(m[1]);
      return catalog.find((w) => w.pieceNumber === n) ?? null;
    }
  }
  return null;
}

export function asTheatreWork(token: GardenToken, catalog: ExploreWork[]): ExploreWork {
  const matched = matchWork(token, catalog);
  if (matched) {
    return {
      ...matched,
      title: matched.title || token.name,
      collectionLabel: token.collection || matched.collectionLabel,
      mediaUrl: matched.mediaUrl || token.contentUrl,
      originCoverUrl:
        matched.originCoverUrl && !matched.originCoverUrl.includes('/explore/previews/')
          ? matched.originCoverUrl
          : token.contentUrl || matched.originCoverUrl,
    };
  }
  const content = token.contentUrl || '';
  const preview = token.previewUrl || '';
  const video = /\.(mp4|webm|mov)(\?|$)/i.test(content);
  const image = /\.(gif|png|jpe?g|webp|avif)(\?|$)/i.test(content);
  const still = image ? content : preview;
  return {
    id: `garden-${token.seriesId}-${token.tokenId}`,
    seriesId: (token.seriesId as ExploreWork['seriesId']) || 'one-of-ones',
    title: token.name,
    collectionLabel: token.collection,
    kind: 'edition',
    coverUrl: still || content,
    originCoverUrl: still || preview,
    mediaUrl: video ? content : still || content,
    mediaType: video ? 'video' : 'image',
    contractAddress: token.contract,
    tokenId: Number(token.tokenId),
    sort: Number(token.tokenId) || 0,
  };
}
