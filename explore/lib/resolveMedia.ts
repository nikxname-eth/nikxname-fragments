export function resolveTokenUri(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  if (uri.startsWith('ar://')) {
    return `https://arweave.net/${uri.slice(5)}`;
  }
  return uri;
}

export function inferMediaType(url: string): 'image' | 'video' {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'image';
}

export type ChainTokenMeta = {
  tokenId: number;
  name: string;
  description?: string;
  image: string;
  animationUrl?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  tokenUri: string;
};

export function parseMetadata(
  tokenId: number,
  tokenUri: string,
  json: Record<string, unknown>,
): ChainTokenMeta {
  const animationRaw = (json.animation_url ?? json.animationUrl) as string | undefined;
  const imageRaw = (json.image ?? json.image_url ?? '') as string;
  const animationUrl = animationRaw ? resolveTokenUri(animationRaw) : undefined;
  const image = imageRaw ? resolveTokenUri(imageRaw) : '';
  const mediaUrl = animationUrl ?? image;
  const mediaType = animationUrl ? 'video' : inferMediaType(image);

  return {
    tokenId,
    name: (json.name as string) || `Token #${tokenId}`,
    description: typeof json.description === 'string' ? json.description : undefined,
    image,
    animationUrl,
    mediaUrl,
    mediaType,
    tokenUri,
  };
}
