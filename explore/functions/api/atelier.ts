/**
 * GET  /api/atelier  Authorization: signed atelier message
 * PUT  /api/atelier  { signature, address, rows }
 *
 * Live collector book in GARDEN_EGG KV. Notes never leave this endpoint.
 */

import { verifyMessage } from 'viem';
import {
  ATELIER_MESSAGE,
  isAtelierAdmin,
  seedAtelierRows,
  type AtelierRow,
} from '../../lib/collectors';

type Kv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

type Env = { GARDEN_EGG?: Kv };

const KEY = 'atelier:collectors:v1';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Atelier-Address, X-Atelier-Signature',
  'Cache-Control': 'no-store',
};

type Book = { version: 1; updatedAt: string; rows: AtelierRow[] };

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

async function authorized(address: string | null, signature: string | null): Promise<boolean> {
  const wallet = normalizeWallet(address);
  if (!wallet || !signature || !isAtelierAdmin(wallet)) return false;
  try {
    return await verifyMessage({
      address: wallet as `0x${string}`,
      message: ATELIER_MESSAGE,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

function cleanRows(input: unknown): AtelierRow[] | null {
  if (!Array.isArray(input)) return null;
  const rows: AtelierRow[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const address = normalizeWallet(String(r.address ?? ''));
    if (!address) continue;
    const id =
      typeof r.id === 'string' && r.id.trim()
        ? r.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
        : address.slice(2, 10);
    rows.push({
      id,
      address: address as `0x${string}`,
      name: String(r.name ?? '').trim().slice(0, 80) || 'Collector',
      title: String(r.title ?? '').trim().slice(0, 80),
      kicker: String(r.kicker ?? '').trim().slice(0, 80),
      lead: String(r.lead ?? '').trim().slice(0, 280),
      admin: Boolean(r.admin) || isAtelierAdmin(address),
      enabled: r.enabled !== false,
      notes: String(r.notes ?? '').slice(0, 2000),
      ens: String(r.ens ?? '').trim().slice(0, 80),
    });
  }
  if (!rows.some((r) => r.admin)) {
    const seed = seedAtelierRows().find((r) => r.admin);
    if (seed) rows.unshift(seed);
  }
  return rows;
}

async function readBook(kv: Kv | undefined): Promise<Book> {
  const empty: Book = { version: 1, updatedAt: '', rows: seedAtelierRows() };
  if (!kv) return empty;
  try {
    const raw = await kv.get(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Book;
    if (!Array.isArray(parsed.rows)) return empty;
    return { version: 1, updatedAt: parsed.updatedAt || '', rows: parsed.rows };
  } catch {
    return empty;
  }
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
}) => {
  const url = new URL(context.request.url);
  const address = url.searchParams.get('address') || context.request.headers.get('X-Atelier-Address');
  const signature =
    url.searchParams.get('signature') || context.request.headers.get('X-Atelier-Signature');
  if (!(await authorized(address, signature))) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  const book = await readBook(context.env.GARDEN_EGG);
  return json({ ok: true, updatedAt: book.updatedAt, rows: book.rows });
};

export const onRequestPut = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);

  let body: { address?: string; signature?: string; rows?: unknown } = {};
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  if (!(await authorized(body.address ?? null, body.signature ?? null))) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const rows = cleanRows(body.rows);
  if (!rows || !rows.length) return json({ ok: false, error: 'empty' }, 400);

  const book: Book = { version: 1, updatedAt: new Date().toISOString(), rows };
  await kv.put(KEY, JSON.stringify(book));
  return json({ ok: true, updatedAt: book.updatedAt, rows: book.rows });
};
