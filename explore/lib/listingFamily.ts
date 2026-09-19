/** Group studio tokens so Panel 03s / edition sets can be listed as a family. */

export type ListingFamily = { id: string; label: string };

export function listingFamily(title: string): ListingFamily {
  const t = title.trim();
  const panel = t.match(/panel\s*0*(\d+)/i);
  if (panel && /will\s*it/i.test(t)) {
    const n = String(panel[1]).padStart(2, '0');
    return { id: `will-it-panel-${n}`, label: `Will It.. · Panel ${n}` };
  }
  const fragment = t.match(/^fragment\s*(?:0*(\d{1,2})|([ivxlcdm]+))\b/i);
  if (fragment) {
    const n = fragment[1]
      ? Number(fragment[1])
      : ({
          i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
          xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18,
          xix: 19, xx: 20, xxi: 21, xxii: 22, xxiii: 23, xxiv: 24, xxv: 25, xxvi: 26,
          xxvii: 27,
        } as Record<string, number>)[fragment[2].toLowerCase()];
    if (n) {
      const pad = String(n).padStart(2, '0');
      return { id: `fragment-${pad}`, label: `Fragment ${pad}` };
    }
  }
  const base = t
    .replace(/\s*[|·]\s*/g, ' ')
    .replace(/\s*#\s*\d+\s*\/\s*\d+\s*$/i, '')
    .trim();
  const slug =
    (base || t)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'work';
  return { id: slug, label: base || t };
}

export function familyLiveCount(
  familyId: string,
  works: { title: string; listing?: unknown }[],
): number {
  return works.filter((w) => listingFamily(w.title).id === familyId && w.listing).length;
}
