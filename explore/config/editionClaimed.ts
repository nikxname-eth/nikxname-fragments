/**
 * Claimed / minted live counts (not max supply).
 * Overrides catalog dump + ERC-1155 totalSupply when those over-count.
 */
const CLAIMED: Record<string, number> = {
  'the-void::flutter into the void': 17,
  'for-you::echo from within': 7,
  'a-familiar-burn::puzzling eye': 9,
};

export function claimedEditionCount(
  seriesId: string,
  title: string,
  fallback: number,
): number {
  const key = `${seriesId}::${title.trim().toLowerCase()}`;
  return CLAIMED[key] ?? fallback;
}
