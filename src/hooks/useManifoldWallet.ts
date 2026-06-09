import { useCallback, useEffect, useState } from 'react';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: () => void) => void;
  removeListener?: (event: string, handler: () => void) => void;
};

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function useManifoldWallet() {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);

  const sync = useCallback(async () => {
    const manifold = window.manifold;
    if (manifold?.isAuthenticated && manifold.address) {
      setAddress(manifold.address);
      setIsConnecting(false);
      return;
    }

    const eth = getEthereum();
    if (eth) {
      try {
        const accounts = (await eth.request({ method: 'eth_accounts' })) as string[];
        if (accounts[0]) {
          setAddress(accounts[0] as `0x${string}`);
          setIsConnecting(false);
          return;
        }
      } catch {
        /* wallet read is optional */
      }
    }

    setAddress(undefined);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      window.open('https://ethereum.org/en/wallets/', '_blank', 'noopener,noreferrer');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts[0]) {
        setAddress(accounts[0] as `0x${string}`);
      }
    } catch {
      setIsConnecting(false);
      return;
    }

    await sync();
    setIsConnecting(false);
    window.dispatchEvent(new Event('m-refresh-widgets'));
  }, [sync]);

  useEffect(() => {
    sync();

    const onWallet = () => {
      void sync();
    };

    window.addEventListener('m-authenticated', onWallet);
    window.addEventListener('m-unauthenticated', onWallet);
    window.addEventListener('m-refresh-widgets', onWallet);

    const eth = getEthereum();
    eth?.on?.('accountsChanged', onWallet);
    eth?.on?.('chainChanged', onWallet);

    const poll = window.setInterval(() => {
      void sync();
    }, 4_000);

    return () => {
      window.removeEventListener('m-authenticated', onWallet);
      window.removeEventListener('m-unauthenticated', onWallet);
      window.removeEventListener('m-refresh-widgets', onWallet);
      eth?.removeListener?.('accountsChanged', onWallet);
      eth?.removeListener?.('chainChanged', onWallet);
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