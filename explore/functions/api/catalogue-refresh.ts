/**
 * POST /api/catalogue-refresh
 * { address, signature, contract, tokenId }
 * Prompts Alchemy (and OpenSea when keyed) to recrawl token metadata.
 */

import { verifyMessage } from 'viem';
import { ATELIER_MESSAGE, isAtelierAdmin } from '../../lib/collectors';

type Env = { OPENSEA_API_KEY?: string };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const body = (await context.request.json().catch(() => null)) as {
    address?: string;
    signature?: string;
    contract?: string;
    tokenId?: string | number;
  } | null;
  const wallet = normalizeWallet(body?.address);
  if (!wallet || !body?.signature || !isAtelierAdmin(wallet)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  try {
    const ok = await verifyMessage({
      address: wallet as `0x${string}`,
      message: ATELIER_MESSAGE,
      signature: body.signature as `0x${string}`,
    });
    if (!ok) return json({ ok: false, error: 'unauthorized' }, 401);
  } catch {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const contract = String(body.contract || '').toLowerCase();
  const tokenId = String(body.tokenId ?? '');
  if (!/^0x[a-f0-9]{40}$/.test(contract) || !tokenId) {
    return json({ ok: false, error: 'bad_token' }, 400);
  }

  const alchemy = await fetch('https://eth-mainnet.g.alchemy.com/nft/v3/demo/refreshNftMetadata', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractAddress: contract, tokenId }),
  });

  let opensea = 0;
  if (context.env.OPENSEA_API_KEY) {
    const res = await fetch(
      `https://api.opensea.io/api/v2/chain/ethereum/contract/${contract}/nfts/${tokenId}/refresh`,
      {
        method: 'POST',
        headers: { accept: 'application/json', 'x-api-key': context.env.OPENSEA_API_KEY },
      },
    );
    opensea = res.status;
  }

  return json({
    ok: alchemy.ok || alchemy.status === 202,
    alchemy: alchemy.status,
    opensea,
  });
};
