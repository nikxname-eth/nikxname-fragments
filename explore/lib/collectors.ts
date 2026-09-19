/** Wallet-keyed collector identities. KV (Atelier) is the live book; this file seeds it. */

/** Main mint / studio wallet — always Atelier admin, sees the full catalogue. */
export const ARTIST_MINT_WALLET = '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763' as `0x${string}`;

export type CollectorProfile = {
  id: string;
  address: `0x${string}`;
  name: string;
  title: string;
  kicker: string;
  lead: string;
  admin?: boolean;
};

export type AtelierRow = CollectorProfile & {
  enabled: boolean;
  notes: string;
  ens?: string;
};

export const COLLECTORS: CollectorProfile[] = [
  {
    id: 'nikxname',
    address: ARTIST_MINT_WALLET,
    name: 'Nikxname',
    title: 'Artist',
    kicker: 'The studio book',
    lead: 'Every canvas in the house — held, listed, or already in other gardens.',
    admin: true,
  },
  {
    id: 'sirmavv',
    address: '0xcc3bcddc1bf219a88e28c2f400f4a30a466f42c7',
    name: 'SirMavv',
    title: 'Senior Art Curator',
    kicker: 'Private collection',
    lead: 'Works held, chosen, and hung in their own time.',
    admin: true,
  },
];

export const ATELIER_MESSAGE = 'nikxart atelier';

export function collectorFor(address: string | null | undefined): CollectorProfile | null {
  if (!address) return null;
  const a = address.trim().toLowerCase();
  return (
    COLLECTORS.find((c) => c.address.toLowerCase() === a) ??
    (a === ARTIST_MINT_WALLET ? COLLECTORS.find((c) => c.id === 'nikxname') ?? null : null)
  );
}

export function collectorById(id: string): CollectorProfile | null {
  return COLLECTORS.find((c) => c.id === id) ?? null;
}

export function isArtistWallet(address: string | null | undefined): boolean {
  return Boolean(address && address.trim().toLowerCase() === ARTIST_MINT_WALLET);
}

export function isAtelierAdmin(address: string | null | undefined): boolean {
  if (isArtistWallet(address)) return true;
  return Boolean(collectorFor(address)?.admin);
}

export function seedAtelierRows(): AtelierRow[] {
  return COLLECTORS.map((c) => ({
    ...c,
    address: c.address.toLowerCase() as `0x${string}`,
    enabled: true,
    notes: '',
    ens: '',
  }));
}

export function publicProfile(row: AtelierRow): CollectorProfile | null {
  if (!row.enabled) return null;
  return {
    id: row.id,
    address: row.address,
    name: row.name,
    title: row.title,
    kicker: row.kicker,
    lead: row.lead,
    admin: row.admin,
  };
}
