import { useCallback, useEffect, useState } from 'react';
import { readManifoldSession, refreshManifoldWidgets } from '../lib/manifoldConnect';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Read-only sync with Manifold session — connect/collect UI lives in claim widgets. */
export function useManifoldWallet() {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const sync = useCallback(() => {
    const session = readManifoldSession();
    setIsAuthenticated(session.isAuthenticated);
    setAddress(session.isConnected && session.address ? session.address : undefined);
  }, []);

  useEffect(() => {
    sync();
    refreshManifoldWidgets();

    const onWallet = () => {
      sync();
      refreshManifoldWidgets();
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      sync();
      refreshManifoldWidgets();
    };

    window.addEventListener('m-authenticated', onWallet);
    window.addEventListener('m-unauthenticated', onWallet);
    window.addEventListener('m-refresh-widgets', onWallet);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('focus', onVisible);

    const poll = window.setInterval(sync, 2_000);

    return () => {
      window.removeEventListener('m-authenticated', onWallet);
      window.removeEventListener('m-unauthenticated', onWallet);
      window.removeEventListener('m-refresh-widgets', onWallet);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(poll);
    };
  }, [sync]);

  return {
    address,
    isAuthenticated,
    isConnected: !!address,
    shortAddress: address ? shortenAddress(address) : undefined,
    sync,
  };
}