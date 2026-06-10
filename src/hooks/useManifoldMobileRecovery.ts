import { useEffect } from 'react';
import { refreshManifoldWidgets } from '../lib/manifoldConnect';

/** Resume Manifold / WalletConnect sessions when returning from a wallet app on mobile. */
export function useManifoldMobileRecovery() {
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return;
      refreshManifoldWidgets();
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