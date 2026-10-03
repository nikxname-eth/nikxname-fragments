import type { ExploreWork } from '../config/catalog';
import { defaultTierId, isVideoWork, mediaTiersFor, preferStill } from './mediaUrl';

function isGif(url?: string | null): boolean {
  return Boolean(url && /\.gif(\?|$)/i.test(url));
}

function isMotionBlob(url?: string | null): boolean {
  return Boolean(url && (url.startsWith('blob:') || url.startsWith('data:')));
}

/** TV grid default — never a GIF or video master. */
export function lookingStillUrl(work: ExploreWork): string {
  const list = [work.coverUrl, work.originCoverUrl, preferStill(work), work.mediaUrl];
  for (const u of list) {
    if (!u) continue;
    if (isGif(u)) continue;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) continue;
    if (isMotionBlob(u) && (isVideoWork(work) || work.motionUrl === u)) continue;
    return u;
  }
  return work.coverUrl || work.originCoverUrl || '';
}

export function lookingMotionKind(work: ExploreWork): 'video' | 'gif' | null {
  if (isVideoWork(work)) return 'video';
  if (isGif(work.motionUrl) || isGif(work.mediaUrl) || isGif(work.coverUrl)) return 'gif';
  if (work.motionUrl && isMotionBlob(work.motionUrl)) return 'gif';
  return null;
}

export function lookingGifUrl(work: ExploreWork): string | null {
  if (lookingMotionKind(work) !== 'gif') return null;
  const hit = [work.motionUrl, work.mediaUrl, work.coverUrl, work.originCoverUrl].find((u) => isGif(u));
  return hit || work.motionUrl || null;
}

/** 1080p first, then 2K — never the 4K/11K master on a television. */
export function lookingVideoUrl(work: ExploreWork): string | null {
  if (lookingMotionKind(work) !== 'video') return null;
  const tiers = mediaTiersFor(work).filter((t) => t.kind === 'video');
  const preferred =
    tiers.find((t) => t.id === '1080') ||
    tiers.find((t) => t.id === defaultTierId(tiers)) ||
    tiers[0];
  return preferred?.url || work.mediaUrl || null;
}
