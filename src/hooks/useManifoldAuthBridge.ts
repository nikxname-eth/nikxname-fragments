import { useEffect } from 'react';
import {
  ensureManifoldAuthenticated,
  readManifoldSession,
  refreshManifoldWidgets,
} from '../lib/manifoldConnect';

/** Keep claim widgets in sync and finish OAuth when a wallet is connected but unsigned. */
export function useManifoldAuthBridge() {
  useEffect(() => {
    const sync = () => {
      refreshManifoldWidgets();
      const session = readManifoldSession();
      if (session.isConnected && !session.isAuthenticated) {
        void ensureManifoldAuthenticated();
      }
    };

    window.addEventListener('m-authenticated', sync);
    window.addEventListener('m-unauthenticated', sync);
    window.addEventListener('m-refresh-widgets', sync);

    const poll = window.setInterval(() => {
      const session = readManifoldSession();
      if (session.isConnected && !session.isAuthenticated) {
        void ensureManifoldAuthenticated();
      }
    }, 4_000);

    return () => {
      window.removeEventListener('m-authenticated', sync);
      window.removeEventListener('m-unauthenticated', sync);
      window.removeEventListener('m-refresh-widgets', sync);
      window.clearInterval(poll);
    };
  }, []);
}