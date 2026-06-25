import { resolveCheckoutPieceName } from './manifoldCheckout';

export const MINT_TWEET_CREATOR_HANDLE = '@Nikxname';

/** Post-mint share copy — Option A with "collected" instead of Manifold's "purchased". */
export function buildMintTweetText(pieceName: string): string {
  return `I just collected ${pieceName} from ${MINT_TWEET_CREATOR_HANDLE} on nikxart.xyz via @manifoldxyz`;
}

export function buildMintTweetIntentUrl(pieceName: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildMintTweetText(pieceName))}`;
}

export function applyMintTweetOverride(button: HTMLAnchorElement, pieceNumber: number): void {
  if (button.dataset.nikxartTweet === '1') return;

  const pieceName = resolveCheckoutPieceName(pieceNumber);
  button.href = buildMintTweetIntentUrl(pieceName);
  button.dataset.nikxartTweet = '1';
}