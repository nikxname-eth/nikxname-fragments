/**
 * GET /api/atelier-collectors
 * Current holders across all Nikxname contracts, with ENS when set.
 * Admin-signed. Same auth as the Atelier book.
 */

import { verifyMessage } from 'viem';
import { ATELIER_MESSAGE, isAtelierAdmin, type AtelierRow } from '../../lib/collectors';
import { NIKX_CONTRACTS } from '../../lib/contracts';

type Env = { GARDEN_EGG?: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> } };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

function normalizeWallet(w: string | null | undefined): string | null {
  if (!w) return null;
  const t = String(w).trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? t : null;
}

async function authorized(address: string | null, signature: string | null) {
  const wallet = normalizeWallet(address);
  if (!wallet || !signature || !isAtelierAdmin(wallet)) return false;
  try {
    return await verifyMessage({
      address: wallet as `0x${string}`,
      message: ATELIER_MESSAGE,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const url = new URL(context.request.url);
  if (!(await authorized(url.searchParams.get('address'), url.searchParams.get('signature')))) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const kv = context.env.GARDEN_EGG;
  const cacheKey = 'atelier:collectors-chain:v1';
  if (kv) {
    try {
      const hit = await kv.get(cacheKey);
      if (hit) return json(JSON.parse(hit));
    } catch {
      /* continue */
    }
  }

  const owners = new Set<string>();
  await Promise.all(
    NIKX_CONTRACTS.map(async (c) => {
      const host = c.chain === 'base' ? 'base-mainnet' : 'eth-mainnet';
      let pageKey: string | undefined;
      for (let i = 0; i < 8; i++) {
        const params = new URLSearchParams({
          contractAddress: c.address,
          withTokenBalances: 'false',
        });
        if (pageKey) params.set('pageKey', pageKey);
        const res = await fetch(
          `https://${host}.g.alchemy.com/nft/v3/demo/getOwnersForContract?${params}`,
        );
        if (!res.ok) break;
        const body = (await res.json()) as { owners?: string[]; pageKey?: string };
        for (const a of body.owners || []) {
          const n = normalizeWallet(a);
          if (n && n !== '0x0000000000000000000000000000000000000000') owners.add(n);
        }
        pageKey = body.pageKey;
        if (!pageKey) break;
      }
    }),
  );

  const list = [...owners];
  const ens = new Map<string, string>();
  for (let i = 0; i < list.length; i += 6) {
    const slice = list.slice(i, i + 6);
    await Promise.all(
      slice.map(async (addr) => {
        const name = await ensName(addr);
        if (name) ens.set(addr, name);
      }),
    );
  }

  const rows: AtelierRow[] = list
    .sort((a, b) => (ens.get(a) || a).localeCompare(ens.get(b) || b))
    .map((address) => {
      const name = ens.get(address);
      return {
        id: address.slice(2, 10),
        address: address as `0x${string}`,
        name: name || 'Collector',
        title: 'Collector',
        kicker: 'Holds Nikxname work',
        lead: 'Works held from the house.',
        admin: false,
        enabled: true,
        notes: '',
        ens: name || '',
      };
    });

  const payload = { ok: true, count: rows.length, rows };
  if (kv) {
    try {
      await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 3600 });
    } catch {
      /* ignore */
    }
  }
  return json(payload);
};

async function ensName(address: string): Promise<string | null> {
  try {
    const res = await fetch(`https://eth.blockscout.com/api/v2/addresses/${address}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ens_domain_name?: string | null };
    const name = body.ens_domain_name?.trim();
    return name && name.includes('.') ? name : null;
  } catch {
    return null;
  }
}
