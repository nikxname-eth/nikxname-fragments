import type { ConsiderationItem, HexAddr, OfferItem, OrderComponents } from './types';

function asHex(v: unknown): HexAddr {
  const s = String(v || '').toLowerCase();
  if (!s.startsWith('0x')) throw new Error('hex');
  return s as HexAddr;
}

function asBig(v: unknown): bigint {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return BigInt(v);
  const s = String(v ?? '0');
  return BigInt(s);
}

function offerItem(raw: unknown): OfferItem {
  const r = raw as Record<string, unknown>;
  return {
    itemType: Number(r.itemType),
    token: asHex(r.token),
    identifierOrCriteria: asBig(r.identifierOrCriteria),
    startAmount: asBig(r.startAmount),
    endAmount: asBig(r.endAmount),
  };
}

function considerationItem(raw: unknown): ConsiderationItem {
  const r = raw as Record<string, unknown>;
  return { ...offerItem(raw), recipient: asHex(r.recipient) };
}

export function parseComponents(raw: unknown): OrderComponents {
  if (!raw || typeof raw !== 'object') throw new Error('components');
  const r = raw as Record<string, unknown>;
  const offer = Array.isArray(r.offer) ? r.offer.map(offerItem) : [];
  const consideration = Array.isArray(r.consideration) ? r.consideration.map(considerationItem) : [];
  return {
    offerer: asHex(r.offerer),
    zone: asHex(r.zone),
    offer,
    consideration,
    orderType: Number(r.orderType),
    startTime: asBig(r.startTime),
    endTime: asBig(r.endTime),
    zoneHash: asHex(r.zoneHash),
    salt: asBig(r.salt),
    conduitKey: asHex(r.conduitKey),
    counter: asBig(r.counter),
  };
}

export function jsonComponents(c: OrderComponents) {
  const item = (o: OfferItem) => ({
    itemType: o.itemType,
    token: o.token,
    identifierOrCriteria: o.identifierOrCriteria.toString(),
    startAmount: o.startAmount.toString(),
    endAmount: o.endAmount.toString(),
  });
  return {
    offerer: c.offerer,
    zone: c.zone,
    offer: c.offer.map(item),
    consideration: c.consideration.map((x) => ({ ...item(x), recipient: x.recipient })),
    orderType: c.orderType,
    startTime: c.startTime.toString(),
    endTime: c.endTime.toString(),
    zoneHash: c.zoneHash,
    salt: c.salt.toString(),
    conduitKey: c.conduitKey,
    counter: c.counter.toString(),
  };
}
