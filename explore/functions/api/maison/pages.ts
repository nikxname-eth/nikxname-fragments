/**
 * GET    /api/maison/pages              artist list
 * GET    /api/maison/pages?slug=        artist get, or guest with ?k=
 * PUT    /api/maison/pages              artist save { slug, page }
 * DELETE /api/maison/pages?slug=        artist delete
 */

import { readAtelierAuth, verifyArtistSig } from '../../../lib/atelierAuth';
import { cleanIndex, cleanPage, emptyPage, indexItem } from '../../../lib/maison/schema';
import type { MaisonIndex, MaisonPage } from '../../../lib/maison/types';

type Kv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

type Env = { GARDEN_EGG?: Kv };

const INDEX_KEY = 'maison:index:v1';
const PAGE_PREFIX = 'maison:page:';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Atelier-Address, X-Atelier-Signature',
  'Cache-Control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function pageKey(slug: string) {
  return PAGE_PREFIX + slug;
}

async function readIndex(kv: Kv | undefined): Promise<MaisonIndex> {
  if (!kv) return { version: 1, pages: [] };
  try {
    const raw = await kv.get(INDEX_KEY);
    return cleanIndex(raw ? JSON.parse(raw) : null);
  } catch {
    return { version: 1, pages: [] };
  }
}

async function writeIndex(kv: Kv, index: MaisonIndex) {
  await kv.put(INDEX_KEY, JSON.stringify(index));
}

async function readPage(kv: Kv | undefined, slug: string): Promise<MaisonPage | null> {
  if (!kv) return null;
  try {
    const raw = await kv.get(pageKey(slug));
    return raw ? cleanPage(JSON.parse(raw), slug) : null;
  } catch {
    return null;
  }
}

async function artistFrom(request: Request) {
  const { address, signature } = readAtelierAuth(request);
  return verifyArtistSig(address, signature);
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  const url = new URL(context.request.url);
  const slug = url.searchParams.get('slug')?.trim().toLowerCase() || '';
  const guestKey = url.searchParams.get('k')?.trim() || '';
  const artist = await artistFrom(context.request);

  if (!slug) {
    if (!artist) return json({ ok: false, error: 'unauthorized' }, 401);
    const index = await readIndex(kv);
    return json({ ok: true, pages: index.pages });
  }

  const page = await readPage(kv, slug);
  if (!page) return json({ ok: false, error: 'missing' }, 404);

  if (artist) return json({ ok: true, page });

  if (page.status === 'draft' || page.guestKey !== guestKey) {
    return json({ ok: false, error: 'private' }, 404);
  }
  const { guestKey: _hidden, ...safe } = page;
  return json({ ok: true, page: safe });
};

export const onRequestPut = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);

  let body: { address?: string; signature?: string; page?: unknown } = {};
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const artist = await verifyArtistSig(body.address ?? null, body.signature ?? null);
  if (!artist) return json({ ok: false, error: 'unauthorized' }, 401);

  const existingSlug =
    body.page && typeof body.page === 'object' ? String((body.page as { slug?: string }).slug || '') : '';
  const previous = existingSlug ? await readPage(kv, existingSlug) : null;
  const page = cleanPage(body.page, previous?.slug);
  if (!page) return json({ ok: false, error: 'invalid_page' }, 400);
  if (previous?.guestKey) page.guestKey = previous.guestKey;
  if (!page.blocks.length) page.blocks = emptyPage(page.slug).blocks;
  page.updatedAt = new Date().toISOString();

  await kv.put(pageKey(page.slug), JSON.stringify(page));
  const index = await readIndex(kv);
  const next = index.pages.filter((p) => p.slug !== page.slug);
  next.unshift(indexItem(page));
  await writeIndex(kv, { version: 1, pages: next });
  return json({ ok: true, page });
};

export const onRequestDelete = async (context: { request: Request; env: Env }) => {
  const kv = context.env.GARDEN_EGG;
  if (!kv) return json({ ok: false, error: 'unavailable' }, 503);

  const artist = await artistFrom(context.request);
  if (!artist) return json({ ok: false, error: 'unauthorized' }, 401);

  const slug = new URL(context.request.url).searchParams.get('slug')?.trim().toLowerCase() || '';
  if (!slug) return json({ ok: false, error: 'invalid_slug' }, 400);

  await kv.delete(pageKey(slug));
  const index = await readIndex(kv);
  await writeIndex(kv, { version: 1, pages: index.pages.filter((p) => p.slug !== slug) });
  return json({ ok: true });
};
