/**
 * First-finder easter egg in The Garden.
 * GET  /api/garden-egg
 * POST /api/garden-egg  { wallet }
 */

type Kv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};
type Env = { GARDEN_EGG?: Kv };

const KEY = 'garden:butterfly:v1';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

type Claim = { wallet: string; at: number };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function normalizeWallet(w: string | null | undefined): string | null {
  if (!w) return null;
  const t = String(w).trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? t : null;
}

async function readClaim(kv: Kv | undefined): Promise<Claim | null> {
  if (!kv) return null;
  try {
    const raw = await kv.get(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Claim;
  } catch {
    return null;
  }
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: { env: Env }) => {
  const claim = await readClaim(context.env.GARDEN_EGG);
  return json({
    ok: true,
    claimed: Boolean(claim),
    first: claim ? false : true,
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);

  let body: { wallet?: string } = {};
  try {
    body = (await context.request.json()) as { wallet?: string };
  } catch {
    body = {};
  }
  const wallet = normalizeWallet(body.wallet);
  if (!wallet) return json({ ok: false, error: 'invalid_wallet' }, 400);

  const existing = await readClaim(kv);
  if (existing) {
    const yours = existing.wallet === wallet;
    return json({
      ok: true,
      claimed: true,
      first: yours,
      yours,
    });
  }

  const claim: Claim = { wallet, at: Date.now() };
  await kv.put(KEY, JSON.stringify(claim));
  return json({ ok: true, claimed: true, first: true, yours: true });
};
