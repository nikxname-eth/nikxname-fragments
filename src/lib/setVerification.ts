/**
 * Complete-set verification for Fragments 1–27.
 * Multi-set holders: completeSets = min(quantity of each piece 1..27).
 */

import { FINAL_FRAGMENT_PIECE, PIECE_NAMES } from '../config/artist';
import { pieceFromClaimTokenUri } from './fragments';
import { CONTRACT_ADDRESS, ERC721_ABI } from './contract';
import { publicClient } from './publicClient';

export type SetVerificationResult = {
  completeSets: number;
  /** Quantity held per piece 1..27 (0 if missing) */
  byPiece: Record<number, number>;
  /** Pieces with zero holdings */
  missing: number[];
  /** Total claim-mint tokens attributed to known pieces */
  totalAttributed: number;
  scannedTokens: number;
};

const OWNER_BATCH = 50;
const URI_BATCH = 30;
const SCAN_MAX_ID = 2_000;
const META_CONCURRENCY = 6;

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

async function resolvePieceFromUri(tokenUri: string): Promise<number | null> {
  const marked = pieceFromClaimTokenUri(tokenUri);
  if (marked != null) return marked;

  // Common URI patterns
  const patterns = [
    /fragment[-_\s]?0*(\d{1,2})/i,
    /frag[-_\s]?0*(\d{1,2})/i,
    /piece[-_\s]?0*(\d{1,2})/i,
  ];
  for (const re of patterns) {
    const m = tokenUri.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= FINAL_FRAGMENT_PIECE) return n;
    }
  }

  // Metadata JSON name: "Fragment 12" / "Fragment XII" is harder — try number first
  try {
    let url = tokenUri;
    if (url.startsWith('ipfs://')) url = `https://ipfs.io/ipfs/${url.slice(7)}`;
    if (url.startsWith('ar://')) url = `https://arweave.net/${url.slice(5)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { name?: string };
    const name = String(json?.name ?? '');
    const m = name.match(/fragment\s*(?:0*(\d{1,2})|xxvii|xxvi|xxv|xxiv|xxiii|xxii|xxi|xx|xix|xviii|xvii|xvi|xv|xiv|xiii|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/i);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (n >= 1 && n <= FINAL_FRAGMENT_PIECE) return n;
    }
    // Roman numerals used on site
    const roman: Record<string, number> = {
      i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
      xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18,
      xix: 19, xx: 20, xxi: 21, xxii: 22, xxiii: 23, xxiv: 24, xxv: 25, xxvi: 26, xxvii: 27,
    };
    const rm = name.match(/fragment\s+([ivx]+)/i);
    if (rm) {
      const n = roman[rm[1].toLowerCase()];
      if (n) return n;
    }
  } catch {
    /* ignore metadata failures */
  }
  return null;
}

/**
 * Full wallet scan → complete-set count.
 * Multi-set: min(qty_1, qty_2, … qty_27).
 */
export async function verifyCompleteSets(
  wallet: `0x${string}`,
  onProgress?: (msg: string) => void,
): Promise<SetVerificationResult> {
  const normalized = wallet.toLowerCase();
  onProgress?.('Locating collection tokens…');
  const lastId = await findLastMintedTokenId();
  if (lastId === 0) {
    return emptyResult(0);
  }

  const ownedIds: number[] = [];
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
    let results: { status: string; result?: `0x${string}` }[];
    try {
      results = await publicClient.multicall({ contracts, allowFailure: true });
    } catch {
      results = await Promise.all(
        contracts.map(async (c) => {
          try {
            const result = await publicClient.readContract(c);
            return { status: 'success' as const, result };
          } catch {
            return { status: 'failure' as const };
          }
        }),
      );
    }
    results.forEach((row, i) => {
      if (row.status === 'success' && row.result?.toLowerCase() === normalized) {
        ownedIds.push(start + i);
      }
    });
    onProgress?.(`Scanning ownership… ${Math.min(end, lastId)} / ${lastId}`);
  }

  if (ownedIds.length === 0) return emptyResult(0);

  onProgress?.(`Resolving ${ownedIds.length} token${ownedIds.length === 1 ? '' : 's'}…`);
  const counts = new Map<number, number>();
  const uris: { tokenId: number; uri: string }[] = [];

  for (let i = 0; i < ownedIds.length; i += URI_BATCH) {
    const batch = ownedIds.slice(i, i + URI_BATCH);
    const contracts = batch.map((tokenId) => ({
      address: CONTRACT_ADDRESS,
      abi: ERC721_ABI,
      functionName: 'tokenURI' as const,
      args: [BigInt(tokenId)] as const,
    }));
    let results: { status: string; result?: string }[];
    try {
      results = await publicClient.multicall({ contracts, allowFailure: true });
    } catch {
      results = await Promise.all(
        contracts.map(async (c) => {
          try {
            const result = await publicClient.readContract(c);
            return { status: 'success' as const, result };
          } catch {
            return { status: 'failure' as const };
          }
        }),
      );
    }
    results.forEach((row, j) => {
      if (row.status === 'success' && typeof row.result === 'string') {
        uris.push({ tokenId: batch[j], uri: row.result });
      }
    });
  }

  // Resolve pieces with limited concurrency (metadata fetches)
  let cursor = 0;
  async function worker() {
    while (cursor < uris.length) {
      const idx = cursor++;
      const { uri } = uris[idx];
      const piece = await resolvePieceFromUri(uri);
      if (piece != null) {
        counts.set(piece, (counts.get(piece) ?? 0) + 1);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(META_CONCURRENCY, uris.length || 1) }, () => worker()),
  );

  const byPiece: Record<number, number> = {};
  const missing: number[] = [];
  let completeSets = Infinity;
  let totalAttributed = 0;

  for (let p = 1; p <= FINAL_FRAGMENT_PIECE; p++) {
    const q = counts.get(p) ?? 0;
    byPiece[p] = q;
    totalAttributed += q;
    if (q === 0) {
      missing.push(p);
      completeSets = 0;
    } else if (completeSets !== 0) {
      completeSets = Math.min(completeSets, q);
    }
  }
  if (completeSets === Infinity) completeSets = 0;

  onProgress?.(
    completeSets > 0
      ? `Verified ${completeSets} complete set${completeSets === 1 ? '' : 's'}.`
      : 'Scan complete.',
  );

  return {
    completeSets,
    byPiece,
    missing,
    totalAttributed,
    scannedTokens: ownedIds.length,
  };
}

function emptyResult(scanned: number): SetVerificationResult {
  const byPiece: Record<number, number> = {};
  const missing: number[] = [];
  for (let p = 1; p <= FINAL_FRAGMENT_PIECE; p++) {
    byPiece[p] = 0;
    missing.push(p);
  }
  return {
    completeSets: 0,
    byPiece,
    missing,
    totalAttributed: 0,
    scannedTokens: scanned,
  };
}

export function pieceLabel(n: number): string {
  return PIECE_NAMES[n] ?? `Fragment ${n}`;
}
