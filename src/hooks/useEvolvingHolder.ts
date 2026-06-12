import { useCallback, useEffect, useState } from 'react';
import { readHolderPeak, writeHolderPeak } from '../lib/holderState';
import { MINT_COMPLETE_EVENT, type MintCompleteDetail } from '../lib/mintEvents';
import { useOwnedFragments } from './useOwnedFragments';

/**
 * Holder evolution for banner + collection — merges on-chain scan with
 * optimistic peak from a just-finished mint (instant banner swap).
 */
export function useEvolvingHolder(address: `0x${string}` | undefined) {
  const { owned, balance, isLoading, refresh } = useOwnedFragments(address);
  const [optimisticPeak, setOptimisticPeak] = useState(0);

  useEffect(() => {
    if (!address) {
      setOptimisticPeak(0);
      return;
    }
    setOptimisticPeak(readHolderPeak(address));
  }, [address]);

  const scannedPeak = owned.reduce((max, fragment) => Math.max(max, fragment.pieceNumber), 0);

  useEffect(() => {
    if (!address || scannedPeak <= 0) return;
    writeHolderPeak(address, scannedPeak);
    setOptimisticPeak((prev) => Math.max(prev, scannedPeak));
  }, [address, scannedPeak]);

  const onMintComplete = useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent<MintCompleteDetail>).detail ?? {};
      const pieceNumber = detail.pieceNumber ?? 0;
      const wallet = (detail.address ?? address)?.toLowerCase();

      if (wallet && pieceNumber > 0) {
        writeHolderPeak(wallet, pieceNumber);
        if (address && wallet === address.toLowerCase()) {
          setOptimisticPeak((prev) => Math.max(prev, pieceNumber));
        }
      }

      void refresh();
    },
    [address, refresh],
  );

  useEffect(() => {
    window.addEventListener(MINT_COMPLETE_EVENT, onMintComplete);
    return () => window.removeEventListener(MINT_COMPLETE_EVENT, onMintComplete);
  }, [onMintComplete]);

  const highestOwnedPiece = Math.max(scannedPeak, optimisticPeak);
  const walletOwnsAny =
    !!address && (highestOwnedPiece > 0 || balance > 0 || owned.length > 0);

  return {
    owned,
    balance,
    isLoading,
    highestOwnedPiece,
    walletOwnsAny,
    refresh,
  };
}