/**
 * Durable finale claim ledger (Cloudflare KV).
 * Protects mint counts across browsers: reserve → confirm on success → release on fail.
 *
 * GET  /api/finale-claim?wallet=0x…
 * POST /api/finale-claim  { action, wallet, code, source?, instanceId?, attemptId? }
 */

type CodeStatus = 'reserved' | 'confirmed';

type CodeRecord = {
  status: CodeStatus;
  wallet: string;
  at: number;
  expiresAt?: number;
  attemptId?: string;
  source?: string;
  instanceId?: string;
};

type Env = {
  FINALE_CLAIMS?: KVNamespace;
  /** JSON map of CODE → owner wallet. Prefer Pages secret; KV `finale:roster` is fallback. */
  FINALE_CLAIM_ROSTER?: string;
  /** JSON array of permanently burned codes. KV `finale:claimed-codes` is fallback. */
  FINALE_CLAIMED_CODES?: string;
};

const RESERVE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

type Roster = Record<string, string>;

function parseRoster(raw: string | null | undefined): Roster | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Roster = {};
    for (const [k, v] of Object.entries(parsed)) {
      const code = String(k).trim().toUpperCase();
      const wallet = String(v || '').trim().toLowerCase();
      if (code.length >= 6 && /^0x[a-f0-9]{40}$/.test(wallet)) out[code] = wallet;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

function parseBurned(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c) => String(c).trim().toUpperCase())
      .filter((c) => c.length >= 6);
  } catch {
    return [];
  }
}

async function loadRoster(env: Env): Promise<Roster> {
  const fromEnv = parseRoster(env.FINALE_CLAIM_ROSTER);
  if (fromEnv) return fromEnv;
  if (!env.FINALE_CLAIMS) return {};
  try {
    return parseRoster(await env.FINALE_CLAIMS.get('finale:roster')) || {};
  } catch {
    return {};
  }
}

async function loadBurned(env: Env): Promise<Set<string>> {
  const fromEnv = parseBurned(env.FINALE_CLAIMED_CODES);
  if (fromEnv.length) return new Set(fromEnv);
  if (!env.FINALE_CLAIMS) return new Set();
  try {
    return new Set(parseBurned(await env.FINALE_CLAIMS.get('finale:claimed-codes')));
  } catch {
    return new Set();
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function normalizeWallet(w: string | null | undefined): string | null {
  if (!w) return null;
  const t = String(w).trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(t)) return null;
  return t;
}

function normalizeCode(c: string | null | undefined): string | null {
  if (!c) return null;
  const t = String(c).trim().toUpperCase();
  return t.length >= 6 ? t : null;
}

function codeKey(code: string) {
  return `code:${code}`;
}

function walletKey(wallet: string) {
  return `wallet:${wallet}`;
}

async function readCode(kv: KVNamespace, code: string): Promise<CodeRecord | null> {
  try {
    const raw = await kv.get(codeKey(code));
    if (!raw) return null;
    return JSON.parse(raw) as CodeRecord;
  } catch {
    return null;
  }
}

async function writeCode(kv: KVNamespace, code: string, rec: CodeRecord): Promise<void> {
  const ttl =
    rec.status === 'reserved' && rec.expiresAt
      ? Math.max(60, Math.ceil((rec.expiresAt - Date.now()) / 1000))
      : undefined;
  await kv.put(codeKey(code), JSON.stringify(rec), ttl ? { expirationTtl: ttl } : undefined);
}

async function readWalletIndex(
  kv: KVNamespace,
  wallet: string,
): Promise<{ used: string[]; pending: string[] }> {
  try {
    const raw = await kv.get(walletKey(wallet));
    if (!raw) return { used: [], pending: [] };
    const parsed = JSON.parse(raw) as { used?: string[]; pending?: string[] };
    return {
      used: Array.isArray(parsed.used) ? parsed.used.map((c) => c.toUpperCase()) : [],
      pending: Array.isArray(parsed.pending) ? parsed.pending.map((c) => c.toUpperCase()) : [],
    };
  } catch {
    return { used: [], pending: [] };
  }
}

async function writeWalletIndex(
  kv: KVNamespace,
  wallet: string,
  index: { used: string[]; pending: string[] },
): Promise<void> {
  const used = Array.from(new Set(index.used.map((c) => c.toUpperCase())));
  const pending = Array.from(
    new Set(index.pending.map((c) => c.toUpperCase()).filter((c) => !used.includes(c))),
  );
  await kv.put(walletKey(wallet), JSON.stringify({ used, pending, at: Date.now() }));
}

function codesForWallet(roster: Roster, wallet: string): string[] {
  return Object.entries(roster)
    .filter(([, w]) => w === wallet)
    .map(([c]) => c);
}

function permanentForWallet(roster: Roster, burned: Set<string>, wallet: string): string[] {
  return codesForWallet(roster, wallet).filter((c) => burned.has(c));
}

async function snapshot(kv: KVNamespace, wallet: string, roster: Roster, burned: Set<string>) {
  const index = await readWalletIndex(kv, wallet);
  const permanent = permanentForWallet(roster, burned, wallet);
  const used = Array.from(new Set([...permanent, ...index.used]));
  const pending = index.pending.filter((c) => !used.includes(c));
  const allotted = codesForWallet(roster, wallet).length;
  return {
    wallet,
    allotted,
    used,
    pending,
    remaining: Math.max(0, allotted - used.length),
  };
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const kv = context.env.FINALE_CLAIMS;
  if (!kv) return json({ ok: false, error: 'ledger_unavailable' }, 503);

  const url = new URL(context.request.url);
  const wallet = normalizeWallet(url.searchParams.get('wallet'));
  if (!wallet) return json({ ok: false, error: 'invalid_wallet' }, 400);

  const roster = await loadRoster(context.env);
  if (!Object.keys(roster).length) return json({ ok: false, error: 'roster_unavailable' }, 503);
  const burned = await loadBurned(context.env);
  const snap = await snapshot(kv, wallet, roster, burned);
  return json({ ok: true, ...snap });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const kv = context.env.FINALE_CLAIMS;
  if (!kv) return json({ ok: false, error: 'ledger_unavailable' }, 503);

  let body: {
    action?: string;
    wallet?: string;
    code?: string;
    source?: string;
    instanceId?: string;
    attemptId?: string;
  };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const action = (body.action || '').toLowerCase();
  const wallet = normalizeWallet(body.wallet);
  const code = normalizeCode(body.code);

  if (!wallet) return json({ ok: false, error: 'invalid_wallet' }, 400);
  if (!code && action !== 'status') return json({ ok: false, error: 'invalid_code' }, 400);

  const roster = await loadRoster(context.env);
  if (!Object.keys(roster).length) return json({ ok: false, error: 'roster_unavailable' }, 503);
  const burned = await loadBurned(context.env);

  if (action === 'status') {
    return json({ ok: true, ...(await snapshot(kv, wallet, roster, burned)) });
  }

  if (!code) return json({ ok: false, error: 'invalid_code' }, 400);

  // Permanent config claims are always confirmed
  if (burned.has(code)) {
    const owner = roster[code];
    if (owner && owner !== wallet) {
      return json({ ok: false, error: 'wrong_wallet', status: 'confirmed' }, 403);
    }
    const index = await readWalletIndex(kv, wallet);
    if (!index.used.includes(code)) {
      index.used.push(code);
      index.pending = index.pending.filter((c) => c !== code);
      await writeWalletIndex(kv, wallet, index);
    }
    await writeCode(kv, code, {
      status: 'confirmed',
      wallet: owner || wallet,
      at: Date.now(),
      source: 'permanent',
    });
    return json({
      ok: true,
      status: 'confirmed',
      permanent: true,
      ...(await snapshot(kv, wallet, roster, burned)),
    });
  }

  const owner = roster[code];
  // Unknown codes: allow confirm for multi-set freeform, but still ledger them
  if (owner && owner !== wallet) {
    return json({ ok: false, error: 'wrong_wallet', owner }, 403);
  }

  const existing = await readCode(kv, code);
  const index = await readWalletIndex(kv, wallet);
  const now = Date.now();

  // Expired reservation cleanup
  if (
    existing?.status === 'reserved' &&
    existing.expiresAt &&
    existing.expiresAt < now
  ) {
    await kv.delete(codeKey(code));
    if (existing.wallet) {
      const other = await readWalletIndex(kv, existing.wallet);
      other.pending = other.pending.filter((c) => c !== code);
      await writeWalletIndex(kv, existing.wallet, other);
    }
  }

  const fresh = await readCode(kv, code);

  if (action === 'reserve') {
    if (fresh?.status === 'confirmed') {
      return json({
        ok: false,
        error: 'already_confirmed',
        status: 'confirmed',
        ...(await snapshot(kv, wallet, roster, burned)),
      }, 409);
    }
    if (fresh?.status === 'reserved' && fresh.wallet !== wallet) {
      return json({
        ok: false,
        error: 'reserved_elsewhere',
        status: 'reserved',
        ...(await snapshot(kv, wallet, roster, burned)),
      }, 409);
    }

    // Allotment cap: confirmed used cannot exceed roster size for VIP
    const allotted = owner ? codesForWallet(roster, wallet).length : 99;
    if (allotted > 0 && index.used.length >= allotted && !index.used.includes(code)) {
      return json({
        ok: false,
        error: 'allotment_exhausted',
        ...(await snapshot(kv, wallet, roster, burned)),
      }, 409);
    }

    const rec: CodeRecord = {
      status: 'reserved',
      wallet,
      at: now,
      expiresAt: now + RESERVE_TTL_MS,
      attemptId: body.attemptId,
      source: body.source || 'reserve',
      instanceId: body.instanceId,
    };
    await writeCode(kv, code, rec);
    if (!index.pending.includes(code) && !index.used.includes(code)) {
      index.pending.push(code);
    }
    await writeWalletIndex(kv, wallet, index);
    return json({ ok: true, status: 'reserved', ...(await snapshot(kv, wallet, roster, burned)) });
  }

  if (action === 'confirm') {
    if (fresh?.status === 'confirmed') {
      // Idempotent success
      if (!index.used.includes(code)) {
        index.used.push(code);
        index.pending = index.pending.filter((c) => c !== code);
        await writeWalletIndex(kv, wallet, index);
      }
      return json({ ok: true, status: 'confirmed', ...(await snapshot(kv, wallet, roster, burned)) });
    }
    if (fresh?.status === 'reserved' && fresh.wallet !== wallet) {
      return json({ ok: false, error: 'reserved_elsewhere', status: 'reserved' }, 409);
    }

    const allotted = owner ? codesForWallet(roster, wallet).length : 99;
    if (allotted > 0 && index.used.length >= allotted && !index.used.includes(code)) {
      return json({
        ok: false,
        error: 'allotment_exhausted',
        ...(await snapshot(kv, wallet, roster, burned)),
      }, 409);
    }

    const rec: CodeRecord = {
      status: 'confirmed',
      wallet,
      at: now,
      attemptId: body.attemptId || fresh?.attemptId,
      source: body.source || 'confirm',
      instanceId: body.instanceId || fresh?.instanceId,
    };
    await writeCode(kv, code, rec);
    if (!index.used.includes(code)) index.used.push(code);
    index.pending = index.pending.filter((c) => c !== code);
    await writeWalletIndex(kv, wallet, index);
    return json({ ok: true, status: 'confirmed', ...(await snapshot(kv, wallet, roster, burned)) });
  }

  if (action === 'release') {
    if (fresh?.status === 'confirmed') {
      return json({
        ok: false,
        error: 'already_confirmed',
        status: 'confirmed',
        ...(await snapshot(kv, wallet, roster, burned)),
      }, 409);
    }
    if (fresh?.status === 'reserved' && fresh.wallet !== wallet) {
      return json({ ok: false, error: 'reserved_elsewhere' }, 403);
    }
    await kv.delete(codeKey(code));
    index.pending = index.pending.filter((c) => c !== code);
    await writeWalletIndex(kv, wallet, index);
    return json({ ok: true, status: 'released', ...(await snapshot(kv, wallet, roster, burned)) });
  }

  return json({ ok: false, error: 'unknown_action' }, 400);
};
