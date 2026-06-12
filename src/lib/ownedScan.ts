import { PIECE_NAMES } from '../config/artist';
import { CONTRACT_ADDRESS, ERC721_ABI } from './contract';
import { pieceFromClaimTokenUri } from './fragments';
import { publicClient } from './publicClient';

export type OwnedFragment = {
  pieceNumber: number;
  title: string;
  quantity: number;
};

const SCAN_MAX_ID = 1_000;
const OWNER_BATCH = 50;
const URI_BATCH = 40;

async function findLastMintedTokenId(): Promise<number> {
  let lo = 1;
  let hi = SCAN_MAX_ID;
  let last = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    try {
      await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ERC721_ABI,
        functionName: 'ownerOf',
        args: [BigInt(mid)],
      });
      last = mid;
      lo = mid + 1;
    } catch {
      hi = mid - 1;
    }
  }

  return last;
}

/** Batched on-chain scan — fast enough for post-mint banner updates in the browser. */
export async function fetchOwnedClaimFragments(
  wallet: `0x${string}`,
): Promise<{ owned: OwnedFragment[]; balance: number }> {
  const lastId = await findLastMintedTokenId();
  if (lastId === 0) return { owned: [], balance: 0 };

  const ownedIds: number[] = [];
  const normalizedWallet = wallet.toLowerCase();

  for (let start = 1; start <= lastId; start += OWNER_BATCH) {
    const end = Math.min(start + OWNER_BATCH - 1, lastId);
    const contracts = [];

    for (let id = start; id <= end; id += 1) {
      contracts.push({
        address: CONTRACT_ADDRESS,
        abi: ERC721_ABI,
        functionName: 'ownerOf' as const,
        args: [BigInt(id)] as const,
      });
    }

    const results = await publicClient.multicall({
      contracts,
      allowFailure: true,
    });

    results.forEach((result, index) => {
      if (
        result.status === 'success' &&
        result.result.toLowerCase() === normalizedWallet
      ) {
        ownedIds.push(start + index);
      }
    });
  }

  if (ownedIds.length === 0) return { owned: [], balance: 0 };

  const counts = new Map<number, number>();

  for (let i = 0; i < ownedIds.length; i += URI_BATCH) {
    const batch = ownedIds.slice(i, i + URI_BATCH);
    const contracts = batch.map((tokenId) => ({
      address: CONTRACT_ADDRESS,
      abi: ERC721_ABI,
      functionName: 'tokenURI' as const,
      args: [BigInt(tokenId)] as const,
    }));

    const results = await publicClient.multicall({
      contracts,
      allowFailure: true,
    });

    results.forEach((result) => {
      if (result.status !== 'success') return;
      const piece = pieceFromClaimTokenUri(result.result);
      if (piece == null) return;
      counts.set(piece, (counts.get(piece) ?? 0) + 1);
    });
  }

  const owned = [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pieceNumber, quantity]) => ({
      pieceNumber,
      title: PIECE_NAMES[pieceNumber] ?? `Fragment ${pieceNumber}`,
      quantity,
    }));

  const balance = owned.reduce((sum, fragment) => sum + fragment.quantity, 0);
  return { owned, balance };
}