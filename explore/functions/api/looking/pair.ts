/**
 * POST /api/looking/pair { wallet } → { code, lookingUrl }
 * GET  /api/looking/pair?code=AB34 → { wallet }
 *
 * Pairing is unauthenticated. Rate limits live in this function.
 * Holdings checks use garden:hold:{wallet} only — never stampede Alchemy.
 */

import { normalizeWallet } from '../../../lib/atelierAuth';
import { normalizePairCode, randomPairCode } from '../../../lib/pairCode';

type Kv = {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

type Env = { GARDEN_EGG?: Kv };

const PAIR_TTL = 600;
const LIVE_MAX = 3;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

type PairRecord = { wallet: string; exp: number };
type LiveIndex = { codes: { code: string; exp: number }[] };
type WindowCount = { n: number; resetAt: number };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function clientIp(request: Request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
}

function lookingUrl(origin: string, wallet: string) {
  return `${origin}/looking/${wallet}`;
}

async function takeWindow(kv: Kv, key: string, max: number, windowSec: number) {
  const now = Date.now();
  let win: WindowCount = { n: 0, resetAt: now + windowSec * 1000 };
  try {
    const raw = await kv.get(key);
    if (raw) {
      const parsed = JSON.parse(raw) as WindowCount;
      if (parsed.resetAt > now) win = parsed;
    }
  } catch {
    /* fresh window */
  }
  if (win.n >= max) return false;
  win.n += 1;
  const ttl = Math.max(60, Math.ceil((win.resetAt - now) / 1000));
  await kv.put(key, JSON.stringify(win), { expirationTtl: ttl });
  return true;
}

async function readLive(kv: Kv, wallet: string): Promise<LiveIndex> {
  try {
    const raw = await kv.get(`looking:live:${wallet}`);
    if (!raw) return { codes: [] };
    const parsed = JSON.parse(raw) as LiveIndex;
    const now = Date.now();
    return { codes: (parsed.codes || []).filter((c) => c.exp > now) };
  } catch {
    return { codes: [] };
  }
}

async function ensureHoldings(kv: Kv, wallet: string, origin: string) {
  const cached = await kv.get(`garden:hold:${wallet}`, { cacheTtl: 30 });
  if (cached) return true;
  const lockKey = `looking:hold-lock:${wallet}`;
  const locked = await kv.get(lockKey);
  if (locked) return false;
  await kv.put(lockKey, '1', { expirationTtl: 30 });
  try {
    await fetch(`${origin}/api/garden?wallet=${encodeURIComponent(wallet)}`);
  } catch {
    /* pairing still proceeds; TV may show an empty room */
  }
  return true;
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);

  const ip = clientIp(context.request);
  if (!(await takeWindow(kv, `looking:rl:get:${ip}`, 30, 60))) {
    return json({ ok: false, error: 'rate' }, 429);
  }

  const code = normalizePairCode(new URL(context.request.url).searchParams.get('code'));
  if (!code) return json({ ok: false, error: 'invalid_code' }, 400);

  let rec: PairRecord | null = null;
  try {
    const raw = await kv.get(`looking:pair:${code}`);
    if (raw) rec = JSON.parse(raw) as PairRecord;
  } catch {
    rec = null;
  }
  if (!rec?.wallet || rec.exp < Date.now()) return json({ ok: false, error: 'unknown' }, 404);
  return json({ ok: true, wallet: rec.wallet });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);

  const ip = clientIp(context.request);
  if (!(await takeWindow(kv, `looking:rl:post:${ip}`, 5, 60))) {
    return json({ ok: false, error: 'rate' }, 429);
  }

  let body: { wallet?: string } = {};
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const wallet = normalizeWallet(body.wallet);
  if (!wallet) return json({ ok: false, error: 'invalid_wallet' }, 400);

  const origin = new URL(context.request.url).origin;
  if (!(await ensureHoldings(kv, wallet, origin))) {
    return json({ ok: false, error: 'holdings_busy' }, 429);
  }

  const live = await readLive(kv, wallet);
  if (live.codes.length >= LIVE_MAX) {
    return json({ ok: false, error: 'live_limit' }, 429);
  }

  let code = randomPairCode();
  for (let i = 0; i < 6; i++) {
    const clash = await kv.get(`looking:pair:${code}`);
    if (!clash) break;
    code = randomPairCode();
  }

  const exp = Date.now() + PAIR_TTL * 1000;
  const rec: PairRecord = { wallet, exp };
  await kv.put(`looking:pair:${code}`, JSON.stringify(rec), { expirationTtl: PAIR_TTL });
  live.codes.push({ code, exp });
  await kv.put(`looking:live:${wallet}`, JSON.stringify(live), { expirationTtl: PAIR_TTL });

  return json({
    ok: true,
    code,
    exp,
    lookingUrl: lookingUrl(origin, wallet),
  });
};
