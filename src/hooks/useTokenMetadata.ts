import { useEffect, useState } from 'react';
import { FRAGMENT_SITE_MEDIA, ON_CHAIN_MEDIA, PIECE_NAMES } from '../config/artist';
import { CONTRACT_ADDRESS, ERC721_ABI } from '../lib/contract';
import {
  inferMediaType,
  parseTokenMetadata,
  resolveTokenUri,
  TokenMetadata,
} from '../lib/metadata';
import { publicClient } from '../lib/publicClient';

function mediaFromUrl(url: string, name: string): TokenMetadata {
  return {
    name,
    image: url,
    mediaUrl: url,
    mediaType: inferMediaType(url),
  };
}

function metadataFromSiteMedia(id: number): TokenMetadata {
  const siteMedia = FRAGMENT_SITE_MEDIA[id]!;
  const title = PIECE_NAMES[id] ?? `Fragment ${id}`;
  return {
    name: title,
    image: siteMedia.posterUrl ?? siteMedia.displayUrl,
    mediaUrl: siteMedia.displayUrl,
    mediaType: inferMediaType(siteMedia.displayUrl),
    posterUrl: siteMedia.posterUrl,
    hasAudio: siteMedia.hasAudio,
  };
}

export function useTokenMetadata(tokenId: number | null) {
  const siteMedia = tokenId != null && tokenId > 0 ? FRAGMENT_SITE_MEDIA[tokenId] : undefined;
  const [metadata, setMetadata] = useState<TokenMetadata | null>(() =>
    siteMedia && tokenId ? metadataFromSiteMedia(tokenId) : null,
  );
  const [isLoading, setIsLoading] = useState(!siteMedia);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (tokenId == null || tokenId <= 0) {
      setMetadata(null);
      setIsLoading(false);
      return;
    }

    const id = tokenId;
    const title = PIECE_NAMES[id] ?? `Fragment ${id}`;
    const knownMedia = ON_CHAIN_MEDIA[id];
    const localSiteMedia = FRAGMENT_SITE_MEDIA[id];

    if (localSiteMedia) {
      setMetadata(metadataFromSiteMedia(id));
      setIsLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(false);

      try {
        const tokenUri = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'tokenURI',
          args: [BigInt(id)],
        });

        const response = await fetch(resolveTokenUri(tokenUri));
        if (!response.ok) throw new Error('metadata fetch failed');

        const json = await response.json();
        let parsed = parseTokenMetadata(json);

        if (knownMedia) {
          parsed = {
            ...parsed,
            mediaUrl: knownMedia,
            image: knownMedia,
            mediaType: inferMediaType(knownMedia, 'gif'),
          };
        }

        if (!cancelled) setMetadata(parsed);
      } catch {
        if (knownMedia && !cancelled) {
          setMetadata(mediaFromUrl(knownMedia, title));
        } else if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return { metadata, isLoading, error };
}