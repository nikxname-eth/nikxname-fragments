import type { ExploreWork } from '../config/catalog';
import { EMBERS, emberById } from '../config/embers';
import { WOULD_IT_CONTRACT } from '../config/would-it';
import embersJson from '../data/embers-tokens.json';

export type EmberToken = {
  tokenId: number;
  name: string;
  palette: string;
  emberId: string;
  image: string;
  animationUrl: string | null;
  mediaType: 'image' | 'video';
  tokenUri: string;
  fps: number;
  posterUrl?: string;
  coverGif?: string;
  localCover?: string;
  media1080?: string;
  localPoster?: string;
};

type EmberFile = {
  seriesId: string;
  contract: string;
  fetchedAt: string;
  fps: number;
  tokens: EmberToken[];
};

const FILE = embersJson as EmberFile;
const CONTRACT = (FILE.contract || WOULD_IT_CONTRACT).toLowerCase();

export function isEmberTitle(name: string): boolean {
  return /flutter into the embers/i.test(name);
}

export function emberGivenName(name: string): string {
  const parts = name.split('|');
  return (parts[1] || parts[0]).trim();
}

export function getEmbersWorks(): ExploreWork[] {
  return FILE.tokens.map((t, i) => {
    const local = emberById(t.emberId) || EMBERS[i];
    const cover = t.localCover || `/embers/covers/${t.emberId}.gif`;
    const video1080 = t.media1080 && /\.mp4(\?|$)/i.test(t.media1080) ? t.media1080 : undefined;
    const video = video1080 || t.animationUrl || undefined;
    return {
      id: `a-familiar-burn-${t.tokenId}`,
      seriesId: 'a-familiar-burn' as const,
      title: emberGivenName(t.name),
      subtitle: t.palette || local?.name,
      kind: 'edition' as const,
      coverUrl: cover,
      originCoverUrl: t.coverGif || t.image,
      mediaUrl: video || t.media1080 || t.image,
      mediaUrlHi: video1080 || video || t.image,
      mediaType: video ? 'video' : 'image',
      nativeFps: 24,
      contractAddress: CONTRACT,
      tokenId: t.tokenId,
      openSeaUrl: `https://opensea.io/item/ethereum/${CONTRACT}/${t.tokenId}`,
      collectionLabel: 'A Familiar Burn',
      sort: t.tokenId,
      editionCount: 1,
      tags: ['embers'],
      blurb: t.palette
        ? `Flutter Into The Embers · ${t.palette}. Hand painted, animated frame by frame at 24fps.`
        : 'Flutter Into The Embers. Hand painted, animated frame by frame at 24fps.',
    };
  });
}

export function matchEmberWork(name: string, tokenId?: string | number): ExploreWork | null {
  const works = getEmbersWorks();
  if (tokenId != null && tokenId !== '') {
    const n = Number(tokenId);
    const byId = works.find((w) => w.tokenId === n);
    if (byId) return byId;
  }
  const needle = name.trim().toLowerCase();
  const given = emberGivenName(name).toLowerCase();
  return (
    works.find((w) => w.title.trim().toLowerCase() === needle) ||
    works.find((w) => w.title.trim().toLowerCase() === given) ||
    (isEmberTitle(name) ? works.find((w) => needle.includes(w.title.trim().toLowerCase())) : null) ||
    null
  );
}

export { FILE as EMBERS_TOKEN_FILE };
