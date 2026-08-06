/**
 * On-chain collection registry for Explore.
 * Add a row per Manifold / ERC-721 contract to surface its tokens as gallery works.
 *
 * After adding a contract, run: npm run sync:explore
 * That writes explore/data/collections/<id>.json for fast static loads.
 */

export type CollectionRegistryEntry = {
  /** Matches SeriesId in catalog.ts */
  seriesId: string;
  label: string;
  /** Ethereum mainnet contract address */
  address: `0x${string}`;
  /** Max id to scan if totalSupply is unavailable (binary-search capped) */
  scanMaxId?: number;
  /** Prefer animation_url when present */
  preferAnimation?: boolean;
};

export const ON_CHAIN_COLLECTIONS: CollectionRegistryEntry[] = [
  {
    seriesId: 'the-void',
    label: 'The Void',
    address: '0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    scanMaxId: 500,
    preferAnimation: true,
  },
  // Add more contracts here, e.g.:
  // { seriesId: 'life-impressions', label: 'Life Impressions', address: '0x…' },
];
