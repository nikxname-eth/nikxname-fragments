export type TokenMetadata = {
  name: string;
  image: string;
  animationUrl?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  posterUrl?: string;
  hasAudio?: boolean;
};

export function resolveTokenUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  if (uri.startsWith('ar://')) {
    return `https://arweave.net/${uri.slice(5)}`;
  }
  return uri;
}

export function inferMediaType(url: string, format?: string): 'image' | 'video' {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (format?.toLowerCase() === 'gif') return 'image';
  if (['gif', 'png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return 'image';
  return 'image';
}

export function parseTokenMetadata(json: Record<string, unknown>): TokenMetadata {
  const animationRaw = (json.animation_url ?? json.animationUrl) as string | undefined;
  const imageRaw = (json.image ?? json.image_url) as string;
  const animationUrl = animationRaw ? resolveTokenUri(animationRaw) : undefined;
  const image = resolveTokenUri(imageRaw);
  const format = (json.image_details as { format?: string } | undefined)?.format;
  const mediaUrl = animationUrl ?? image;
  const mediaType = animationUrl ? 'video' : inferMediaType(image, format);

  return {
    name: (json.name as string) ?? 'Fragment',
    image,
    animationUrl,
    mediaUrl,
    mediaType,
  };
}