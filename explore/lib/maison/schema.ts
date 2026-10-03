import { PAIR_ALPHABET } from '../pairCode';
import { createBlock, isMaisonKind, maisonKind } from './registry';
import type { MaisonBlock, MaisonIndex, MaisonIndexItem, MaisonPage, MaisonStatus } from './types';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES: MaisonStatus[] = ['draft', 'private', 'published'];

export function newGuestKey() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += PAIR_ALPHABET[b % PAIR_ALPHABET.length];
  return out;
}

export function cleanSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length < 2 || s.length > 48 || !SLUG_RE.test(s)) return null;
  return s;
}

function clip(value: unknown, max: number) {
  return String(value ?? '').replace(/\0/g, '').slice(0, max);
}

function cleanWorkIds(raw: unknown, max: number) {
  if (!Array.isArray(raw)) return [] as string[];
  const out: string[] = [];
  for (const item of raw) {
    const id = String(item ?? '').trim().slice(0, 80);
    if (!id || out.includes(id)) continue;
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function cleanWallet(raw: unknown) {
  const t = String(raw ?? '').trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? t : '';
}

export function cleanBlock(raw: unknown): MaisonBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isMaisonKind(String(r.kind ?? ''))) return null;
  const kind = r.kind as MaisonBlock['kind'];
  const def = maisonKind(kind);
  if (!def) return null;
  const id =
    typeof r.id === 'string' && r.id.trim()
      ? r.id.trim().slice(0, 64)
      : createBlock(kind).id;
  const src = r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : r;
  const data: Record<string, unknown> = { ...def.defaults };
  for (const field of def.fields) {
    if (field.kind === 'works') data[field.key] = cleanWorkIds(src[field.key], field.max ?? 8);
    else if (field.kind === 'wallet') data[field.key] = cleanWallet(src[field.key]);
    else data[field.key] = clip(src[field.key], field.max ?? 400);
  }
  return { id, kind, data };
}

export function cleanPage(raw: unknown, fallbackSlug?: string): MaisonPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const slug = cleanSlug(r.slug) || (fallbackSlug ? cleanSlug(fallbackSlug) : null);
  if (!slug) return null;
  const status = STATUSES.includes(r.status as MaisonStatus) ? (r.status as MaisonStatus) : 'draft';
  const blocks: MaisonBlock[] = [];
  const list = Array.isArray(r.blocks) ? r.blocks : [];
  for (const item of list) {
    const block = cleanBlock(item);
    if (block) blocks.push(block);
    if (blocks.length >= 40) break;
  }
  const guestKey =
    typeof r.guestKey === 'string' && r.guestKey.trim()
      ? r.guestKey.trim().slice(0, 16)
      : newGuestKey();
  return {
    version: 1,
    slug,
    title: clip(r.title, 120) || slug,
    kicker: clip(r.kicker, 80),
    status,
    guestKey,
    blocks,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  };
}

export function emptyPage(slug: string, title = ''): MaisonPage {
  return {
    version: 1,
    slug,
    title: title || slug,
    kicker: '',
    status: 'draft',
    guestKey: newGuestKey(),
    blocks: [createBlock('lead')],
    updatedAt: new Date().toISOString(),
  };
}

export function indexItem(page: MaisonPage): MaisonIndexItem {
  return { slug: page.slug, title: page.title, status: page.status, updatedAt: page.updatedAt };
}

export function cleanIndex(raw: unknown): MaisonIndex {
  const empty: MaisonIndex = { version: 1, pages: [] };
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as MaisonIndex;
  if (!Array.isArray(r.pages)) return empty;
  const pages: MaisonIndexItem[] = [];
  const seen = new Set<string>();
  for (const item of r.pages) {
    const slug = cleanSlug(item?.slug);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    pages.push({
      slug,
      title: clip(item.title, 120) || slug,
      status: STATUSES.includes(item.status) ? item.status : 'draft',
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
    });
  }
  pages.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return { version: 1, pages };
}
