import { encodeFunctionData } from 'viem';
import { BLOCK_MARKETPLACE, BLOCK_ONCHAIN_LISTING } from '../config/on-the-block';

const bidAbi = [
  {
    name: 'bid',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'listingId', type: 'uint40' },
      { name: 'increase', type: 'bool' },
    ],
    outputs: [],
  },
] as const;

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

/** Full bid for a new wallet. Additional ETH only when the same wallet raises. */
export function bidValueWei(totalWei: bigint, currentWei: bigint, wallet: string, bidder: string | null): {
  value: bigint;
  increase: boolean;
} {
  const raising =
    !!bidder && wallet.toLowerCase() === bidder.toLowerCase() && currentWei > 0n;
  if (!raising) return { value: totalWei, increase: false };
  return { value: totalWei - currentWei, increase: true };
}

export async function sendAuctionBid(
  eth: Eth,
  from: string,
  totalWei: bigint,
  currentWei: bigint,
  bidder: string | null,
): Promise<string> {
  const { value, increase } = bidValueWei(totalWei, currentWei, from, bidder);
  if (value <= 0n) throw new Error('Raise the bid above the current one.');
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x1' }],
    });
  } catch {
    /* already on Ethereum, or the wallet will reject the bid */
  }
  const data = encodeFunctionData({
    abi: bidAbi,
    functionName: 'bid',
    args: [BLOCK_ONCHAIN_LISTING, increase],
  });
  const hash = await eth.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: BLOCK_MARKETPLACE,
        data,
        value: `0x${value.toString(16)}`,
      },
    ],
  });
  return String(hash);
}
