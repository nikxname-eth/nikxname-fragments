/**
 * On-chain collection registry for Explore.
 * Add a row, run `npm run sync:explore`, wire JSON in chainWorks.ts.
 */

export type CollectionRegistryEntry = {
  seriesId: string;
  label: string;
  address: `0x${string}`;
  standard: 'erc721' | 'erc1155';
  scanMaxId?: number;
};

export const ON_CHAIN_COLLECTIONS: CollectionRegistryEntry[] = [
  {
    seriesId: 'the-void',
    label: 'The Void',
    address: '0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    standard: 'erc721',
    scanMaxId: 200,
  },
  {
    seriesId: 'life-impressions',
    label: 'Life Impressions',
    address: '0xb00b42b5baa62f6ce800fb919b3d090b51c4463c',
    standard: 'erc721',
    scanMaxId: 200,
  },
  {
    seriesId: 'for-you',
    label: 'For You..',
    address: '0x5174ed5f363ef4df2823f42be54de5fd61294e49',
    standard: 'erc1155',
    scanMaxId: 100,
  },
  {
    seriesId: 'for-her',
    label: 'For Her..',
    address: '0x9813ff20c99525922b3538fce8c2c9e5db93866c',
    standard: 'erc1155',
    scanMaxId: 100,
  },
  {
    seriesId: 'a-familiar-burn',
    label: 'A Familiar Burn',
    address: '0x1641b09e11d19e6f6b9f80273158f9da28555593',
    standard: 'erc721',
    scanMaxId: 1500,
  },
];
