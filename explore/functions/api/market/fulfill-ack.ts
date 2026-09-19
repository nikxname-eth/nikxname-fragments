import { ARTIST_MINT_WALLET } from '../../../lib/collectors';
import { decodeEventLog } from 'viem';
import { seaportAbi } from '../../../lib/seaport/abi';
import { SEAPORT_1_6 } from '../../../lib/seaport/constants';
import { getOrderStatus, publicClientFor } from '../../../lib/seaport/client';
import { bustCaches, casIndex, dropRef, readIndex, readOrder, writeOrder, type Kv } from '../../../lib/marketKv';

type Env = { GARDEN_EGG?: Kv };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);
  let body: { orderHash?: string; txHash?: string };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const order = await readOrder(kv, String(body.orderHash || ''));
  if (!order) return json({ ok: false, error: 'missing' }, 404);
  if (order.status === 'filled') return json({ ok: true, already: true });
  const txHash = String(body.txHash || '') as `0x${string}`;
  if (!txHash.startsWith('0x')) return json({ ok: false, error: 'tx' }, 400);

  const client = publicClientFor(order.chain);
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') return json({ ok: false, error: 'reverted' }, 409);

  const status = await getOrderStatus(order.chain, order.orderHash);
  let filledLog = false;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== SEAPORT_1_6.toLowerCase()) continue;
    try {
      const parsed = decodeEventLog({
        abi: seaportAbi,
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      if (parsed.eventName === 'OrderFulfilled') {
        const hash = String((parsed.args as { orderHash?: string }).orderHash || '');
        if (hash.toLowerCase() === order.orderHash.toLowerCase()) filledLog = true;
      }
    } catch {
      /* not this event */
    }
  }
  if (!filledLog && status.totalFilled === 0n) {
    return json({ ok: false, error: 'not_filled' }, 409);
  }
  if (status.isCancelled && status.totalFilled === 0n) {
    return json({ ok: false, error: 'cancelled' }, 409);
  }

  order.status = 'filled';
  order.filledTx = txHash;
  await writeOrder(kv, order);
  await casIndex(kv, (idx) => {
    idx.listings = dropRef(idx.listings, order.orderHash);
    idx.offers = dropRef(idx.offers, order.orderHash);
    if (order.kind === 'listing') {
      idx.offers = idx.offers.filter((r) => r.workId !== order.workId);
    }
    return idx;
  });
  if (order.kind === 'listing') {
    const index = await readIndex(kv);
    for (const ref of index.offers.filter((r) => r.workId === order.workId)) {
      const o = await readOrder(kv, ref.orderHash);
      if (o && o.status === 'active') {
        o.status = 'invalid';
        await writeOrder(kv, o);
      }
    }
  }
  await bustCaches(kv);
  void ARTIST_MINT_WALLET;
  return json({ ok: true, orderHash: order.orderHash, txHash });
};
