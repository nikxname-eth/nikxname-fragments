import { useCallback, useEffect, useState } from 'react';
import { PIECE_NAMES } from '../config/artist';
import { CONTRACT_ADDRESS, ERC721_ABI } from '../lib/contract';
import { publicClient } from '../lib/publicClient';

export type OwnedFragment = {
  pieceNumber: number;
  title: string;
  quantity: number;
};

const SCAN_MISS_LIMIT = 24;
const SCAN_MAX_ID = 500;

async function scanOwnedTokenIds(wallet: `0x${string}`): Promise<number[]> {
  const owned: number[] = [];
  let misses = 0;
  let id = 1;

  while (misses < SCAN_MISS_LIMIT && id <= SCAN_MAX_ID) {
    try {
      const owner = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ERC721_ABI,
        functionName: 'ownerOf',
        args: [BigInt(id)],
      });

      misses = 0;
      if (owner.toLowerCase() === wallet.toLowerCase()) {
        owned.push(id);
      }
    } catch {
      misses += 1;
    }
    id += 1;
  }

  return owned;
}

/** Map minted token IDs to fragment numbers for the current drop schedule. */
function pieceNumberForToken(_tokenId: number, livePieceNumber: number): number {
  // Open-edition ERC-721: each mint gets a new token ID, but all current mints are Fragment 01.
  // Extend mapping when additional claim instances go live.
  return livePieceNumber > 0 ? 1 : 1;
}

function groupOwnedTokens(tokenIds: number[], livePieceNumber: number): OwnedFragment[] {
  const counts = new Map<number, number>();

  for (const tokenId of tokenIds) {
    const piece = pieceNumberForToken(tokenId, livePieceNumber);
    counts.set(piece, (counts.get(piece) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pieceNumber, quantity]) => ({
      pieceNumber,
      title: PIECE_NAMES[pieceNumber] ?? `Fragment ${pieceNumber}`,
      quantity,
    }));
}

export function useOwnedFragments(
  address: `0x${string}` | undefined,
  livePieceNumber: number,
) {
  const [owned, setOwned] = useState<OwnedFragment[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setOwned([]);
      setBalance(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [balanceResult, tokenIds] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        scanOwnedTokenIds(address),
      ]);

      const grouped = groupOwnedTokens(tokenIds, livePieceNumber);
      setBalance(Number(balanceResult));
      setOwned(grouped);
    } catch {
      setOwned([]);
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, livePieceNumber]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 8_000);
    const onWallet = () => refresh();
    const onMint = () => refresh();

    window.addEventListener('m-authenticated', onWallet);
    window.addEventListener('m-unauthenticated', onWallet);
    window.addEventListener('m-refresh-widgets', onMint);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('m-authenticated', onWallet);
      window.removeEventListener('m-unauthenticated', onWallet);
      window.removeEventListener('m-refresh-widgets', onMint);
    };
  }, [refresh]);

  return { owned, balance, isLoading, refresh };
}