import { useEffect } from 'react';
import { getPieceNumberForInstanceId } from '../config/artist';
import { dispatchMintComplete } from '../lib/mintEvents';
import { readManifoldSession } from '../lib/manifoldConnect';

function checkoutSucceeded(): boolean {
  return Boolean(
    document.querySelector('.checkout-modal.success') ||
      document.querySelector('.checkout-success-actions') ||
      document.querySelector('.checkout-post-mint-message') ||
      document.querySelector('.checkout-post-mint-title'),
  );
}

function resolveMintedPiece(): number {
  const widgets = document.querySelectorAll('[data-widget="m-claim-buy-only"][data-id]');
  for (const widget of widgets) {
    const piece = getPieceNumberForInstanceId(widget.getAttribute('data-id'));
    if (piece > 0) return piece;
  }
  return 0;
}

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