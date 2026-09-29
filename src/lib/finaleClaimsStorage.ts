/**
 * Claim-code usage ledger (browser layer):
 * - Permanent claimed list (config) for completed collectors
 * - Confirmed success log (strict success only)
 * - Pending / in-flight reservations (immediate lock on Claim now)
 * - Dual storage + cross-tab sync
 *
 * Permanent codes cannot be restored via “Restore claim codes”.
 * Server KV (via finaleClaimRegistry) is the durable multi-device fallback.
 */

import {
  getPermanentClaimedCodesForWallet,
  isFinaleCodePermanentlyClaimed,
  normalizeWalletAddress,
} from '../config/finale';

const USED_KEY = 'nikxart:finale-used-codes:v1';
const USED_SESSION_KEY = 'nikxart:finale-used-codes:session:v1';
const PENDING_KEY = 'nikxart:finale-pending-codes:v1';
const LOG_KEY = 'nikxart:finale-mint-log:v1';
/** Wallets that have completed at least one successful finale mint (skip intro → viewer). */
const VIEWER_KEY = 'nikxart:finale-viewer-wallets:v1';

const PENDING_TTL_MS = 20 * 60 * 1000;
const CLAIMS_CHANGED_EVENT = 'nikxart:finale-claims-changed';
const BROADCAST_NAME = 'nikxart-finale-claims';

type Store = Record<string, string[]>;

type PendingEntry = {
  wallet: string;
  code: string;
  at: number;
  expiresAt: number;
  attemptId?: string;
  source?: string;
  instanceId?: string;
};

/** Global pending map keyed by CODE (codes are unique on the roster). */
type PendingStore = Record<string, PendingEntry>;

export type FinaleMintLogEntry = {
  wallet: string;
  code: string;
  at: number;
  source?: string;
  /** permanent | local */
  kind?: 'permanent' | 'local';
  attemptId?: string;
  instanceId?: string;
};

export type FinaleClaimSnapshot = {
  wallet: string;
  used: string[];
  pending: string[];
  remaining: number;
  allotted?: number;
};

function emitClaimsChanged(wallet?: string) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(CLAIMS_CHANGED_EVENT, { detail: { wallet: wallet || null } }),
    );
  } catch {
    /* ignore */
  }
  try {
    const bc = new BroadcastChannel(BROADCAST_NAME);
    bc.postMessage({ type: 'claims-changed', wallet: wallet || null, at: Date.now() });
    bc.close();
  } catch {
    /* ignore */
  }
}

export function subscribeFinaleClaimsChanged(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onCustom = () => cb();
  window.addEventListener(CLAIMS_CHANGED_EVENT, onCustom);
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(BROADCAST_NAME);
    bc.onmessage = () => cb();
  } catch {
    bc = null;
  }
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === USED_KEY ||
      e.key === PENDING_KEY ||
      e.key === LOG_KEY ||
      e.key === VIEWER_KEY
    ) {
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CLAIMS_CHANGED_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
    try {
      bc?.close();
    } catch {
      /* ignore */
    }
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

function readStore(): Store {
  const fromLocal = readJson<Store>(USED_KEY, {});
  if (fromLocal && typeof fromLocal === 'object') {
    // Merge session twin (survives some private-mode races)
    try {
      const sess = sessionStorage.getItem(USED_SESSION_KEY);
      if (sess) {
        const parsed = JSON.parse(sess) as Store;
        for (const [w, codes] of Object.entries(parsed || {})) {
          const prev = fromLocal[w] || [];
          fromLocal[w] = mergeUnique(prev, codes);
        }
      }
    } catch {
      /* ignore */
    }
    return fromLocal;
  }
  return {};
}

function writeStore(store: Store) {
  writeJson(USED_KEY, store);
  try {
    sessionStorage.setItem(USED_SESSION_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function readPendingStore(): PendingStore {
  const store = readJson<PendingStore>(PENDING_KEY, {});
  if (!store || typeof store !== 'object') return {};
  const now = Date.now();
  let dirty = false;
  const next: PendingStore = {};
  for (const [code, entry] of Object.entries(store)) {
    if (!entry || typeof entry !== 'object') {
      dirty = true;
      continue;
    }
    if (entry.expiresAt && entry.expiresAt < now) {
      dirty = true;
      continue;
    }
    next[code.toUpperCase()] = {
      ...entry,
      code: code.toUpperCase(),
      wallet: (entry.wallet || '').toLowerCase(),
    };
  }
  if (dirty) writeJson(PENDING_KEY, next);
  return next;
}

function writePendingStore(store: PendingStore) {
  writeJson(PENDING_KEY, store);
}

function readLog(): FinaleMintLogEntry[] {
  const parsed = readJson<FinaleMintLogEntry[]>(LOG_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeLog(entries: FinaleMintLogEntry[]) {
  writeJson(LOG_KEY, entries.slice(-300));
}

function mergeUnique(...lists: string[][]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const c of list) {
      const k = c.trim().toUpperCase();
      if (k) set.add(k);
    }
  }
  return Array.from(set);
}

/**
 * Codes treated as used for this wallet = permanent ledger ∪ local success log.
 */
export function getUsedFinaleCodes(wallet: string | undefined | null): string[] {
  const w = normalizeWalletAddress(wallet);
  if (!w) return [];
  const permanent = getPermanentClaimedCodesForWallet(w);
  const local = readStore()[w] ?? [];
  return mergeUnique(permanent, local);
}

/** In-flight codes (Claim now pressed, awaiting success). */
export function getPendingFinaleCodes(wallet?: string | null): string[] {
  const store = readPendingStore();
  const w = normalizeWalletAddress(wallet);
  return Object.values(store)
    .filter((e) => !w || e.wallet === w)
    .map((e) => e.code.toUpperCase());
}

export function isFinaleCodePending(
  code: string,
  wallet?: string | null,
): boolean {
  const key = code.trim().toUpperCase();
  const entry = readPendingStore()[key];
  if (!entry) return false;
  const w = normalizeWalletAddress(wallet);
  if (w && entry.wallet !== w) return true; // reserved elsewhere still blocks
  return true;
}

/**
 * Immediate lock when Claim now is pressed.
 * Returns false if already used/pending by another wallet.
 */
export function reserveFinaleCodePending(
  wallet: string | undefined | null,
  code: string,
  meta: { attemptId?: string; source?: string; instanceId?: string; ttlMs?: number } = {},
): { ok: boolean; reason?: string } {
  const w = normalizeWalletAddress(wallet);
  const key = code.trim().toUpperCase();
  if (!w || !key) return { ok: false, reason: 'invalid' };

  if (isFinaleCodePermanentlyClaimed(key) || getUsedFinaleCodes(w).includes(key)) {
    return { ok: false, reason: 'already_used' };
  }

  const store = readPendingStore();
  const existing = store[key];
  if (existing && existing.wallet !== w) {
    return { ok: false, reason: 'reserved_elsewhere' };
  }

  const now = Date.now();
  store[key] = {
    wallet: w,
    code: key,
    at: now,
    expiresAt: now + (meta.ttlMs ?? PENDING_TTL_MS),
    attemptId: meta.attemptId,
    source: meta.source,
    instanceId: meta.instanceId,
  };
  writePendingStore(store);
  emitClaimsChanged(w);
  return { ok: true };
}

export function releaseFinaleCodePending(
  wallet: string | undefined | null,
  code: string,
): void {
  const w = normalizeWalletAddress(wallet);
  const key = code.trim().toUpperCase();
  if (!key) return;
  const store = readPendingStore();
  const existing = store[key];
  if (!existing) return;
  if (w && existing.wallet !== w) return;
  delete store[key];
  writePendingStore(store);
  emitClaimsChanged(w || existing.wallet);
}

export function markFinaleCodeUsed(
  wallet: string | undefined | null,
  code: string,
  source = 'success',
  meta: { attemptId?: string; instanceId?: string } = {},
): string[] {
  const w = normalizeWalletAddress(wallet);
  if (!w || !code.trim()) return getUsedFinaleCodes(wallet);
  const key = code.trim().toUpperCase();

  // Drop pending for this code
  releaseFinaleCodePending(w, key);

  // Always append success log (audit trail) + grant viewer access
  const log = readLog();
  const alreadyLogged = log.some(
    (e) => e.wallet === w && e.code === key && Date.now() - e.at < 60_000,
  );
  if (!alreadyLogged) {
    log.push({
      wallet: w,
      code: key,
      at: Date.now(),
      source,
      kind: isFinaleCodePermanentlyClaimed(key) ? 'permanent' : 'local',
      attemptId: meta.attemptId,
      instanceId: meta.instanceId,
    });
    writeLog(log);
  }
  markFinaleViewerAccess(w);

  // Permanent codes are already “used” via config — still return merged list
  if (isFinaleCodePermanentlyClaimed(key)) {
    emitClaimsChanged(w);
    return getUsedFinaleCodes(w);
  }

  const store = readStore();
  const prev = store[w] ?? [];
  if (!prev.includes(key)) {
    store[w] = [...prev, key];
    writeStore(store);
  }
  emitClaimsChanged(w);
  return getUsedFinaleCodes(w);
}

/**
 * Merge remote ledger into local (remote confirmed codes always win).
 * Does not clear local used codes that remote hasn't seen yet (offline confirms).
 */
export function syncRemoteClaimState(
  wallet: string | undefined | null,
  remote: { used?: string[]; pending?: string[] },
): string[] {
  const w = normalizeWalletAddress(wallet);
  if (!w) return [];

  const store = readStore();
  const localUsed = store[w] ?? [];
  const remoteUsed = (remote.used || []).map((c) => c.trim().toUpperCase()).filter(Boolean);
  const merged = mergeUnique(localUsed, remoteUsed);
  store[w] = merged;
  writeStore(store);

  // Align pending: keep local in-flight, add remote pending for this wallet, drop confirmed
  const pendingStore = readPendingStore();
  const usedSet = new Set(mergeUnique(merged, getPermanentClaimedCodesForWallet(w)));
  for (const code of Object.keys(pendingStore)) {
    if (usedSet.has(code)) delete pendingStore[code];
  }
  for (const code of remote.pending || []) {
    const key = code.trim().toUpperCase();
    if (!key || usedSet.has(key)) continue;
    if (!pendingStore[key]) {
      pendingStore[key] = {
        wallet: w,
        code: key,
        at: Date.now(),
        expiresAt: Date.now() + PENDING_TTL_MS,
        source: 'remote-sync',
      };
    }
  }
  writePendingStore(pendingStore);
  emitClaimsChanged(w);
  return getUsedFinaleCodes(w);
}

/** Restore a non-permanent code after a failed tx. Permanent codes stay claimed. */
export function unmarkFinaleCodeUsed(
  wallet: string | undefined | null,
  code: string,
): string[] {
  const w = normalizeWalletAddress(wallet);
  if (!w || !code.trim()) return getUsedFinaleCodes(wallet);
  const key = code.trim().toUpperCase();
  if (isFinaleCodePermanentlyClaimed(key)) return getUsedFinaleCodes(w);

  // Never unmark if still in success log as remote-confirmed style sources
  const log = readLog();
  const remoteConfirmed = log.some(
    (e) =>
      e.wallet === w &&
      e.code === key &&
      (e.source || '').includes('remote') &&
      Date.now() - e.at < 1000 * 60 * 60 * 24 * 30,
  );
  if (remoteConfirmed) return getUsedFinaleCodes(w);

  const store = readStore();
  const prev = store[w] ?? [];
  store[w] = prev.filter((c) => c !== key);
  writeStore(store);
  emitClaimsChanged(w);
  return getUsedFinaleCodes(w);
}

/**
 * Clear browser-local used marks only.
 * Permanently claimed (Vanta / RIP / Geoff) always remain claimed.
 * Does not clear remote KV — hydrate will re-apply server used codes.
 */
export function clearUsedFinaleCodes(wallet: string | undefined | null): void {
  const w = normalizeWalletAddress(wallet);
  if (!w) {
    try {
      localStorage.removeItem(USED_KEY);
      sessionStorage.removeItem(USED_SESSION_KEY);
    } catch {
      /* ignore */
    }
    emitClaimsChanged();
    return;
  }
  const store = readStore();
  delete store[w];
  writeStore(store);
  // Clear only this wallet's pending
  const pending = readPendingStore();
  for (const [code, entry] of Object.entries(pending)) {
    if (entry.wallet === w) delete pending[code];
  }
  writePendingStore(pending);
  emitClaimsChanged(w);
}

export function clearAllUsedFinaleCodes(): void {
  try {
    localStorage.removeItem(USED_KEY);
    sessionStorage.removeItem(USED_SESSION_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
  emitClaimsChanged();
}

/** Full mint success log for this browser (for debugging / support). */
export function getFinaleMintLog(wallet?: string | null): FinaleMintLogEntry[] {
  const log = readLog();
  const w = normalizeWalletAddress(wallet);
  if (!w) return log;
  return log.filter((e) => e.wallet === w);
}

export function getPermanentClaimedCount(wallet: string | undefined | null): number {
  return getPermanentClaimedCodesForWallet(wallet).length;
}

function readViewerWallets(): string[] {
  const parsed = readJson<string[]>(VIEWER_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeViewerWallets(list: string[]) {
  writeJson(VIEWER_KEY, list);
}

/** Record wallet after a successful claim — next visit skips intro to the viewer. */
export function markFinaleViewerAccess(wallet: string | undefined | null): void {
  const w = normalizeWalletAddress(wallet);
  if (!w) return;
  const list = readViewerWallets();
  if (list.includes(w)) return;
  writeViewerWallets([...list, w]);
  emitClaimsChanged(w);
}

/**
 * True if this wallet has claimed (local log, permanent ledger, or viewer flag).
 * Site opens straight to the Blossom viewer for these wallets.
 */
export function hasFinaleViewerAccess(wallet: string | undefined | null): boolean {
  const w = normalizeWalletAddress(wallet);
  if (!w) return false;
  if (readViewerWallets().includes(w)) return true;
  if (getUsedFinaleCodes(w).length > 0) return true;
  if (getPermanentClaimedCodesForWallet(w).length > 0) return true;
  return false;
}

// Ensure permanent claimants always have viewer access recorded
export function ensurePermanentViewerAccess(wallet: string | undefined | null): void {
  const w = normalizeWalletAddress(wallet);
  if (!w) return;
  if (getPermanentClaimedCodesForWallet(w).length > 0) {
    markFinaleViewerAccess(w);
  }
}
