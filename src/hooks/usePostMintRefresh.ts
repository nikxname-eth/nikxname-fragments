import { useEffect } from 'react';
import { checkoutSucceeded, resolveMintedPiece } from '../lib/manifoldCheckout';
import { dispatchMintComplete } from '../lib/mintEvents';
import { readManifoldSession } from '../lib/manifoldConnect';

/**
 * Watch Manifold checkout for success and notify the site to refresh
 * collection + evolved banner without a manual page reload.
 */
export function usePostMintRefresh() {
  useEffect(() => {
    let cooldown = false;

    const onSuccess = () => {
      if (cooldown || !checkoutSucceeded()) return;
      cooldown = true;

      const session = readManifoldSession();
      dispatchMintComplete({
        pieceNumber: resolveMintedPiece(),
        address: session.address,
      });

      window.setTimeout(() => {
        cooldown = false;
      }, 30_000);
    };

    const observer = new MutationObserver(() => {
      onSuccess();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    const poll = window.setInterval(onSuccess, 1_500);

    return () => {
      observer.disconnect();
      window.clearInterval(poll);
    };
  }, []);
}