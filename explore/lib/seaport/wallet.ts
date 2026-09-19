import { encodeFunctionData, type Hex } from 'viem';
import { seaportAbi, wethAbi, erc721Abi } from './abi';
import { OPENSEA_CONDUIT, SEAPORT_1_6, ZERO_HASH } from './constants';
import { EIP_712_ORDER_TYPES, seaportDomain } from './hash';
import { toOrderParameters, type HexAddr, type OrderComponents } from './types';

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export async function ensureChain(eth: Eth, chainId: 1 | 8453) {
  const hex = `0x${chainId.toString(16)}`;
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code !== 4902) throw err;
    if (chainId === 8453) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hex,
            chainName: 'Base',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          },
        ],
      });
    }
  }
}

export async function signOrderComponents(eth: Eth, account: HexAddr, c: OrderComponents, chainId: 1 | 8453) {
  const payload = {
    types: EIP_712_ORDER_TYPES,
    domain: seaportDomain(chainId),
    primaryType: 'OrderComponents',
    message: {
      ...c,
      offer: c.offer.map((o) => ({ ...o, itemType: Number(o.itemType) })),
      consideration: c.consideration.map((o) => ({ ...o, itemType: Number(o.itemType) })),
      orderType: Number(c.orderType),
    },
  };
  const sig = await eth.request({
    method: 'eth_signTypedData_v4',
    params: [account, JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? v.toString() : v))],
  });
  return String(sig) as Hex;
}

export function fulfillCalldata(c: OrderComponents, signature: Hex): Hex {
  return encodeFunctionData({
    abi: seaportAbi,
    functionName: 'fulfillOrder',
    args: [
      {
        parameters: toOrderParameters(c),
        signature,
      },
      ZERO_HASH,
    ],
  });
}

export function cancelCalldata(c: OrderComponents): Hex {
  return encodeFunctionData({
    abi: seaportAbi,
    functionName: 'cancel',
    args: [[c]],
  });
}

export function approveConduitCalldata(): Hex {
  return encodeFunctionData({
    abi: erc721Abi,
    functionName: 'setApprovalForAll',
    args: [OPENSEA_CONDUIT, true],
  });
}

export function wethDepositCalldata(): Hex {
  return encodeFunctionData({ abi: wethAbi, functionName: 'deposit' });
}

export function wethApproveCalldata(amount: bigint): Hex {
  return encodeFunctionData({
    abi: wethAbi,
    functionName: 'approve',
    args: [OPENSEA_CONDUIT, amount],
  });
}

export async function sendTx(eth: Eth, from: HexAddr, to: HexAddr, data: Hex, value?: bigint) {
  const hash = await eth.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to,
        data,
        ...(value && value > 0n ? { value: `0x${value.toString(16)}` } : {}),
      },
    ],
  });
  return String(hash) as Hex;
}

export { SEAPORT_1_6 };
