/**
 * Performance-minded media URL helpers for Explore.
 * Prefer R2 CDN assets + Cloudflare Image Resizing; never load full Arweave masters in grids.
 */

import type { ExploreWork } from '../config/catalog';
import { optimizeAssetUrl } from './previews';

export type MediaTierId = 'fit' | '720' | '1080' | '2k' | '4k' | '8k' | '11k' | 'original';

export type MediaTier = {
  id: MediaTierId;
  label: string;
  url: string;
  kind: 'image' | 'video';
};

const TIER_RANK: Record<MediaTierId, number> = {
  '720': 0,
  fit: 1,
  '1080': 2,
  '2k': 3,
  '4k': 4,
  '8k': 5,
  '11k': 6,
  original: 7,
};

/** Lazy / Fit stills — long edge at least 1200px. */
export const FIT_LONG_EDGE = 1600;
/** Theatre / Arrange 4K stills. */
export const HI_LONG_EDGE = 3840;

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function isPreviewUrl(url: string): boolean {
  return url.includes('/explore/previews/');
}

function asStillUrl(url: string | undefined): string | null {
  if (!url || isVideoUrl(url)) return null;
  return url;
}

/** Highest-quality still URL, skipping tiny catalogue previews when a master exists. */
/** Hi-res still for the Observation / CanvasLook viewer. */
export function observeStillUrl(
  work: Pick<ExploreWork, 'mediaType' | 'mediaUrl' | 'mediaUrlHi' | 'originCoverUrl' | 'coverUrl'>,
): string {
  if (work.mediaUrlHi && !isVideoUrl(work.mediaUrlHi)) return work.mediaUrlHi;
  return stillMasterUrl(work);
}

export function stillMasterUrl(
  work: Pick<ExploreWork, 'mediaType' | 'mediaUrl' | 'originCoverUrl' | 'coverUrl'>,
): string {
  const list = [
    work.mediaType !== 'video' ? asStillUrl(work.mediaUrl) : null,
    asStillUrl(work.originCoverUrl),
    asStillUrl(work.coverUrl),
  ].filter((u): u is string => Boolean(u));
  return list.find((u) => !isPreviewUrl(u)) || list[0] || '';
}

export function isVideoWork(work: Pick<ExploreWork, 'mediaType' | 'mediaUrl'>): boolean {
  return work.mediaType === 'video' || isVideoUrl(work.mediaUrl || '');
}

function classifyVideo(url: string): { id: MediaTierId; label: string } {
  if (/11k/i.test(url)) return { id: '11k', label: '11K' };
  if (/8k/i.test(url)) return { id: '8k', label: '8K' };
  if (/4k/i.test(url)) return { id: '4k', label: '4K' };
  if (/(2k|1440|2048)/i.test(url)) return { id: '2k', label: '2K' };
  if (/1920|fhd|1080/i.test(url)) return { id: '1080', label: 'Full HD' };
  if (/720/i.test(url)) return { id: '720', label: '720p' };
  if (url.includes('/explore/media/') && /\.mp4(\?|$)/i.test(url)) {
    return { id: '2k', label: '2K' };
  }
  return { id: '1080', label: '1080p' };
}

/** Viewing default: 1080p or 2K when present, else the gentlest available encode. */
export function defaultTierId(tiers: MediaTier[]): MediaTierId {
  if (tiers.some((t) => t.kind === 'video')) {
    for (const id of ['1080', '2k', 'fit', '720'] as MediaTierId[]) {
      if (tiers.some((t) => t.id === id && t.kind === 'video')) return id;
    }
  }
  if (tiers.some((t) => t.id === 'fit')) return 'fit';
  return tiers[0]?.id ?? 'fit';
}

export function lowerTierId(tiers: MediaTier[], current: MediaTierId): MediaTierId | null {
  const order: MediaTierId[] = ['11k', '8k', '4k', '2k', '1080', 'fit', '720', 'original'];
  const idx = order.indexOf(current);
  const next = order.slice(Math.max(idx, 0) + 1).find((id) => tiers.some((t) => t.id === id));
  return next ?? null;
}

/** Quality rungs. Stills default to Fit. Video defaults to 1080p/2K; 4K–11K load on demand. */
export function mediaTiersFor(work: ExploreWork): MediaTier[] {
  const tiers: MediaTier[] = [];
  const push = (tier: MediaTier) => {
    if (!tier.url) return;
    if (tiers.some((t) => t.url === tier.url || t.id === tier.id)) return;
    tiers.push(tier);
  };

  if (isVideoWork(work) && work.mediaUrl) {
    for (const url of [work.mediaUrl, work.mediaUrlHi, work.mediaUrlMax]) {
      if (!url || !isVideoUrl(url)) continue;
      const { id, label } = classifyVideo(url);
      push({ id, label, url, kind: 'video' });
    }
    tiers.sort((a, b) => TIER_RANK[a.id] - TIER_RANK[b.id]);
    return tiers;
  }

  const master = stillMasterUrl(work);
  const cdnMaster = [master, work.originCoverUrl, work.coverUrl]
    .map(asStillUrl)
    .find((u) => u && !isPreviewUrl(u) && u.includes('assets.nikxart.xyz'));
  const fitSource = cdnMaster || master;
  const fitUrl = fitSource ? theatreStillUrl(fitSource, FIT_LONG_EDGE) : '';
  if (fitUrl) push({ id: 'fit', label: 'Fit', url: fitUrl, kind: 'image' });

  if (cdnMaster) {
    const fourk = theatreStillUrl(cdnMaster, HI_LONG_EDGE);
    if (fourk && fourk !== fitUrl) {
      push({ id: '4k', label: '4K', url: fourk, kind: 'image' });
    }
  }
  if (master && master !== fitUrl && !master.includes('/cdn-cgi/image/')) {
    push({ id: 'original', label: 'Original', url: master, kind: 'image' });
  }
  return tiers;
}

/** Catalogue / strip thumb — small, fast, lazy-friendly */
export function catalogueThumbUrl(url: string | undefined, width = 420): string {
  if (!url) return '';
  // Keep GIF motion intact (Cloudflare resize would flatten them)
  if (/\.gif(\?|$)/i.test(url)) return url;
  return optimizeAssetUrl(url, { width, quality: 72, format: 'auto' });
}

/** Theatre still — `width` is the long-edge target (Cloudflare `width=`). */
export function theatreStillUrl(url: string | undefined, width = FIT_LONG_EDGE): string {
  if (!url) return '';
  if (/\.gif(\?|$)/i.test(url)) return url;
  const quality = width >= 2400 ? 92 : 88;
  if (url.includes('assets.nikxart.xyz')) {
    return optimizeAssetUrl(url, { width, quality, format: 'auto' });
  }
  return url;
}

/** Prefer preview / poster stills over origin masters for UI chrome */
export function preferStill(work: {
  coverUrl?: string;
  originCoverUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
}): string {
  if (work.coverUrl && work.coverUrl.includes('/explore/previews/')) return work.coverUrl;
  if (work.originCoverUrl && !/\.(mp4|webm|mov)(\?|$)/i.test(work.originCoverUrl)) {
    return work.originCoverUrl;
  }
  if (work.mediaType === 'image' && work.mediaUrl) return work.mediaUrl;
  return work.coverUrl || work.originCoverUrl || '';
}

export function preloadMedia(url: string, kind: 'image' | 'video' = 'image'): void {
  if (!url || typeof document === 'undefined') return;
  if (kind === 'video') {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    v.muted = true;
    // Hint only — browser decides
    return;
  }
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}
