import { useCallback, useEffect, useState } from 'react';
import { readManifoldSession, refreshManifoldWidgets } from '../lib/manifoldConnect';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Read-only sync with Manifold session — connect/collect UI lives in claim widgets. */
export function useManifoldWallet() {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const sync = useCallback(async () => {
    const session = readManifoldSession();
    if (session.address) {
      setIsAuthenticated(session.isAuthenticated);
      setAddress(session.address);
      return;
    }

    try {
      const accounts = (await window.ManifoldEthereumProvider?.request?.({
        method: 'eth_accounts',
      })) as string[] | undefined;
      if (accounts?.[0]?.startsWith('0x')) {
        setAddress(accounts[0] as `0x${string}`);
        setIsAuthenticated(false);
        return;
      }
    } catch {
      /* provider not ready */
    }

    setIsAuthenticated(false);
    setAddress(undefined);
  }, []);

  useEffect(() => {
    void sync();
    refreshManifoldWidgets();

    const onWallet = () => {
      void sync();
      refreshManifoldWidgets();
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void sync();
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