import { ARTIST_MINT_WALLET } from '../../../lib/collectors';
import { findNikxContract } from '../../../lib/contracts';
import { listingFamily } from '../../../lib/listingFamily';
import { formatEther } from 'viem';
import { readFlags, readIndex, readOrder, KEYS, type Kv } from '../../../lib/marketKv';
import { parseComponents } from '../../../lib/seaport/codec';
import { nftFromListing } from '../../../lib/seaport/validate';

type Env = { GARDEN_EGG?: Kv };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=15',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

type GardenToken = {
  seriesId: string;
  collection: string;
  contract: string;
  chain: string;
  tokenId: string;
  name: string;
  quantity: number;
  previewUrl?: string;
};

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  const flags = await readFlags(kv);
  try {
    const cached = kv ? await kv.get(KEYS.desk) : null;
    if (cached) {
      const parsed = JSON.parse(cached) as { ok?: boolean };
      if (parsed?.ok) return json(parsed);
    }
  } catch {
    /* rebuild */
  }

  const origin = new URL(context.request.url).origin;
  let beds: { seriesId: string; tokens: GardenToken[] }[] = [];
  try {
    const res = await fetch(`${origin}/api/garden?wallet=${ARTIST_MINT_WALLET}`);
    const data = (await res.json()) as { beds?: { seriesId: string; tokens: GardenToken[] }[] };
    beds = data.beds || [];
  } catch {
    beds = [];
  }

  const index = await readIndex(kv);
  const listingByWork = new Map<string, string>();
  for (const ref of index.listings) listingByWork.set(ref.workId, ref.orderHash);
  const offersByWork = new Map<string, string[]>();
  for (const ref of index.offers) {
    const arr = offersByWork.get(ref.workId) || [];
    arr.push(ref.orderHash);
    offersByWork.set(ref.workId, arr);
  }

  const works = [];
  for (const bed of beds) {
    for (const t of bed.tokens || []) {
      const col = findNikxContract(t.contract);
      if (!col) continue;
      if (!flags.chainReady.includes(col.chain)) continue;
      if (!flags.standardsReady.includes(col.standard)) continue;
      const workId = `${col.seriesId}-${t.tokenId}`;
      const listHash = listingByWork.get(workId);
      let listing = null;
      if (listHash && kv) {
        const ord = await readOrder(kv, listHash);
        if (ord?.status === 'active') {
          try {
            const c = parseComponents(ord.parameters);
            const nft = nftFromListing(c);
            if (nft) {
              listing = {
                orderHash: ord.orderHash,
                priceWei: ord.priceWei,
                priceEth: formatEther(BigInt(ord.priceWei)),
                startTime: Number(c.startTime),
                endTime: Number(c.endTime),
              };
            }
          } catch {
            listing = {
              orderHash: ord.orderHash,
              priceWei: ord.priceWei,
              priceEth: formatEther(BigInt(ord.priceWei)),
              startTime: 0,
              endTime: 0,
            };
          }
        }
      }
      const offerHashes = offersByWork.get(workId) || [];
      let bestOfferWei: string | undefined;
      let offerCount = 0;
      if (kv) {
        for (const h of offerHashes) {
          const o = await readOrder(kv, h);
          if (o?.status === 'active') {
            offerCount += 1;
            if (!bestOfferWei || BigInt(o.priceWei) > BigInt(bestOfferWei)) bestOfferWei = o.priceWei;
          }
        }
      }
      works.push({
        id: workId,
        seriesId: col.seriesId,
        title: t.name,
        contract: col.address,
        tokenId: t.tokenId,
        chain: col.chain,
        standard: col.standard,
        quantityStudio: t.quantity || 1,
        coverUrl: t.previewUrl,
        listing,
        offerCount,
        bestOfferWei,
        window: (index.windows || []).find((w) => w.workId === workId) || null,
        family: listingFamily(t.name),
      });
    }
  }

  const payload = {
    ok: true,
    flags: {
      publicBuyEnabled: flags.publicBuyEnabled,
      publicOfferEnabled: flags.publicOfferEnabled,
      note: flags.note,
    },
    works,
    chainReady: flags.chainReady,
    standardsReady: flags.standardsReady,
    policies: index.policies || [],
  };
  if (kv) {
    try {
      await kv.put(KEYS.desk, JSON.stringify(payload), { expirationTtl: 30 });
    } catch {
      /* ignore */
    }
  }
  return json(payload);
};
