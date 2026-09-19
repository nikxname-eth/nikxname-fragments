/**
 * Explore catalogue previews live on R2 under:
 *   explore/previews/<seriesId>/<workId>.jpg
 * Public CDN: https://assets.nikxart.xyz/explore/previews/...
 *
 * Feature-frame HD cache (landing rotation):
 *   explore/feature/<seriesId>/<workId>.jpg  (long edge ≥ 1500)
 *   explore/data/feature-cache.json
 *
 * Full media stays at origin (Arweave / IPFS / fragment CDN) and is only
 * requested when Collection Theatre opens.
 */

import featureCacheJson from '../data/feature-cache.json';

export const PREVIEW_CDN = 'https://assets.nikxart.xyz';
export const PREVIEW_PREFIX = 'explore/previews';
export const FEATURE_PREFIX = 'explore/feature';

export function previewObjectKey(seriesId: string, workId: string): string {
  const safe = workId.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${PREVIEW_PREFIX}/${seriesId}/${safe}.jpg`;
}

export function previewPublicUrl(seriesId: string, workId: string): string {
  return `${PREVIEW_CDN}/${previewObjectKey(seriesId, workId)}`;
}

export function featureObjectKey(seriesId: string, workId: string): string {
  const safe = workId.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${FEATURE_PREFIX}/${seriesId}/${safe}.jpg`;
}

export function featurePublicUrl(seriesId: string, workId: string): string {
  return `${PREVIEW_CDN}/${featureObjectKey(seriesId, workId)}`;
}

export type FeatureCacheItem = {
  seriesId: string;
  workId: string;
  title?: string;
  featureUrl: string;
};

export type FeatureCacheManifest = {
  version: number;
  longEdge: number;
  items: FeatureCacheItem[];
  publicBase?: string;
};

const featureCache = featureCacheJson as FeatureCacheManifest;

/** Manifest entries with valid feature URLs (after sync). */
export function getFeatureCacheItems(): FeatureCacheItem[] {
  return (featureCache.items || []).filter((i) => i.featureUrl && i.workId);
}

export function getFeatureCacheUrl(seriesId: string, workId: string): string | null {
  const hit = getFeatureCacheItems().find(
    (i) => i.seriesId === seriesId && i.workId === workId,
  );
  if (hit?.featureUrl) return hit.featureUrl;
  // Stable URL even before manifest fill (after first sync)
  if (seriesId && workId) return featurePublicUrl(seriesId, workId);
  return null;
}

/**
 * Catalogue cover strategy:
 * 1) Prefer R2 explore/previews (fast, small)
 * 2) Nikxart CDN originals get width params when available
 * 3) WorkCard falls back to origin mediaUrl on 404
 */
export function resolveCatalogueCover(
  seriesId: string,
  workId: string,
  sourceUrl: string,
  preferPreview = true,
): string {
  if (preferPreview) {
    return previewPublicUrl(seriesId, workId);
  }
  if (sourceUrl.includes('assets.nikxart.xyz') && !sourceUrl.includes('?')) {
    return `${sourceUrl}?width=480&quality=72&format=auto`;
  }
  return sourceUrl;
}

/** Source used when generating R2 previews (never the preview URL itself). */
export function catalogueSourceImage(sourceUrl: string): string {
  if (sourceUrl.includes('assets.nikxart.xyz') && !sourceUrl.includes('?')) {
    return `${sourceUrl}?width=960&quality=80&format=auto`;
  }
  return sourceUrl;
}

/**
 * Cloudflare Image Resizing on assets.nikxart.xyz:
 *   /cdn-cgi/image/width=W,quality=Q,format=auto,fit=scale-down/<path>
 * Leaves Arweave / Manifold / other hosts unchanged.
 */
export function optimizeAssetUrl(
  url: string,
  opts: { width: number; quality?: number; format?: string } = { width: 1200 },
): string {
  if (!url) return url;
  const quality = opts.quality ?? 82;
  const format = opts.format ?? 'auto';
  if (!url.includes('assets.nikxart.xyz')) return url;

  try {
    const u = new URL(url);
    // Already transformed
    if (u.pathname.includes('/cdn-cgi/image/')) return url;
    const path = u.pathname.replace(/^\//, '');
    return `${u.origin}/cdn-cgi/image/width=${opts.width},quality=${quality},format=${format},fit=scale-down/${path}`;
  } catch {
    return url;
  }
}

export type FeatureMediaPair = {
  /** Fast first paint (preview / mid size) */
  lqip: string;
  /** Sharper frame display (retina-ish width) */
  hd: string;
  isGif: boolean;
};

/**
 * Soft-load pair for the landing frame.
 * Prefer R2 feature-cache HD (pre-synced ≥1500px) so rotation never waits on Arweave.
 */
export function resolveFeatureMedia(work: {
  id?: string;
  seriesId?: string;
  coverUrl?: string;
  originCoverUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
}): FeatureMediaPair {
  const cover = work.coverUrl || '';
  const origin = work.originCoverUrl || '';
  const mediaStill =
    work.mediaType === 'image' && work.mediaUrl ? work.mediaUrl : '';

  const cached =
    work.seriesId && work.id
      ? getFeatureCacheItems().find(
          (i) => i.seriesId === work.seriesId && i.workId === work.id,
        )?.featureUrl
      : null;

  // Feature cache wins for landing frame (already HD, same CDN, fast)
  if (cached) {
    const cachedGif = /\.gif(\?|$)/i.test(cached);
    if (cachedGif) {
      return { lqip: cached, hd: cached, isGif: true };
    }
    const lqip = optimizeAssetUrl(cached, { width: 1200, quality: 82 });
    return { lqip: lqip || cached, hd: cached, isGif: false };
  }

  const isGif = /\.gif(\?|$)/i.test(cover) || /\.gif(\?|$)/i.test(origin);
  if (isGif) {
    const gif = cover || origin;
    return { lqip: gif, hd: gif, isGif: true };
  }

  const hdBase = origin || mediaStill || cover;
  const lqipBase = cover || origin || mediaStill;
  const lqip = optimizeAssetUrl(lqipBase.includes('/explore/previews/') ? hdBase : lqipBase, {
    width: 1200,
    quality: 82,
  });
  const hd = optimizeAssetUrl(hdBase, { width: 1600, quality: 88 });

  return { lqip, hd, isGif: false };
}
