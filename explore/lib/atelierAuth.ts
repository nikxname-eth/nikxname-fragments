import { verifyMessage } from 'viem';
import { ATELIER_MESSAGE, isArtistWallet, isAtelierAdmin } from './collectors';

export function normalizeWallet(w: string | null | undefined): `0x${string}` | null {
  if (!w) return null;
  const t = String(w).trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(t) ? (t as `0x${string}`) : null;
}

export async function verifyAtelierSig(
  address: string | null | undefined,
  signature: string | null | undefined,
): Promise<`0x${string}` | null> {
  const wallet = normalizeWallet(address);
  if (!wallet || !signature || !isAtelierAdmin(wallet)) return null;
  try {
    const ok = await verifyMessage({
      address: wallet,
      message: ATELIER_MESSAGE,
      signature: signature as `0x${string}`,
    });
    return ok ? wallet : null;
  } catch {
    return null;
  }
}

export async function verifyArtistSig(
  address: string | null | undefined,
  signature: string | null | undefined,
): Promise<`0x${string}` | null> {
  const wallet = await verifyAtelierSig(address, signature);
  if (!wallet || !isArtistWallet(wallet)) return null;
  return wallet;
}
