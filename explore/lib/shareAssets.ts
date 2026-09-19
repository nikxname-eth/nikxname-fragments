import type { ExploreWork, SeriesId } from '../config/catalog';
import { SERIES, getFragmentWorks, getWorksBySeries } from '../config/catalog';
import { getAfbSpecialEditions } from './chainWorks';
import { getEmbersWorks } from './embersWorks';
import { catalogueThumbUrl } from './mediaUrl';

export type ShareAsset = {
  id: string;
  seriesId: SeriesId;
  seriesLabel: string;
  label: string;
  thumbUrl: string;
  downloadUrl: string;
  downloadName: string;
  kind: 'video' | 'image';
};

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname.split('/').pop() || fallback;
    return path.replace(/[^\w.\-]+/g, '_') || fallback;
  } catch {
    return fallback;
  }
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function fhdScore(url: string): number {
  if (/1920|fhd/i.test(url)) return 3;
  if (/1080/i.test(url)) return 2;
  if (isVideoUrl(url)) return 1;
  return 0;
}

/** Prefer Full HD (1920 long edge) video, then any 1080p, then a CDN still. */
function pickShareFile(work: ExploreWork): { url: string; kind: 'video' | 'image' } | null {
  const videos = [work.mediaUrl, work.mediaUrlHi, work.mediaUrlMax].filter(
    (u): u is string => Boolean(u && isVideoUrl(u)),
  );
  videos.sort((a, b) => fhdScore(b) - fhdScore(a));
  if (videos[0]) return { url: videos[0], kind: 'video' };

  const stills = [work.originCoverUrl, work.coverUrl, work.mediaUrl].filter(
    (u): u is string => Boolean(u && !isVideoUrl(u)),
  );
  const cdn = stills.find((u) => u.includes('assets.nikxart.xyz'));
  const url = cdn || stills[0];
  if (!url) return null;
  return { url, kind: 'image' };
}

function seriesLabel(id: SeriesId): string {
  if (id === 'one-of-ones') return '1 of 1';
  return SERIES.find((s) => s.id === id)?.label || id;
}

function worksForShare(seriesId: SeriesId): ExploreWork[] {
  if (seriesId === 'a-familiar-burn') {
    return [...getFragmentWorks(), ...getEmbersWorks(), ...getAfbSpecialEditions()];
  }
  if (seriesId === 'market') return [];
  return getWorksBySeries(seriesId);
}

function toAsset(work: ExploreWork): ShareAsset | null {
  const picked = pickShareFile(work);
  if (!picked) return null;
  const pad = work.pieceNumber != null ? String(work.pieceNumber).padStart(2, '0') : undefined;
  const slug = work.title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  const fallback =
    picked.kind === 'video'
      ? pad
        ? `Fragment-${pad}_FHD.mp4`
        : `${slug || work.id}-FHD.mp4`
      : `${slug || work.id}.jpg`;
  const thumb = work.coverUrl || work.originCoverUrl || '';
  return {
    id: work.id,
    seriesId: work.seriesId,
    seriesLabel: seriesLabel(work.seriesId),
    label: work.title,
    thumbUrl: catalogueThumbUrl(thumb, 420) || thumb,
    downloadUrl: picked.url,
    downloadName: filenameFromUrl(picked.url, fallback),
    kind: picked.kind,
  };
}

export function shareAssetsForSeries(seriesId: SeriesId): ShareAsset[] {
  return worksForShare(seriesId)
    .map(toAsset)
    .filter((x): x is ShareAsset => Boolean(x));
}

export function allShareAssets(): ShareAsset[] {
  return SERIES.filter((s) => s.id !== 'market').flatMap((s) => shareAssetsForSeries(s.id));
}

export const SHARE_COLLECTIONS = SERIES.filter((s) => s.id !== 'market').map((s) => ({
  id: s.id,
  label: s.id === 'one-of-ones' ? '1 of 1' : s.label,
}));
