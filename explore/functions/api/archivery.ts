/**
 * POST /api/archivery
 * { address, signature, urls: string[] }
 * HEAD/range-check public pin URLs. Atelier admin only.
 */

import { verifyMessage } from 'viem';
import { ATELIER_MESSAGE, isAtelierAdmin } from '../../lib/collectors';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

function normalizeWallet(w: string | null | undefined): string | null {
  if (!w) return null;
  const t = String(w).trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? t : null;
}

function arweaveMirrors(url: string): string[] {
  const out = [url];
  const m = url.match(/([a-z0-9_-]{43,})(?:\?|$)/i);
  if (/arweave/i.test(url) && m) {
    const id = m[1];
    const alt = `https://arweave.net/${id}`;
    if (alt !== url) out.push(alt);
  }
  return out;
}

async function pingOne(url: string): Promise<{ ok: boolean; status: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    if (!res.ok && res.status !== 206) return { ok: false, status: res.status };
    const reader = res.body?.getReader();
    if (reader) {
      await reader.read();
      await reader.cancel();
    }
    return { ok: true, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(t);
  }
}

async function ping(url: string): Promise<{ url: string; ok: boolean; status: number }> {
  for (const tryUrl of arweaveMirrors(url)) {
    const hit = await pingOne(tryUrl);
    if (hit.ok) return { url, ok: true, status: hit.status };
  }
  return { url, ok: false, status: 0 };
}

export const onRequestPost = async (context: { request: Request }) => {
  const body = (await context.request.json().catch(() => null)) as {
    address?: string;
    signature?: string;
    urls?: string[];
  } | null;
  const wallet = normalizeWallet(body?.address);
  if (!wallet || !body?.signature || !isAtelierAdmin(wallet)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  try {
    const ok = await verifyMessage({
      address: wallet as `0x${string}`,
      message: ATELIER_MESSAGE,
      signature: body.signature as `0x${string}`,
    });
    if (!ok) return json({ ok: false, error: 'unauthorized' }, 401);
  } catch {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const urls = (body.urls || [])
    .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    .slice(0, 40);
  const results = await Promise.all(urls.map((url) => ping(url)));
  return json({
    ok: true,
    checked: results.length,
    live: results.filter((r) => r.ok).length,
    results,
  });
};
