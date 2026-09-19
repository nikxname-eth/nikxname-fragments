export type HexAddr = `0x${string}`;

export type OfferItem = {
  itemType: number;
  token: HexAddr;
  identifierOrCriteria: bigint;
  startAmount: bigint;
  endAmount: bigint;
};

export type ConsiderationItem = OfferItem & {
  recipient: HexAddr;
};

/** EIP-712 signed payload (includes counter). */
export type OrderComponents = {
  offerer: HexAddr;
  zone: HexAddr;
  offer: OfferItem[];
  consideration: ConsiderationItem[];
  orderType: number;
  startTime: bigint;
  endTime: bigint;
  zoneHash: HexAddr;
  salt: bigint;
  conduitKey: HexAddr;
  counter: bigint;
};

/** fulfillOrder parameters (no counter; has totalOriginalConsiderationItems). */
export type OrderParameters = Omit<OrderComponents, 'counter'> & {
  totalOriginalConsiderationItems: bigint;
};

export type SignedOrder = {
  parameters: OrderComponents;
  signature: HexAddr;
};

export function toOrderParameters(c: OrderComponents): OrderParameters {
  const { counter: _c, ...rest } = c;
  return {
    ...rest,
    totalOriginalConsiderationItems: BigInt(c.consideration.length),
  };
}
