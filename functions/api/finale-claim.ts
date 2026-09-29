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
};

const RESERVE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

/** Roster code → owner wallet (must match site config). */
const CODE_OWNERS: Record<string, string> = {
  'AFB-YEN-01-A4B7': '0x38f55f77ce4087e1c3fbf4873fec69f2a2c2037e',
  'AFB-ROBBIE-01-C9F2': '0x4b3dcc15a8ab43128210fe3327bc830c36a15541',
  'AFB-ROBBIE-02-E3A1': '0x4b3dcc15a8ab43128210fe3327bc830c36a15541',
  'AFB-ROBBIE-03-F8D6': '0x4b3dcc15a8ab43128210fe3327bc830c36a15541',
  'AFB-GEOFF-01-B5C3': '0xc58adc6945966c04c74efc5a045fec55a03685bf',
  'AFB-GEOFF-02-D7A4': '0xc58adc6945966c04c74efc5a045fec55a03685bf',
  'AFB-LIETTE-01-F2E8': '0x3d85e3b4bb7cfc6225110e3a9c2c35a5b7e97810',
  'AFB-LIETTE-02-A9C1': '0x3d85e3b4bb7cfc6225110e3a9c2c35a5b7e97810',
  'AFB-MAVV-01-E4B7': '0xcc3bcddc1bf219a88e28c2f400f4a30a466f42c7',
  'AFB-MICHAEL-01-D3F2': '0x173820fc6e6f8d4f85a7a7e186e5852e1b4a968d',
  'AFB-RIP-01-B8A4': '0x121fded4df77dedca7f7ae13dc2995d64b421e1e',
  'AFB-NIKX-01-C5E9': '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
  'AFB-NIKX-02-F1A3': '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
  'AFB-NIKX-03-D7B2': '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
  'AFB-NIKX-04-E8F6': '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
  'AFB-NIKX-05-A2C4': '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
  'AFB-NIKX-06-B9D1': '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
  'AFB-NIKX-07-F4E7': '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
  'AFB-VANTA-01-A3C9': '0x50221b1df389649721f16df208f820138615f487',
  'AFB-VANTA-02-E7B2': '0x50221b1df389649721f16df208f820138615f487',
  'AFB-MARTIN-01-D8F4': '0x094e7af740db3c79dd47a9594d6dedbf1607d9d2',
};

const PERMANENT_CLAIMED = new Set([
  'AFB-VANTA-01-A3C9',
  'AFB-VANTA-02-E7B2',
  'AFB-RIP-01-B8A4',
  'AFB-GEOFF-01-B5C3',
  'AFB-GEOFF-02-D7A4',
]);

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

function codesForWallet(wallet: string): string[] {
  return Object.entries(CODE_OWNERS)
    .filter(([, w]) => w === wallet)
    .map(([c]) => c);
}

function permanentForWallet(wallet: string): string[] {
  return codesForWallet(wallet).filter((c) => PERMANENT_CLAIMED.has(c));
}

async function snapshot(kv: KVNamespace, wallet: string) {
  const index = await readWalletIndex(kv, wallet);
  const permanent = permanentForWallet(wallet);
  const used = Array.from(new Set([...permanent, ...index.used]));
  const pending = index.pending.filter((c) => !used.includes(c));
  const allotted = codesForWallet(wallet).length;
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

  const snap = await snapshot(kv, wallet);
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

  if (action === 'status') {
    return json({ ok: true, ...(await snapshot(kv, wallet)) });
  }

  if (!code) return json({ ok: false, error: 'invalid_code' }, 400);

  // Permanent config claims are always confirmed
  if (PERMANENT_CLAIMED.has(code)) {
    const owner = CODE_OWNERS[code];
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
      ...(await snapshot(kv, wallet)),
    });
  }

  const owner = CODE_OWNERS[code];
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
        ...(await snapshot(kv, wallet)),
      }, 409);
    }
    if (fresh?.status === 'reserved' && fresh.wallet !== wallet) {
      return json({
        ok: false,
        error: 'reserved_elsewhere',
        status: 'reserved',
        ...(await snapshot(kv, wallet)),
      }, 409);
    }

    // Allotment cap: confirmed used cannot exceed roster size for VIP
    const allotted = owner ? codesForWallet(wallet).length : 99;
    if (allotted > 0 && index.used.length >= allotted && !index.used.includes(code)) {
      return json({
        ok: false,
        error: 'allotment_exhausted',
        ...(await snapshot(kv, wallet)),
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
    return json({ ok: true, status: 'reserved', ...(await snapshot(kv, wallet)) });
  }

  if (action === 'confirm') {
    if (fresh?.status === 'confirmed') {
      // Idempotent success
      if (!index.used.includes(code)) {
        index.used.push(code);
        index.pending = index.pending.filter((c) => c !== code);
        await writeWalletIndex(kv, wallet, index);
      }
      return json({ ok: true, status: 'confirmed', ...(await snapshot(kv, wallet)) });
    }
    if (fresh?.status === 'reserved' && fresh.wallet !== wallet) {
      return json({ ok: false, error: 'reserved_elsewhere', status: 'reserved' }, 409);
    }

    const allotted = owner ? codesForWallet(wallet).length : 99;
    if (allotted > 0 && index.used.length >= allotted && !index.used.includes(code)) {
      return json({
        ok: false,
        error: 'allotment_exhausted',
        ...(await snapshot(kv, wallet)),
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
    return json({ ok: true, status: 'confirmed', ...(await snapshot(kv, wallet)) });
  }

  if (action === 'release') {
    if (fresh?.status === 'confirmed') {
      return json({
        ok: false,
        error: 'already_confirmed',
        status: 'confirmed',
        ...(await snapshot(kv, wallet)),
      }, 409);
    }
    if (fresh?.status === 'reserved' && fresh.wallet !== wallet) {
      return json({ ok: false, error: 'reserved_elsewhere' }, 403);
    }
    await kv.delete(codeKey(code));
    index.pending = index.pending.filter((c) => c !== code);
    await writeWalletIndex(kv, wallet, index);
    return json({ ok: true, status: 'released', ...(await snapshot(kv, wallet)) });
  }

  return json({ ok: false, error: 'unknown_action' }, 400);
};
