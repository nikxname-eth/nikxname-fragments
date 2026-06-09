import { useTokenMetadata } from '../hooks/useTokenMetadata';

type Props = {
  tokenId: number;
  fallbackTitle: string;
};

export function FragmentMedia({ tokenId, fallbackTitle }: Props) {
  const { metadata, isLoading, error } = useTokenMetadata(tokenId);

  if (isLoading) {
    return <div className="piece-media-loading" aria-label="Loading artwork from chain" />;
  }

  if (error || !metadata) {
    return (
      <div className="piece-media-error" role="status">
        Unable to load on-chain artwork
      </div>
    );
  }

  const alt = metadata.name || fallbackTitle;

  if (metadata.mediaType === 'video') {
    return (
      <video
        src={metadata.mediaUrl}
        autoPlay
        loop
        muted
        playsInline
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={metadata.mediaUrl}
      alt={alt}
      loading="eager"
      decoding="async"
    />
  );
}