import { useEffect } from 'react';
import { dispatchMintComplete } from '../lib/mintEvents';

/**
 * Watch Manifold checkout for success and notify the site to refresh
 * collection + evolved banner without a manual page reload.
 */
export function usePostMintRefresh() {
  useEffect(() => {
    let cooldown = false;

    const onSuccess = () => {
      if (cooldown) return;
      cooldown = true;
      dispatchMintComplete();
      window.setTimeout(() => {
        cooldown = false;
      }, 30_000);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target as Element;
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          target.classList?.contains('checkout-modal') &&
          target.classList.contains('success')
        ) {
          onSuccess();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);
}