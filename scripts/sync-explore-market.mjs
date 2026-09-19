#!/usr/bin/env node
/**
 * Refresh Explore Market tab data.
 *
 * Always writes curated hubs + collection OpenSea/Raster gateways.
 * When OPENSEA_API_KEY is set, also pulls active collection listings (v2 API).
 *
 * Usage:
 *   npm run sync:explore:market
 *   OPENSEA_API_KEY=... npm run sync:explore:market
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'explore/data/market.json');
const KEY = process.env.OPENSEA_API_KEY || '';

const HUBS = [
  {
    id: 'hub-opensea',
    title: 'OpenSea',
    subtitle: 'Creator · Ethereum',
    blurb: 'All Nikxname listings and secondary inventory on OpenSea.',
    url: 'https://opensea.io/nikxname',
    kind: 'opensea',
    coverKey: 'market-opensea',
  },
  {
    id: 'hub-raster',
    title: 'Raster',
    subtitle: 'Portfolio · market',
    blurb: 'Portfolio and secondary market references on Raster.',
    url: 'https://www.raster.art/artist/nikxname',
    kind: 'raster',
    coverKey: 'market-raster',
  },
  {
    id: 'hub-manifold',
    title: 'Manifold',
    subtitle: 'Primary catalog',
    blurb: 'Creator profile and primary claim catalog.',
    url: 'https://manifold.xyz/@nikxnames-art',
    kind: 'manifold',
    coverKey: 'market-manifold',
  },
];

const COLLECTIONS = [
  {
    id: 'mkt-a-familiar-burn',
    seriesId: 'a-familiar-burn',
    title: 'A Familiar Burn',
    subtitle: 'OpenSea · Ethereum',
    contract: '0x1641b09e11d19e6f6b9f80273158f9da28555593',
    chain: 'ethereum',
    openSeaSlug: 'a-familiar-burn',
    openSeaCollection: 'https://opensea.io/collection/a-familiar-burn',
    openSeaContract:
      'https://opensea.io/assets/ethereum/0x1641b09e11d19e6f6b9f80273158f9da28555593',
    rasterUrl: 'https://www.raster.art/artwork/a-familiar-burn-by-nikxname?sort=listing',
    coverFromSeries: 'a-familiar-burn',
    coverWorkId: 'fragment-1',
  },
  {
    id: 'mkt-the-void',
    seriesId: 'the-void',
    title: 'The Void',
    subtitle: 'OpenSea · Ethereum',
    contract: '0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    chain: 'ethereum',
    openSeaSlug: 'the-void',
    openSeaCollection: 'https://opensea.io/collection/the-void',
    openSeaContract:
      'https://opensea.io/assets/ethereum/0xa4f73c689f977a27f7f99cd1cdc9054793554730',
    rasterUrl: 'https://www.raster.art/artwork/the-void-by-nikxname?sort=listing',
    coverFromSeries: 'the-void',
    coverWorkId: 'the-void-1',
  },
  {
    id: 'mkt-life-impressions',
    seriesId: 'life-impressions',
    title: 'Life Impressions',
    subtitle: 'OpenSea · Ethereum',
    contract: '0xb00b42b5baa62f6ce800fb919b3d090b51c4463c',
    chain: 'ethereum',
    openSeaSlug: 'life-impressions-by-nikxname',
    openSeaCollection: 'https://opensea.io/collection/life-impressions-by-nikxname',
    openSeaContract:
      'https://opensea.io/assets/ethereum/0xb00b42b5baa62f6ce800fb919b3d090b51c4463c',
    rasterUrl: 'https://www.raster.art/artwork/life-impressions-by-nikxname?sort=listing',
    coverFromSeries: 'life-impressions',
    coverWorkId: 'life-impressions-1',
  },
  {
    id: 'mkt-for-you',
    seriesId: 'for-you',
    title: 'For You..',
    subtitle: 'OpenSea · Ethereum',
    contract: '0x5174ed5f363ef4df2823f42be54de5fd61294e49',
    chain: 'ethereum',
    openSeaSlug: 'for-you',
    openSeaCollection: 'https://opensea.io/collection/for-you',
    openSeaContract:
      'https://opensea.io/assets/ethereum/0x5174ed5f363ef4df2823f42be54de5fd61294e49',
    rasterUrl: 'https://www.raster.art/artwork/for-you-by-nikxname?sort=listing',
    coverFromSeries: 'for-you',
    coverWorkId: 'for-you-1',
  },
  {
    id: 'mkt-for-her',
    seriesId: 'for-her',
    title: 'For Her..',
    subtitle: 'OpenSea · Base',
    contract: '0x9813ff20c99525922b3538fce8c2c9e5db93866c',
    chain: 'base',
    openSeaSlug: 'for-her-by-nikxname',
    openSeaCollection: 'https://opensea.io/collection/for-her-by-nikxname',
    openSeaContract:
      'https://opensea.io/assets/base/0x9813ff20c99525922b3538fce8c2c9e5db93866c',
    rasterUrl: 'https://www.raster.art/artwork/for-her-by-nikxname?sort=listing',
    coverFromSeries: 'for-her',
    coverWorkId: 'for-her-1',
  },
];

async function fetchListingsForSlug(slug, seriesId) {
  if (!KEY) return [];
  const url = `https://api.opensea.io/api/v2/listings/collection/${slug}/all?limit=20`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-api-key': KEY,
    },
  });
  if (!res.ok) {
    console.warn(`  OpenSea listings ${slug}: HTTP ${res.status}`);
    return [];
  }
  const json = await res.json();
  const rows = json.listings || json.orders || [];
  return rows.slice(0, 20).map((row, i) => {
    const protocol = row.protocol_data?.parameters || row.protocol_data || {};
    const offer = protocol.offer?.[0] || {};
    const item = row.protocol_data?.parameters?.offer?.[0] || offer;
    const priceWei =
      row.price?.current?.value ||
      row.price?.value ||
      protocol.consideration?.[0]?.startAmount;
    const decimals = Number(row.price?.current?.decimals ?? 18);
    const currency = row.price?.current?.currency || 'ETH';
    let price;
    if (priceWei != null) {
      const n = Number(priceWei) / 10 ** decimals;
      price = Number.isFinite(n) ? n.toFixed(n < 0.01 ? 4 : 3) : undefined;
    }
    const tokenId =
      row.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria ||
      item.identifierOrCriteria ||
      row.item?.token_id;
    const chain = row.chain || 'ethereum';
    const contract =
      row.protocol_data?.parameters?.offer?.[0]?.token ||
      COLLECTIONS.find((c) => c.openSeaSlug === slug)?.contract;
    return {
      id: `listing-${slug}-${tokenId ?? i}`,
      title: row.item?.name || `${seriesId} #${tokenId ?? i}`,
      price,
      currency,
      image: row.item?.image_url || row.item?.display_image_url,
      openSeaUrl:
        contract && tokenId != null
          ? `https://opensea.io/assets/${chain}/${contract}/${tokenId}`
          : `https://opensea.io/collection/${slug}`,
      contract,
      tokenId: tokenId != null ? Number(tokenId) : undefined,
      chain,
      seriesId,
    };
  });
}

async function main() {
  console.log('Market sync · hubs + collection gateways');
  if (KEY) console.log('OpenSea API key present — fetching listings…');
  else console.log('No OPENSEA_API_KEY — gateways only (set key for live asks)');

  let listings = [];
  if (KEY) {
    for (const c of COLLECTIONS) {
      const rows = await fetchListingsForSlug(c.openSeaSlug, c.seriesId);
      console.log(`  ${c.openSeaSlug}: ${rows.length} listings`);
      listings = listings.concat(rows);
    }
  }

  // Preserve any previous listings if API empty and key present
  if (KEY && listings.length === 0 && existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8'));
      if (prev.listings?.length) {
        console.log(`  Keeping previous ${prev.listings.length} listings (API empty)`);
        listings = prev.listings;
      }
    } catch {
      /* ignore */
    }
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    note: KEY
      ? 'Listings refreshed from OpenSea API v2.'
      : 'Collection market gateways. Live floor/asks require OPENSEA_API_KEY via npm run sync:explore:market.',
    hubs: HUBS,
    collections: COLLECTIONS.map(({ openSeaSlug, ...rest }) => rest),
    listings,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
  console.log(`  hubs=${HUBS.length} collections=${COLLECTIONS.length} listings=${listings.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
