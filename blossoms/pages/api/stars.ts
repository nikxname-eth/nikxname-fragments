import type { NextApiRequest, NextApiResponse } from 'next';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const config = {
  api: { bodyParser: { sizeLimit: '800kb' } },
};

const DIR = path.join(process.cwd(), 'studio-stars');
const INDEX = path.join(DIR, 'library.json');
const MAX = 48;

type DiskStar = {
  id: string;
  seed: number;
  stars: number;
  note: string;
  mode: string;
  family: string;
  ground: string;
  flow?: string;
  harmony?: string;
  rarity?: number;
  at: number;
  file: string;
};

type Library = { updated: number; items: DiskStar[]; wipe?: boolean };

async function loadLib(): Promise<Library> {
  try {
    const raw = await readFile(INDEX, 'utf8');
    const parsed = JSON.parse(raw) as Library;
    if (!parsed || !Array.isArray(parsed.items)) return { updated: 0, items: [] };
    return parsed;
  } catch {
    return { updated: 0, items: [] };
  }
}

async function saveLib(lib: Library) {
  await mkdir(DIR, { recursive: true });
  await writeFile(INDEX, JSON.stringify(lib, null, 2));
}

async function removeFile(file: string) {
  try {
    await unlink(path.join(DIR, file));
  } catch {
    /* missing */
  }
}

function cap(items: DiskStar[]): DiskStar[] {
  if (items.length <= MAX) return items;
  const ranked = [...items].sort((a, b) => a.stars - b.stars || a.at - b.at);
  return items.filter((s) => !ranked.slice(0, items.length - MAX).some((d) => d.id === s.id));
}

function jpegFromDataUrl(thumb: unknown): Buffer | null {
  if (typeof thumb !== 'string') return null;
  const m = thumb.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) return null;
  try {
    return Buffer.from(m[1].replace(/\s/g, ''), 'base64');
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const lib = await loadLib();
    const withThumbs = String(req.query.thumbs ?? '') === '1';
    if (!withThumbs) {
      res.status(200).json({ ok: true, count: lib.items.length, items: lib.items, wipe: !!lib.wipe });
      return;
    }
    const items = [];
    for (const it of lib.items) {
      let thumb = '';
      try {
        const buf = await readFile(path.join(DIR, it.file));
        if (buf.length > 200) thumb = `data:image/jpeg;base64,${buf.toString('base64')}`;
      } catch {
        /* missing jpeg */
      }
      items.push({ ...it, thumb });
    }
    res.status(200).json({ ok: true, count: items.length, items, wipe: !!lib.wipe });
    return;
  }

  if (req.method === 'DELETE') {
    const id = String(req.body?.id ?? req.query.id ?? '');
    if (!id) {
      res.status(400).json({ ok: false });
      return;
    }
    const lib = await loadLib();
    const gone = lib.items.find((s) => s.id === id);
    const items = lib.items.filter((s) => s.id !== id);
    if (gone) await removeFile(gone.file);
    await saveLib({ updated: Date.now(), items });
    res.status(200).json({ ok: true, count: items.length });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const body = req.body as Partial<DiskStar> & { thumb?: string; drop?: boolean; wipe?: boolean };
  if (body.wipe) {
    const lib = await loadLib();
    for (const it of lib.items) await removeFile(it.file);
    await saveLib({ updated: Date.now(), items: [], wipe: true });
    res.status(200).json({ ok: true, count: 0, wipe: true });
    return;
  }
  if (body.drop && body.id) {
    const lib = await loadLib();
    const gone = lib.items.find((s) => s.id === body.id);
    const items = lib.items.filter((s) => s.id !== body.id);
    if (gone) await removeFile(gone.file);
    await saveLib({ updated: Date.now(), items });
    res.status(200).json({ ok: true, count: items.length });
    return;
  }
  const seed = Number(body.seed);
  const stars = Math.max(1, Math.min(10, Math.round(Number(body.stars))));
  if (!Number.isFinite(seed) || !body.note || !body.mode || !body.family || !body.ground) {
    res.status(400).json({ ok: false });
    return;
  }

  await mkdir(DIR, { recursive: true });
  const lib = await loadLib();
  const id =
    typeof body.id === 'string' && body.id
      ? body.id
      : `${seed.toString(16)}-${Date.now().toString(36)}`;
  const file = `${id.replace(/[^a-z0-9-]/gi, '')}.jpg`;
  const jpeg = jpegFromDataUrl(body.thumb);
  if (jpeg && jpeg.length > 400) {
    await writeFile(path.join(DIR, file), jpeg);
  }

  const row: DiskStar = {
    id,
    seed,
    stars,
    note: String(body.note).slice(0, 400),
    mode: String(body.mode),
    family: String(body.family),
    ground: String(body.ground),
    flow: body.flow ? String(body.flow) : undefined,
    harmony: body.harmony ? String(body.harmony) : undefined,
    rarity: typeof body.rarity === 'number' ? body.rarity : undefined,
    at: Date.now(),
    file,
  };
  const without = lib.items.filter((s) => s.seed !== seed && s.id !== id);
  const dropped = lib.items.filter((s) => s.seed === seed && s.file !== file);
  for (const d of dropped) await removeFile(d.file);
  let items = cap([row, ...without]);
  const keep = new Set(items.map((s) => s.file));
  for (const old of lib.items) {
    if (!keep.has(old.file)) await removeFile(old.file);
  }
  try {
    const names = await readdir(DIR);
    for (const name of names) {
      if (!name.endsWith('.jpg')) continue;
      if (!keep.has(name)) await removeFile(name);
    }
  } catch {
    /* empty dir */
  }
  await saveLib({ updated: Date.now(), items, wipe: false });
  res.status(200).json({ ok: true, id, count: items.length });
}
