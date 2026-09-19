/**
 * Resolve on-chain owner for Explore Theatre metadata.
 * ERC-721: ownerOf via public RPC.
 * ERC-1155: Alchemy getOwnersForToken (first holder when available).
 */

export type OwnerResult = {
  address: string;
  label: string;
  href?: string;
  source: string;
};

function shortAddr(a: string): string {
  if (!a || a.length < 12) return a || '-';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function explorerHref(chainId: number | undefined, address: string): string {
  if (chainId === 8453) return `https://basescan.org/address/${address}`;
  return `https://etherscan.io/address/${address}`;
}

export async function fetchTokenOwner(options: {
  contract?: string;
  tokenId?: number;
  chainId?: number;
  standard?: string;
  signal?: AbortSignal;
}): Promise<OwnerResult | null> {
  const { contract, tokenId, chainId = 1, standard, signal } = options;
  if (!contract || tokenId == null) return null;

  const is1155 = standard === 'erc1155';

  // Alchemy NFT API (demo key) — works for both standards when available
  try {
    const chain = chainId === 8453 ? 'base-mainnet' : 'eth-mainnet';
    const url =
      `https://${chain}.g.alchemy.com/nft/v3/demo/getOwnersForToken` +
      `?contractAddress=${contract}&tokenId=${tokenId}`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const json = (await res.json()) as { owners?: string[] };
      const owners = json.owners?.filter(Boolean) ?? [];
      if (owners.length === 1) {
        const a = owners[0];
        return {
          address: a,
          label: shortAddr(a),
          href: explorerHref(chainId, a),
          source: 'alchemy',
        };
      }
      if (owners.length > 1) {
        return {
          address: owners[0],
          label: `${shortAddr(owners[0])} +${owners.length - 1}`,
          href: explorerHref(chainId, owners[0]),
          source: 'alchemy',
        };
      }
    }
  } catch {
    /* fall through */
  }

  if (is1155) return null;

  // ERC-721 ownerOf via public RPC
  try {
    const rpc =
      chainId === 8453
        ? 'https://mainnet.base.org'
        : 'https://ethereum-rpc.publicnode.com';
    // ownerOf(uint256) selector 0x6352211e
    const idHex = BigInt(tokenId).toString(16).padStart(64, '0');
    const data = `0x6352211e${idHex}`;
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: contract, data }, 'latest'],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string; error?: unknown };
    if (!json.result || json.result === '0x') return null;
    const raw = json.result.replace(/^0x/, '');
    const addr = `0x${raw.slice(-40)}`;
    if (/^0x0+$/i.test(addr)) return null;
    return {
      address: addr,
      label: shortAddr(addr),
      href: explorerHref(chainId, addr),
      source: 'rpc',
    };
  } catch {
    return null;
  }
}
