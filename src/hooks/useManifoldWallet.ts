import { useCallback, useEffect, useRef, useState } from 'react';
import {
  authenticateWithManifold,
  readManifoldSession,
  refreshManifoldWidgets,
} from '../lib/manifoldConnect';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function useManifoldWallet() {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);
  const connectAttemptRef = useRef(0);

  const sync = useCallback(() => {
    const session = readManifoldSession();
    if (session.isAuthenticated && session.address) {
      setAddress(session.address);
      setIsConnecting(false);
      return;
    }

    setAddress(undefined);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(async () => {
    if (readManifoldSession().isAuthenticated) {
      sync();
      return;
    }

    const attempt = ++connectAttemptRef.current;
    setIsConnecting(true);

    try {
      const authed = await authenticateWithManifold();
      if (attempt !== connectAttemptRef.current) return;

      if (authed) {
        sync();
        refreshManifoldWidgets();
      }
    } finally {
      if (attempt === connectAttemptRef.current) {
        setIsConnecting(false);
      }
    }
  }, [sync]);

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

    const poll = window.setInterval(sync, 1_500);

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
    isConnecting,
    isConnected: !!address,
    shortAddress: address ? shortenAddress(address) : undefined,
    connect,
    sync,
  };
}