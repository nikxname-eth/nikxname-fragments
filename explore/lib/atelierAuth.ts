import { verifyMessage } from 'viem';
import { ATELIER_MESSAGE, isArtistWallet, isAtelierAdmin } from './collectors';

export function normalizeWallet(w: string | null | undefined): `0x${string}` | null {
  if (!w) return null;
  const t = String(w).trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? (t as `0x${string}`) : null;
}

function utcDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** Signed payload for today (UTC). Expires at the next UTC midnight, with yesterday accepted. */
export function atelierMessageNow(): string {
  return `${ATELIER_MESSAGE}\n${utcDate(0)}`;
}

export function atelierMessageCandidates(): string[] {
  return [`${ATELIER_MESSAGE}\n${utcDate(0)}`, `${ATELIER_MESSAGE}\n${utcDate(-1)}`];
}

export function atelierAuthHeaders(address: string, signature: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('X-Atelier-Address', address);
  headers.set('X-Atelier-Signature', signature);
  return headers;
}

/** Address may come from the query; the signature must be a header (never a GET query). */
export function readAtelierAuth(request: Request): {
  address: string | null;
  signature: string | null;
} {
  const url = new URL(request.url);
  return {
    address: request.headers.get('X-Atelier-Address') || url.searchParams.get('address'),
    signature: request.headers.get('X-Atelier-Signature'),
  };
}

async function messageMatches(
  address: `0x${string}`,
  signature: string,
): Promise<boolean> {
  for (const message of atelierMessageCandidates()) {
    try {
      if (await verifyMessage({ address, message, signature: signature as `0x${string}` })) {
        return true;
      }
    } catch {
      /* try next day window */
    }
  }
  return false;
}

export async function verifyAtelierSig(
  address: string | null | undefined,
  signature: string | null | undefined,
): Promise<`0x${string}` | null> {
  const wallet = normalizeWallet(address);
  if (!wallet || !signature || !isAtelierAdmin(wallet)) return null;
  return (await messageMatches(wallet, signature)) ? wallet : null;
}

export async function verifyArtistSig(
  address: string | null | undefined,
  signature: string | null | undefined,
): Promise<`0x${string}` | null> {
  const wallet = await verifyAtelierSig(address, signature);
  if (!wallet || !isArtistWallet(wallet)) return null;
  return wallet;
}
