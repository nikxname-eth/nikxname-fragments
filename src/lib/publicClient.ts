import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

/** Public Ethereum client for read-only contract calls (no wallet needed). */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum.publicnode.com'),
});