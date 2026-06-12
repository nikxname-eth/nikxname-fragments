import { useEffect, useRef } from 'react';
import { zeroAddress } from 'viem';
import { CONTRACT_ADDRESS, ERC721_ABI } from '../lib/contract';
import { pieceFromClaimTokenUri } from '../lib/fragments';
import { writeHolderPeak } from '../lib/holderState';
import { dispatchMintComplete } from '../lib/mintEvents';
import { publicClient } from '../lib/publicClient';

/**
 * Watch ERC-721 mints (Transfer from 0x0) to the connected wallet.
 * Fires as soon as the tx is on-chain — no Manifold checkout DOM required.
 */
export function useContractMintWatcher(address: `0x${string}` | undefined) {
  const seenMints = useRef(new Set<string>());

  useEffect(() => {
    if (!address) return;

    const wallet = address.toLowerCase() as `0x${string}`;

    const onMint = async (tokenId: bigint) => {
      const dedupeKey = `${wallet}-${tokenId.toString()}`;
      if (seenMints.current.has(dedupeKey)) return;
      seenMints.current.add(dedupeKey);

      let pieceNumber = 0;
      try {
        const tokenUri = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'tokenURI',
          args: [tokenId],
        });
        pieceNumber = pieceFromClaimTokenUri(tokenUri) ?? 0;
      } catch {
        /* RPC lag — refresh will still pick up balance */
      }

      if (pieceNumber > 0) {
        writeHolderPeak(wallet, pieceNumber);
      }

      dispatchMintComplete({
        pieceNumber: pieceNumber || undefined,
        address: wallet,
      });
    };

    const unwatch = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: ERC721_ABI,
      eventName: 'Transfer',
      args: {
        from: zeroAddress,
        to: wallet,
      },
      onLogs: (logs) => {
        for (const log of logs) {
          const tokenId = log.args.tokenId;
          if (tokenId != null) void onMint(tokenId);
        }
      },
      pollingInterval: 3_000,
    });

    return () => {
      unwatch();
    };
  }, [address]);
}