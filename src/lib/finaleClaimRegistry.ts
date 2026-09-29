/**
 * Finale claim registration — immediate reserve + confirmed consume + remote ledger.
 *
 * Layers:
 *  1) Memory + localStorage + sessionStorage (instant UI lock)
 *  2) Cross-tab BroadcastChannel
 *  3) Cloudflare KV via /api/finale-claim (durable fallback / multi-device)
 */

import {
  getPendingFinaleCodes,
  getUsedFinaleCodes,
  markFinaleCodeUsed,
  markFinaleViewerAccess,
  releaseFinaleCodePending,
  reserveFinaleCodePending,
  syncRemoteClaimState,
  type FinaleClaimSnapshot,
} from './finaleClaimsStorage';
import { normalizeWalletAddress } from '../config/finale';

const API = '/api/finale-claim';

export type ClaimAttemptMeta = {
  source?: string;
  instanceId?: string;
  attemptId?: string;
  rewardId?: string;
};

export type BeginClaimResult =
  | { ok: true; attemptId: string; snapshot: FinaleClaimSnapshot }
  | { ok: false; reason: string; snapshot: FinaleClaimSnapshot };

export type CompleteClaimResult = {
  ok: boolean;
  used: string[];
  remoteOk: boolean;
  snapshot: FinaleClaimSnapshot;
};

function newAttemptId(): string {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function postClaim(body: Record<string, unknown>): Promise<{
  ok: boolean;
  status?: number;
  data?: FinaleClaimSnapshot & { ok?: boolean; error?: string; status?: string };
}> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => ({}))) as FinaleClaimSnapshot & {
      ok?: boolean;
      error?: string;
      status?: string;
    };
    return { ok: res.ok && data.ok !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function fetchRemoteClaimSnapshot(
  wallet: string | undefined | null,
): Promise<FinaleClaimSnapshot | null> {
  const w = normalizeWalletAddress(wallet);
  if (!w) return null;
  try {
    const res = await fetch(`${API}?wallet=${encodeURIComponent(w)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as FinaleClaimSnapshot & { ok?: boolean };
    if (!data || data.ok === false) return null;
    syncRemoteClaimState(w, {
      used: data.used || [],
      pending: data.pending || [],
    });
    return {
      wallet: w,
      used: getUsedFinaleCodes(w),
      pending: getPendingFinaleCodes(w),
      remaining: Math.max(0, (data.allotted ?? 0) - getUsedFinaleCodes(w).length),
      allotted: data.allotted,
    };
  } catch {
    return null;
  }
}

/**
 * Call the moment "Claim now · Free" is pressed.
 * Locks the code immediately locally; mirrors to KV when available.
 */
export async function beginFinaleClaim(
  wallet: string | undefined | null,
  code: string,
  meta: ClaimAttemptMeta = {},
): Promise<BeginClaimResult> {
  const w = normalizeWalletAddress(wallet);
  const key = code.trim().toUpperCase();
  const attemptId = meta.attemptId || newAttemptId();

  const emptySnap = (): FinaleClaimSnapshot => ({
    wallet: w || '',
    used: getUsedFinaleCodes(w),
    pending: getPendingFinaleCodes(w),
    remaining: 0,
  });

  if (!w || !key) {
    return { ok: false, reason: 'missing_wallet_or_code', snapshot: emptySnap() };
  }

  const local = reserveFinaleCodePending(w, key, {
    attemptId,
    source: meta.source || 'claim-start',
    instanceId: meta.instanceId,
  });

  if (!local.ok) {
    return {
      ok: false,
      reason: local.reason || 'local_reserve_failed',
      snapshot: {
        wallet: w,
        used: getUsedFinaleCodes(w),
        pending: getPendingFinaleCodes(w),
        remaining: 0,
      },
    };
  }

  // Fire-and-follow remote (do not block UX if offline — local lock already held)
  const remote = await postClaim({
    action: 'reserve',
    wallet: w,
    code: key,
    attemptId,
    source: meta.source || 'claim-start',
    instanceId: meta.instanceId,
  });

  if (remote.data?.used || remote.data?.pending) {
    syncRemoteClaimState(w, {
      used: remote.data.used || [],
      pending: remote.data.pending || getPendingFinaleCodes(w),
    });
  }

  if (
    remote.status === 409 &&
    (remote.data?.error === 'already_confirmed' || remote.data?.status === 'confirmed')
  ) {
    // Remote already confirmed — treat as used locally
    markFinaleCodeUsed(w, key, 'remote-already-confirmed');
    releaseFinaleCodePending(w, key);
    return {
      ok: false,
      reason: 'already_confirmed',
      snapshot: {
        wallet: w,
        used: getUsedFinaleCodes(w),
        pending: getPendingFinaleCodes(w),
        remaining: 0,
      },
    };
  }

  if (remote.status === 409 && remote.data?.error === 'reserved_elsewhere') {
    releaseFinaleCodePending(w, key);
    return {
      ok: false,
      reason: 'reserved_elsewhere',
      snapshot: {
        wallet: w,
        used: getUsedFinaleCodes(w),
        pending: getPendingFinaleCodes(w),
        remaining: 0,
      },
    };
  }

  if (remote.status === 409 && remote.data?.error === 'allotment_exhausted') {
    releaseFinaleCodePending(w, key);
    return {
      ok: false,
      reason: 'allotment_exhausted',
      snapshot: {
        wallet: w,
        used: getUsedFinaleCodes(w),
        pending: getPendingFinaleCodes(w),
        remaining: 0,
      },
    };
  }

  return {
    ok: true,
    attemptId,
    snapshot: {
      wallet: w,
      used: getUsedFinaleCodes(w),
      pending: getPendingFinaleCodes(w),
      remaining: 0,
    },
  };
}

/**
 * Full mint success — code permanently consumed, viewer access, remote confirm.
 */
export async function completeFinaleClaim(
  wallet: string | undefined | null,
  code: string,
  meta: ClaimAttemptMeta = {},
): Promise<CompleteClaimResult> {
  const w = normalizeWalletAddress(wallet);
  const key = code.trim().toUpperCase();
  if (!w || !key) {
    return {
      ok: false,
      used: [],
      remoteOk: false,
      snapshot: { wallet: '', used: [], pending: [], remaining: 0 },
    };
  }

  // Local first — never lose the success if network flakes
  const used = markFinaleCodeUsed(w, key, meta.source || 'mint-success');
  markFinaleViewerAccess(w);
  releaseFinaleCodePending(w, key);

  const remote = await postClaim({
    action: 'confirm',
    wallet: w,
    code: key,
    attemptId: meta.attemptId,
    source: meta.source || 'mint-success',
    instanceId: meta.instanceId,
  });

  if (remote.data?.used) {
    syncRemoteClaimState(w, {
      used: remote.data.used,
      pending: remote.data.pending || [],
    });
  }

  // Retry confirm once if network failed (mint security)
  let remoteOk = remote.ok;
  if (!remoteOk) {
    await new Promise((r) => setTimeout(r, 800));
    const retry = await postClaim({
      action: 'confirm',
      wallet: w,
      code: key,
      attemptId: meta.attemptId,
      source: `${meta.source || 'mint-success'}:retry`,
      instanceId: meta.instanceId,
    });
    remoteOk = retry.ok;
    if (retry.data?.used) {
      syncRemoteClaimState(w, {
        used: retry.data.used,
        pending: retry.data.pending || [],
      });
    }
  }

  const finalUsed = getUsedFinaleCodes(w);
  return {
    ok: true,
    used: finalUsed.length ? finalUsed : used,
    remoteOk,
    snapshot: {
      wallet: w,
      used: getUsedFinaleCodes(w),
      pending: getPendingFinaleCodes(w),
      remaining: 0,
    },
  };
}

/** Failed / rejected tx — free the code for retry (never if confirmed). */
export async function abortFinaleClaim(
  wallet: string | undefined | null,
  code: string,
  meta: ClaimAttemptMeta = {},
): Promise<void> {
  const w = normalizeWalletAddress(wallet);
  const key = code.trim().toUpperCase();
  if (!w || !key) return;

  // Do not unmark confirmed successes
  const used = getUsedFinaleCodes(w).map((c) => c.toUpperCase());
  if (used.includes(key)) {
    releaseFinaleCodePending(w, key);
    return;
  }

  releaseFinaleCodePending(w, key);

  await postClaim({
    action: 'release',
    wallet: w,
    code: key,
    attemptId: meta.attemptId,
    source: meta.source || 'mint-fail',
    instanceId: meta.instanceId,
  });
}

/** Codes blocked for entry: used + pending + permanent (via used merge). */
export function getBlockedFinaleCodes(wallet: string | undefined | null): string[] {
  const used = getUsedFinaleCodes(wallet);
  const pending = getPendingFinaleCodes(wallet);
  return Array.from(new Set([...used, ...pending].map((c) => c.toUpperCase())));
}
