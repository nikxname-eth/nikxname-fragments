import { useEffect } from 'react';
import {
  checkoutHasError,
  checkoutSucceeded,
  resolveMintedPiece,
} from '../lib/manifoldCheckout';
import { dispatchMintComplete } from '../lib/mintEvents';
import { readManifoldSession } from '../lib/manifoldConnect';

/**
 * Watch Manifold checkout for success and notify the site to refresh
 * collection + evolved banner without a manual page reload.
 * Strict: never fire on error UI or stale success leftovers without cooldown.
 */
export function usePostMintRefresh() {
  useEffect(() => {
    let cooldown = false;
    let lastSuccessSignature = '';

    const signature = () => {
      const el =
        document.querySelector('.checkout-modal.success') ||
        document.querySelector('.checkout-success-actions') ||
        document.querySelector('.checkout-post-mint-message');
      return el ? `${el.className}:${(el.textContent || '').slice(0, 80)}` : '';
    };

    const onSuccess = () => {
      if (cooldown) return;
      if (checkoutHasError()) return;
      if (!checkoutSucceeded()) return;

      const sig = signature();
      // Same success DOM as last time — do not re-dispatch (prevents false 2nd consume)
      if (sig && sig === lastSuccessSignature) return;
      lastSuccessSignature = sig || lastSuccessSignature;

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