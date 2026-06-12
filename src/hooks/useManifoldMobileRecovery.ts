import { useEffect } from 'react';
import { recoverManifoldMobileSession } from '../lib/manifoldConnect';

/** Resume Manifold / WalletConnect sessions when returning from a wallet app on mobile. */
export function useManifoldMobileRecovery() {
  useEffect(() => {
    const onReturn = (event: PageTransitionEvent | Event) => {
      if (document.visibilityState !== 'visible') return;
      recoverManifoldMobileSession();

      if (event.type === 'pageshow' && (event as PageTransitionEvent).persisted) {
        recoverManifoldMobileSession();
      }
    };

    window.addEventListener('pageshow', onReturn);
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);

    return () => {
      window.removeEventListener('pageshow', onReturn);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, []);
}