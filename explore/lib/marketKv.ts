import { ARTIST_MINT_WALLET } from './collectors';
import { defaultFlags, type MarketFlags, type MarketIndex, type OrderRef, type StoredOrder } from './marketTypes';

export type Kv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete?(key: string): Promise<void>;
};

export const KEYS = {
  flags: 'atelier:market:flags:v1',
  index: 'market:index:v1',
  desk: 'market:desk:v1',
  lookbook: 'lookbook:v1',
  gardenHold: (w: string) => `garden:hold:${w.toLowerCase()}`,
  order: (hash: string) => `market:order:${hash.toLowerCase()}`,
};

const emptyIndex = (): MarketIndex => ({
  updatedAt: '',
  listings: [],
  offers: [],
  windows: [],
  policies: [],
});

export async function readFlags(kv: Kv | undefined): Promise<MarketFlags> {
  if (!kv) return defaultFlags();
  try {
    const raw = await kv.get(KEYS.flags);
    if (!raw) return defaultFlags();
    return { ...defaultFlags(), ...(JSON.parse(raw) as MarketFlags) };
  } catch {
    return defaultFlags();
  }
}

export async function writeFlags(kv: Kv, flags: MarketFlags) {
  await kv.put(KEYS.flags, JSON.stringify(flags));
}

export async function readIndex(kv: Kv | undefined): Promise<MarketIndex> {
  if (!kv) return emptyIndex();
  try {
    const raw = await kv.get(KEYS.index);
    if (!raw) return emptyIndex();
    const parsed = JSON.parse(raw) as MarketIndex;
    return {
      updatedAt: parsed.updatedAt || '',
      listings: parsed.listings || [],
      offers: parsed.offers || [],
      windows: parsed.windows || [],
      policies: parsed.policies || [],
    };
  } catch {
    return emptyIndex();
  }
}

export async function readOrder(kv: Kv, hash: string): Promise<StoredOrder | null> {
  try {
    const raw = await kv.get(KEYS.order(hash));
    if (!raw) return null;
    return JSON.parse(raw) as StoredOrder;
  } catch {
    return null;
  }
}

export async function writeOrder(kv: Kv, order: StoredOrder) {
  await kv.put(KEYS.order(order.orderHash), JSON.stringify(order));
}

export async function casIndex(
  kv: Kv,
  mut: (idx: MarketIndex) => MarketIndex,
): Promise<MarketIndex | null> {
  for (let i = 0; i < 2; i++) {
    const cur = await readIndex(kv);
    const next = mut({
      updatedAt: cur.updatedAt,
      listings: [...cur.listings],
      offers: [...cur.offers],
      windows: [...(cur.windows || [])],
      policies: [...(cur.policies || [])],
    });
    next.updatedAt = new Date().toISOString();
    await kv.put(KEYS.index, JSON.stringify(next));
    const check = await readIndex(kv);
    if (check.updatedAt === next.updatedAt) return next;
  }
  return null;
}

export async function bustCaches(kv: Kv) {
  try {
    await kv.put(KEYS.desk, '', { expirationTtl: 60 });
  } catch {
    /* ignore */
  }
  try {
    await kv.delete?.(KEYS.lookbook);
    await kv.delete?.(KEYS.gardenHold(ARTIST_MINT_WALLET));
    await kv.delete?.(KEYS.desk);
  } catch {
    /* Pages KV may lack delete — overwrite short TTL */
  }
}

export function upsertRef(list: OrderRef[], ref: OrderRef): OrderRef[] {
  const rest = list.filter((r) => r.orderHash.toLowerCase() !== ref.orderHash.toLowerCase());
  rest.push(ref);
  return rest;
}

export function dropRef(list: OrderRef[], hash: string): OrderRef[] {
  return list.filter((r) => r.orderHash.toLowerCase() !== hash.toLowerCase());
}
