import { useCallback, useEffect, useState } from 'react';

export function useManifoldWallet() {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isConnected, setIsConnected] = useState(false);

  const sync = useCallback(() => {
    const manifold = window.manifold;
    if (manifold?.isAuthenticated && manifold.address) {
      setAddress(manifold.address);
      setIsConnected(true);
      return;
    }
    setAddress(undefined);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('m-authenticated', sync);
    window.addEventListener('m-unauthenticated', sync);
    window.addEventListener('m-refresh-widgets', sync);

    const eth = (window as Window & { ethereum?: { on?: (e: string, fn: () => void) => void; removeListener?: (e: string, fn: () => void) => void } }).ethereum;
    const onAccountsChanged = () => sync();
    eth?.on?.('accountsChanged', onAccountsChanged);

    const poll = window.setInterval(sync, 3_000);

    return () => {
      window.removeEventListener('m-authenticated', sync);
      window.removeEventListener('m-unauthenticated', sync);
      window.removeEventListener('m-refresh-widgets', sync);
      eth?.removeListener?.('accountsChanged', onAccountsChanged);
      window.clearInterval(poll);
    };
  }, [sync]);

  return { address, isConnected };
}