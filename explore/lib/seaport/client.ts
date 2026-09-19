import { createPublicClient, http, type Chain } from 'viem';
import { base, mainnet } from 'viem/chains';
import { RPC, SEAPORT_1_6 } from './constants';
import { erc1155Abi, erc721Abi, seaportAbi, wethAbi } from './abi';
import type { HexAddr, OrderComponents } from './types';

export function publicClientFor(chain: 'ethereum' | 'base') {
  const viemChain: Chain = chain === 'base' ? base : mainnet;
  return createPublicClient({
    chain: viemChain,
    transport: http(RPC[chain]),
  });
}

export function chainIdOf(chain: 'ethereum' | 'base'): 1 | 8453 {
  return chain === 'base' ? 8453 : 1;
}

export async function getCounter(chain: 'ethereum' | 'base', offerer: HexAddr): Promise<bigint> {
  const client = publicClientFor(chain);
  return client.readContract({
    address: SEAPORT_1_6,
    abi: seaportAbi,
    functionName: 'getCounter',
    args: [offerer],
  });
}

export async function getOrderStatus(chain: 'ethereum' | 'base', orderHash: HexAddr) {
  const client = publicClientFor(chain);
  const [isValidated, isCancelled, totalFilled, totalSize] = await client.readContract({
    address: SEAPORT_1_6,
    abi: seaportAbi,
    functionName: 'getOrderStatus',
    args: [orderHash],
  });
  return { isValidated, isCancelled, totalFilled, totalSize };
}

export async function onchainOrderHash(chain: 'ethereum' | 'base', c: OrderComponents): Promise<HexAddr> {
  const client = publicClientFor(chain);
  return client.readContract({
    address: SEAPORT_1_6,
    abi: seaportAbi,
    functionName: 'getOrderHash',
    args: [c],
  });
}

export async function ownerOf721(chain: 'ethereum' | 'base', token: HexAddr, tokenId: bigint) {
  const client = publicClientFor(chain);
  return client.readContract({
    address: token,
    abi: erc721Abi,
    functionName: 'ownerOf',
    args: [tokenId],
  });
}

export async function balanceOf1155(
  chain: 'ethereum' | 'base',
  token: HexAddr,
  holder: HexAddr,
  tokenId: bigint,
) {
  const client = publicClientFor(chain);
  return client.readContract({
    address: token,
    abi: erc1155Abi,
    functionName: 'balanceOf',
    args: [holder, tokenId],
  });
}

export async function isApprovedForAll(
  chain: 'ethereum' | 'base',
  token: HexAddr,
  owner: HexAddr,
  operator: HexAddr,
  standard: 'erc721' | 'erc1155',
) {
  const client = publicClientFor(chain);
  return client.readContract({
    address: token,
    abi: standard === 'erc1155' ? erc1155Abi : erc721Abi,
    functionName: 'isApprovedForAll',
    args: [owner, operator],
  });
}

export async function wethAllowance(chain: 'ethereum' | 'base', weth: HexAddr, owner: HexAddr, spender: HexAddr) {
  const client = publicClientFor(chain);
  return client.readContract({
    address: weth,
    abi: wethAbi,
    functionName: 'allowance',
    args: [owner, spender],
  });
}

export async function wethBalance(chain: 'ethereum' | 'base', weth: HexAddr, owner: HexAddr) {
  const client = publicClientFor(chain);
  return client.readContract({
    address: weth,
    abi: wethAbi,
    functionName: 'balanceOf',
    args: [owner],
  });
}

export { wethAbi, seaportAbi, erc721Abi, erc1155Abi };
