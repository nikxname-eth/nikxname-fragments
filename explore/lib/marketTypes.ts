import type { HexAddr } from './seaport/types';

export type MarketFlags = {
  publicBuyEnabled: boolean;
  publicOfferEnabled: boolean;
  note: string;
  updatedAt: string;
  chainReady: ('ethereum' | 'base')[];
  standardsReady: ('erc721' | 'erc1155')[];
};

export type StoredOrder = {
  orderHash: HexAddr;
  kind: 'listing' | 'offer';
  chain: 'ethereum' | 'base';
  status: 'active' | 'filled' | 'cancelled' | 'invalid';
  workId: string;
  seriesId: string;
  contract: HexAddr;
  tokenId: string;
  priceWei: string;
  offerer: HexAddr;
  parameters: unknown;
  signature: HexAddr;
  filledTx?: HexAddr;
};

export type OrderRef = {
  orderHash: HexAddr;
  kind: 'listing' | 'offer';
  workId: string;
  offerer: HexAddr;
  chain: 'ethereum' | 'base';
  familyId?: string;
  title?: string;
};

export type SaleWindow = {
  workId: string;
  mode: 'offers';
  startTime: number;
  endTime: number;
  reserveWei?: string;
};

export type FamilyPolicy = {
  familyId: string;
  maxLive: number;
};

export type MarketIndex = {
  updatedAt: string;
  listings: OrderRef[];
  offers: OrderRef[];
  windows: SaleWindow[];
  policies: FamilyPolicy[];
};

export const defaultFlags = (): MarketFlags => ({
  publicBuyEnabled: false,
  publicOfferEnabled: false,
  note: '',
  updatedAt: '',
  chainReady: ['ethereum'],
  standardsReady: ['erc721'],
});
