import type { ExploreWork } from '../config/catalog';

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function canonicalSlug(work: ExploreWork): string {
  if (work.pieceNumber != null) {
    return `fragment-${String(work.pieceNumber).padStart(2, '0')}`;
  }
  const fromTitle = slugifyTitle(work.title);
  if (fromTitle && fromTitle.length > 1) return fromTitle;
  return work.id;
}

export function allWorkSlugs(work: ExploreWork): string[] {
  const set = new Set<string>([canonicalSlug(work), work.id]);
  if (work.pieceNumber != null) {
    const n = String(work.pieceNumber);
    const pad = n.padStart(2, '0');
    set.add(`fragment-${pad}`);
    set.add(`fragment-${n}`);
    set.add(pad);
    set.add(n);
  }
  const titled = slugifyTitle(work.title);
  if (titled) set.add(titled);
  return [...set];
}

export function findWorkBySlug(works: ExploreWork[], slug: string): ExploreWork | undefined {
  const s = decodeURIComponent(slug).trim().toLowerCase();
  if (!s) return undefined;
  return works.find((w) => allWorkSlugs(w).some((x) => x.toLowerCase() === s));
}
