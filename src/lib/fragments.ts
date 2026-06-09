import { FRAGMENT_CLAIM_URI_MARKERS } from '../config/artist';

/** Returns fragment number if tokenURI is from a known claim mint, else null. */
export function pieceFromClaimTokenUri(tokenUri: string): number | null {
  for (const [piece, markers] of Object.entries(FRAGMENT_CLAIM_URI_MARKERS)) {
    if (markers.some((marker) => tokenUri.includes(marker))) {
      return Number(piece);
    }
  }
  return null;
}