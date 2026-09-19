/** The six Nikxname collection contracts (Ethereum + Base). */
export const NIKX_CONTRACTS = [
  {
    seriesId: 'one-of-ones' as const,
    label: "Nikxname 1/1's",
    symbol: 'NKX1',
    address: '0x07f3bfe5ca8d84108df5c020f885d1d6bf40585e',
    standard: 'erc721' as const,
    chain: 'ethereum' as const,
  },
  {
    seriesId: 'life-impressions' as const,
    label: 'Life Impressions',
    symbol: 'LIMP',
    address: '0xb00b42b5baa62f6ce800fb919b3d090b51c4463c',
    standard: 'erc721' as const,
    chain: 'ethereum' as const,
  },
  {
    seriesId: 'for-you' as const,
    label: 'For You..',
    symbol: 'FORYU',
    address: '0x5174ed5f363ef4df2823f42be54de5fd61294e49',
    standard: 'erc1155' as const,
    chain: 'ethereum' as const,
  },
  {
    seriesId: 'for-her' as const,
    label: 'For Her..',
    symbol: 'HER',
    address: '0x9813ff20c99525922b3538fce8c2c9e5db93866c',
    standard: 'erc1155' as const,
    chain: 'base' as const,
  },
  {
    seriesId: 'the-void' as const,
    label: 'The Void',
    symbol: 'VVOID',
    address: '0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    standard: 'erc721' as const,
    chain: 'ethereum' as const,
  },
  {
    seriesId: 'a-familiar-burn' as const,
    label: 'A Familiar Burn',
    symbol: 'AFB',
    address: '0x1641b09e11d19e6f6b9f80273158f9da28555593',
    standard: 'erc721' as const,
    chain: 'ethereum' as const,
  },
] as const;

export type NikxSeriesId = (typeof NIKX_CONTRACTS)[number]['seriesId'];

const BY_ADDRESS = new Map(
  NIKX_CONTRACTS.map((c) => [c.address.toLowerCase(), c]),
);

export function findNikxContract(address: string | undefined | null) {
  if (!address) return undefined;
  return BY_ADDRESS.get(address.toLowerCase());
}

export function rasterPreviewUrl(
  previewHash: string | null | undefined,
  previewType: string | null | undefined,
  size = 700,
): string | undefined {
  if (!previewHash || previewHash.length < 8) return undefined;
  const shard = previewHash.slice(0, 4);
  const anim = previewType?.startsWith('gif/') || previewType?.startsWith('video/');
  const file = anim
    ? previewType === 'gif/4+gif'
      ? `${size}-anim.gif`
      : `${size}-anim.avif`
    : `${size}.avif`;
  return `https://bits.raster.art/${shard}/${previewHash}/${file}`;
}
