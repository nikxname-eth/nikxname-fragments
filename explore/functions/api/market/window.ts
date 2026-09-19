import { parseEther } from 'viem';
import { verifyArtistSig } from '../../../lib/atelierAuth';
import { bustCaches, casIndex, type Kv } from '../../../lib/marketKv';
import type { SaleWindow } from '../../../lib/marketTypes';

type Env = { GARDEN_EGG?: Kv };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);
  let body: {
    address?: string;
    signature?: string;
    workId?: string;
    startTime?: number;
    endTime?: number;
    reserveEth?: string;
    familyId?: string;
    maxLive?: number;
    as?: string;
  };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const artist = await verifyArtistSig(body.address, body.signature);
  if (!artist) return json({ ok: false, error: 'unauthorized' }, 401);
  if (body.as === 'policy' && body.familyId) {
    const maxLive = Math.max(0, Math.min(20, Number(body.maxLive) || 0));
    const next = await casIndex(kv, (idx) => {
      idx.policies = [
        ...(idx.policies || []).filter((p) => p.familyId !== body.familyId),
        { familyId: String(body.familyId), maxLive },
      ];
      return idx;
    });
    if (!next) return json({ ok: false, error: 'index' }, 409);
    await bustCaches(kv);
    return json({ ok: true, policy: { familyId: body.familyId, maxLive } });
  }
  const workId = String(body.workId || '').trim();
  const startTime = Number(body.startTime);
  const endTime = Number(body.endTime);
  if (!workId || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return json({ ok: false, error: 'window' }, 400);
  }
  let reserveWei: string | undefined;
  if (body.reserveEth) {
    try {
      const n = parseEther(String(body.reserveEth));
      if (n > 0n) reserveWei = n.toString();
    } catch {
      /* ignore */
    }
  }
  const win: SaleWindow = { workId, mode: 'offers', startTime, endTime, reserveWei };
  const next = await casIndex(kv, (idx) => {
    idx.windows = [...(idx.windows || []).filter((w) => w.workId !== workId), win];
    return idx;
  });
  if (!next) return json({ ok: false, error: 'index' }, 409);
  await bustCaches(kv);
  return json({ ok: true, window: win });
};

export const onRequestDelete = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);
  let body: { address?: string; signature?: string; workId?: string };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const artist = await verifyArtistSig(body.address, body.signature);
  if (!artist) return json({ ok: false, error: 'unauthorized' }, 401);
  const workId = String(body.workId || '').trim();
  if (!workId) return json({ ok: false, error: 'work' }, 400);
  const next = await casIndex(kv, (idx) => {
    idx.windows = (idx.windows || []).filter((w) => w.workId !== workId);
    return idx;
  });
  if (!next) return json({ ok: false, error: 'index' }, 409);
  await bustCaches(kv);
  return json({ ok: true });
};
