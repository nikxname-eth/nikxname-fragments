import {
  ITEM_ERC20,
  ITEM_ERC721,
  ITEM_ERC1155,
  ITEM_NATIVE,
  OPENSEA_CONDUIT_KEY,
  ORDER_FULL_OPEN,
  ZERO_ADDRESS,
  ZERO_HASH,
} from './constants';
import type { ConsiderationItem, HexAddr, OfferItem, OrderComponents } from './types';

function randomSalt(): bigint {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  let n = 0n;
  for (const b of a) n = (n << 8n) | BigInt(b);
  return n;
}

export function nowStart(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) - 60);
}

export function buildListing(opts: {
  offerer: HexAddr;
  contract: HexAddr;
  tokenId: bigint;
  standard: 'erc721' | 'erc1155';
  quantity: bigint;
  priceWei: bigint;
  counter: bigint;
  startTime: bigint;
  endTime: bigint;
}): OrderComponents {
  if (opts.priceWei <= 0n) throw new Error('price_zero');
  if (opts.standard === 'erc721' && opts.quantity !== 1n) throw new Error('qty');
  const itemType = opts.standard === 'erc1155' ? ITEM_ERC1155 : ITEM_ERC721;
  const offer: OfferItem[] = [
    {
      itemType,
      token: opts.contract,
      identifierOrCriteria: opts.tokenId,
      startAmount: opts.quantity,
      endAmount: opts.quantity,
    },
  ];
  const consideration: ConsiderationItem[] = [
    {
      itemType: ITEM_NATIVE,
      token: ZERO_ADDRESS,
      identifierOrCriteria: 0n,
      startAmount: opts.priceWei,
      endAmount: opts.priceWei,
      recipient: opts.offerer,
    },
  ];
  return {
    offerer: opts.offerer,
    zone: ZERO_ADDRESS,
    offer,
    consideration,
    orderType: ORDER_FULL_OPEN,
    startTime: opts.startTime,
    endTime: opts.endTime,
    zoneHash: ZERO_HASH,
    salt: randomSalt(),
    conduitKey: OPENSEA_CONDUIT_KEY,
    counter: opts.counter,
  };
}

export function buildOffer(opts: {
  offerer: HexAddr;
  contract: HexAddr;
  tokenId: bigint;
  standard: 'erc721' | 'erc1155';
  quantity: bigint;
  priceWei: bigint;
  weth: HexAddr;
  counter: bigint;
  startTime: bigint;
  endTime: bigint;
}): OrderComponents {
  if (opts.priceWei <= 0n) throw new Error('price_zero');
  const nftType = opts.standard === 'erc1155' ? ITEM_ERC1155 : ITEM_ERC721;
  return {
    offerer: opts.offerer,
    zone: ZERO_ADDRESS,
    offer: [
      {
        itemType: ITEM_ERC20,
        token: opts.weth,
        identifierOrCriteria: 0n,
        startAmount: opts.priceWei,
        endAmount: opts.priceWei,
      },
    ],
    consideration: [
      {
        itemType: nftType,
        token: opts.contract,
        identifierOrCriteria: opts.tokenId,
        startAmount: opts.quantity,
        endAmount: opts.quantity,
        recipient: opts.offerer,
      },
    ],
    orderType: ORDER_FULL_OPEN,
    startTime: opts.startTime,
    endTime: opts.endTime,
    zoneHash: ZERO_HASH,
    salt: randomSalt(),
    conduitKey: OPENSEA_CONDUIT_KEY,
    counter: opts.counter,
  };
}
