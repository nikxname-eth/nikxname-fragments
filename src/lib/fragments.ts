import { FINAL_FRAGMENT_PIECE, FRAGMENT_CLAIM_URI_MARKERS } from '../config/artist';

/** Returns fragment number if tokenURI is from a known claim mint, else null. */
export function pieceFromClaimTokenUri(tokenUri: string): number | null {
  for (const [piece, markers] of Object.entries(FRAGMENT_CLAIM_URI_MARKERS)) {
    if (markers.some((marker) => tokenUri.includes(marker))) {
      return Number(piece);
    }
  }
  // Path / name patterns used across Arweave + CDN uploads
  const patterns = [
    /fragment[-_\s]?0*(\d{1,2})/i,
    /frag[-_\s]?0*(\d{1,2})/i,
    /releasedfragment0*(\d{1,2})/i,
  ];
  for (const re of patterns) {
    const m = tokenUri.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= FINAL_FRAGMENT_PIECE) return n;
    }
  }
  return null;
}