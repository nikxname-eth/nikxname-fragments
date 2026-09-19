import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARTIST_MINT_WALLET } from '../collectors';
import { NIKX_CONTRACTS } from '../contracts';
import { buildListing, nowStart } from './build';
import { onchainOrderHash } from './client';
import { hashOrderComponents } from './hash';

test('hashOrderComponents matches Seaport 1.6 getOrderHash on Ethereum', async () => {
  const afb = NIKX_CONTRACTS.find((c) => c.seriesId === 'a-familiar-burn');
  assert.ok(afb);
  const start = nowStart();
  const components = buildListing({
    offerer: ARTIST_MINT_WALLET,
    contract: afb.address,
    tokenId: 806n,
    standard: 'erc721',
    quantity: 1n,
    priceWei: 8_000_000_000_000_000n,
    counter: 0n,
    startTime: start,
    endTime: start + 3600n,
  });
  const local = hashOrderComponents(components, 1);
  const chain = await onchainOrderHash('ethereum', components);
  assert.equal(local.toLowerCase(), chain.toLowerCase());
});
