/**
 * GET /api/collectors?wallet=0x…
 * Public profile for one connected wallet. No notes. No listing.
 */

import { publicProfile, seedAtelierRows, type AtelierRow } from '../../lib/collectors';

type Kv = { get(key: string): Promise<string | null> };
type Env = { GARDEN_EGG?: Kv };

const KEY = 'atelier:collectors:v1';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=30',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function normalizeWallet(w: string | null): string | null {
  if (!w) return null;
  const t = w.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? t : null;
}

async function allRows(kv: Kv | undefined): Promise<AtelierRow[]> {
  if (!kv) return seedAtelierRows();
  try {
    const raw = await kv.get(KEY);
    if (!raw) return seedAtelierRows();
    const parsed = JSON.parse(raw) as { rows?: AtelierRow[] };
    return Array.isArray(parsed.rows) && parsed.rows.length ? parsed.rows : seedAtelierRows();
  } catch {
    return seedAtelierRows();
  }
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const wallet = normalizeWallet(new URL(context.request.url).searchParams.get('wallet'));
  if (!wallet) return json({ ok: false, error: 'invalid_wallet' }, 400);
  const rows = await allRows(context.env.GARDEN_EGG);
  const row = rows.find((r) => r.address.toLowerCase() === wallet);
  const profile = row ? publicProfile(row) : null;
  return json({ ok: true, profile });
};
