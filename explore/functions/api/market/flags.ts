import { verifyArtistSig } from '../../../lib/atelierAuth';
import { defaultFlags } from '../../../lib/marketTypes';
import { readFlags, writeFlags, type Kv } from '../../../lib/marketKv';

type Env = { GARDEN_EGG?: Kv };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Atelier-Address, X-Atelier-Signature',
  'Cache-Control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: { env: Env }) => {
  const flags = await readFlags(context.env.GARDEN_EGG);
  return json({ ok: true, flags });
};

export const onRequestPut = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);
  let body: {
    address?: string;
    signature?: string;
    publicBuyEnabled?: boolean;
    publicOfferEnabled?: boolean;
    note?: string;
    updatedAt?: string;
  } = {};
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const artist = await verifyArtistSig(
    body.address || context.request.headers.get('X-Atelier-Address'),
    body.signature || context.request.headers.get('X-Atelier-Signature'),
  );
  if (!artist) return json({ ok: false, error: 'unauthorized' }, 401);
  const cur = await readFlags(kv);
  if ((body.updatedAt ?? '') !== (cur.updatedAt ?? '')) {
    return json({ ok: false, error: 'conflict', flags: cur }, 409);
  }
  const next = {
    ...defaultFlags(),
    ...cur,
    publicBuyEnabled: Boolean(body.publicBuyEnabled),
    publicOfferEnabled: Boolean(body.publicOfferEnabled),
    note: String(body.note ?? cur.note ?? '').slice(0, 280),
    updatedAt: new Date().toISOString(),
  };
  await writeFlags(kv, next);
  return json({ ok: true, flags: next });
};
