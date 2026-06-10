import { useCallback, useEffect, useRef, useState } from 'react';
import {
  openManifoldConnect,
  readManifoldSession,
  refreshManifoldWidgets,
  waitForManifoldAuthentication,
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
    const session = readManifoldSession();
    if (session.isAuthenticated && session.address) {
      setAddress(session.address);
      return;
    }

    const attempt = ++connectAttemptRef.current;
    setIsConnecting(true);

    try {
      refreshManifoldWidgets();
      await openManifoldConnect();

      const authenticated = await waitForManifoldAuthentication(90_000);
      if (attempt !== connectAttemptRef.current) return;

      if (authenticated) {
        sync();
        refreshManifoldWidgets();
      }
    } catch {
      if (attempt === connectAttemptRef.current) {
        setIsConnecting(false);
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

    const poll = window.setInterval(() => {
      sync();
    }, 2_000);

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