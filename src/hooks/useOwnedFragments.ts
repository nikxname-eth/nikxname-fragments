import { useCallback, useEffect, useRef, useState } from 'react';
import { MINT_COMPLETE_EVENT } from '../lib/mintEvents';
import { readOwnedCache, writeOwnedCache } from '../lib/ownedCache';
import { fetchOwnedClaimFragments, type OwnedFragment } from '../lib/ownedScan';

export type { OwnedFragment };

const MINT_BURST_DELAYS_MS = [0, 800, 2_000, 4_000, 8_000, 15_000, 30_000, 60_000];

export function useOwnedFragments(address: `0x${string}` | undefined) {
  const [owned, setOwned] = useState<OwnedFragment[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const burstTimers = useRef<number[]>([]);
  const addressRef = useRef(address);

  useEffect(() => {
    addressRef.current = address;
    if (!address) {
      setOwned([]);
      setBalance(0);
      return;
    }

    const cached = readOwnedCache(address);
    if (cached) {
      setOwned(cached.owned);
      setBalance(cached.balance);
    }
  }, [address]);

  const applyOwned = useCallback(
    (nextOwned: OwnedFragment[], nextBalance: number) => {
      setOwned(nextOwned);
      setBalance(nextBalance);
      if (addressRef.current) {
        writeOwnedCache(addressRef.current, nextOwned, nextBalance);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    const wallet = addressRef.current;
    if (!wallet) {
      setOwned([]);
      setBalance(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchOwnedClaimFragments(wallet);
      if (addressRef.current?.toLowerCase() !== wallet.toLowerCase()) return;
      applyOwned(result.owned, result.balance);
    } catch {
      /* keep last known owned/balance so banner does not flash back to guest */
    } finally {
      if (addressRef.current?.toLowerCase() === wallet.toLowerCase()) {
        setIsLoading(false);
      }
    }
  }, [applyOwned]);

  const burstRefresh = useCallback(() => {
    for (const timer of burstTimers.current) window.clearTimeout(timer);
    burstTimers.current = MINT_BURST_DELAYS_MS.map((delay) =>
      window.setTimeout(() => {
        void refresh();
      }, delay),
    );
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 8_000);
    const onWallet = () => void refresh();
    const onMint = () => burstRefresh();
    const onMintComplete = () => burstRefresh();

    window.addEventListener('m-authenticated', onWallet);
    window.addEventListener('m-unauthenticated', onWallet);
    window.addEventListener('m-refresh-widgets', onMint);
    window.addEventListener(MINT_COMPLETE_EVENT, onMintComplete);

    return () => {
      window.clearInterval(interval);
      for (const timer of burstTimers.current) window.clearTimeout(timer);
      window.removeEventListener('m-authenticated', onWallet);
      window.removeEventListener('m-unauthenticated', onWallet);
      window.removeEventListener('m-refresh-widgets', onMint);
      window.removeEventListener(MINT_COMPLETE_EVENT, onMintComplete);
    };
  }, [refresh, burstRefresh]);

  return { owned, balance, isLoading, refresh };
}