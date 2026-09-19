import { ARTIST_MINT_WALLET } from '../collectors';
import { findNikxContract } from '../contracts';
import {
  ITEM_ERC20,
  ITEM_ERC721,
  ITEM_ERC1155,
  ITEM_NATIVE,
  ORDER_FULL_OPEN,
  WETH,
  ZERO_ADDRESS,
} from './constants';
import type { OrderComponents } from './types';

export function listingPriceWei(c: OrderComponents): bigint {
  return c.consideration[0]?.startAmount ?? 0n;
}

export function offerPriceWei(c: OrderComponents): bigint {
  return c.offer[0]?.startAmount ?? 0n;
}

export function nftFromListing(c: OrderComponents) {
  const o = c.offer[0];
  return o
    ? {
        token: o.token,
        tokenId: o.identifierOrCriteria,
        qty: o.startAmount,
        itemType: o.itemType,
      }
    : null;
}

export function nftFromOffer(c: OrderComponents) {
  const o = c.consideration[0];
  return o
    ? {
        token: o.token,
        tokenId: o.identifierOrCriteria,
        qty: o.startAmount,
        itemType: o.itemType,
      }
    : null;
}

export function assertListing(c: OrderComponents, chain: 'ethereum' | 'base'): string | null {
  if (c.zone.toLowerCase() !== ZERO_ADDRESS) return 'zone';
  if (c.orderType !== ORDER_FULL_OPEN) return 'orderType';
  if (c.offer.length !== 1 || c.consideration.length !== 1) return 'shape';
  const offer = c.offer[0];
  const con = c.consideration[0];
  if (offer.itemType !== ITEM_ERC721 && offer.itemType !== ITEM_ERC1155) return 'nft';
  if (con.itemType !== ITEM_NATIVE) return 'eth';
  if (con.token.toLowerCase() !== ZERO_ADDRESS) return 'eth_token';
  if (con.identifierOrCriteria !== 0n) return 'eth_id';
  if (con.startAmount <= 0n || con.startAmount !== con.endAmount) return 'price';
  if (con.recipient.toLowerCase() !== ARTIST_MINT_WALLET) return 'recipient';
  if (c.offerer.toLowerCase() !== ARTIST_MINT_WALLET) return 'offerer';
  const col = findNikxContract(offer.token);
  if (!col) return 'contract';
  if (col.chain !== chain) return 'chain';
  if (col.standard === 'erc721' && offer.itemType !== ITEM_ERC721) return 'standard';
  if (col.standard === 'erc1155' && offer.itemType !== ITEM_ERC1155) return 'standard';
  if (offer.itemType === ITEM_ERC721 && offer.startAmount !== 1n) return 'qty';
  return null;
}

export function assertOffer(c: OrderComponents, chain: 'ethereum' | 'base'): string | null {
  if (c.zone.toLowerCase() !== ZERO_ADDRESS) return 'zone';
  if (c.orderType !== ORDER_FULL_OPEN) return 'orderType';
  if (c.offer.length !== 1 || c.consideration.length !== 1) return 'shape';
  const weth = WETH[chain].toLowerCase();
  const pay = c.offer[0];
  const nft = c.consideration[0];
  if (pay.itemType !== ITEM_ERC20) return 'weth';
  if (pay.token.toLowerCase() !== weth) return 'weth_token';
  if (pay.identifierOrCriteria !== 0n) return 'weth_id';
  if (pay.startAmount <= 0n || pay.startAmount !== pay.endAmount) return 'price';
  if (nft.itemType !== ITEM_ERC721 && nft.itemType !== ITEM_ERC1155) return 'nft';
  if (nft.recipient.toLowerCase() !== c.offerer.toLowerCase()) return 'recipient';
  const col = findNikxContract(nft.token);
  if (!col) return 'contract';
  if (col.chain !== chain) return 'chain';
  return null;
}
