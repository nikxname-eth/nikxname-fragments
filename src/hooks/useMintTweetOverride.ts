import { useEffect } from 'react';
import { checkoutSucceeded, resolveMintedPiece } from '../lib/manifoldCheckout';
import { applyMintTweetOverride } from '../lib/mintTweet';

/**
 * Rewrite Manifold's post-mint Tweet button to Nikxart copy:
 * "I just collected {piece} from @Nikxname on nikxart.xyz via @manifoldxyz"
 */
export function useMintTweetOverride() {
  useEffect(() => {
    const rewriteTweetButtons = () => {
      if (!checkoutSucceeded()) return;

      const pieceNumber = resolveMintedPiece();
      const buttons = document.querySelectorAll<HTMLAnchorElement>('a.checkout-tweet-button');
      buttons.forEach((button) => applyMintTweetOverride(button, pieceNumber));
    };

    const observer = new MutationObserver(rewriteTweetButtons);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'href'],
    });

    const poll = window.setInterval(rewriteTweetButtons, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(poll);
    };
  }, []);
}