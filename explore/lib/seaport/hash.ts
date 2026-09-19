import { hashStruct, recoverTypedDataAddress, verifyTypedData } from 'viem';
import { SEAPORT_1_6 } from './constants';
import type { OrderComponents } from './types';

export const EIP_712_ORDER_TYPES = {
  OrderComponents: [
    { name: 'offerer', type: 'address' },
    { name: 'zone', type: 'address' },
    { name: 'offer', type: 'OfferItem[]' },
    { name: 'consideration', type: 'ConsiderationItem[]' },
    { name: 'orderType', type: 'uint8' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'zoneHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' },
    { name: 'conduitKey', type: 'bytes32' },
    { name: 'counter', type: 'uint256' },
  ],
  OfferItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
  ],
  ConsiderationItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
  ],
} as const;

export function seaportDomain(chainId: 1 | 8453) {
  return {
    name: 'Seaport',
    version: '1.6',
    chainId,
    verifyingContract: SEAPORT_1_6,
  } as const;
}

/** Seaport `getOrderHash` — the EIP-712 **struct** hash, not the domain digest. */
export function hashOrderComponents(components: OrderComponents, _chainId?: 1 | 8453): `0x${string}` {
  return hashStruct({
    types: EIP_712_ORDER_TYPES,
    primaryType: 'OrderComponents',
    data: components,
  });
}

export async function recoverOrderOfferer(
  components: OrderComponents,
  signature: `0x${string}`,
  chainId: 1 | 8453,
): Promise<`0x${string}`> {
  return recoverTypedDataAddress({
    domain: seaportDomain(chainId),
    types: EIP_712_ORDER_TYPES,
    primaryType: 'OrderComponents',
    message: components,
    signature,
  });
}

export async function verifyOrderSignature(
  components: OrderComponents,
  signature: `0x${string}`,
  chainId: 1 | 8453,
  offerer: `0x${string}`,
): Promise<boolean> {
  return verifyTypedData({
    address: offerer,
    domain: seaportDomain(chainId),
    types: EIP_712_ORDER_TYPES,
    primaryType: 'OrderComponents',
    message: components,
    signature,
  });
}
