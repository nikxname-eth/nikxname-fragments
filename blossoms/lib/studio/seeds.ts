const KEY = 'bl-studio-used-seeds';
const MAX = 4000;

function load(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function save(used: Set<number>) {
  try {
    const arr = [...used];
    const trimmed = arr.length > MAX ? arr.slice(arr.length - MAX) : arr;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* private mode */
  }
}

/** Return a seed that has not been used in this browser. */
export function claimUniqueSeed(base: number): number {
  const used = load();
  let s = base >>> 0;
  for (let i = 0; i < 96; i++) {
    if (!used.has(s)) {
      used.add(s);
      save(used);
      return s;
    }
    s = (Math.imul(s ^ (s >>> 16), 0x45d9f3b) + 0x9e3779b9 + i * 9973) >>> 0;
  }
  s = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  used.add(s);
  save(used);
  return s;
}

export function usedSeedCount(): number {
  return load().size;
}
