/**
 * GET /api/on-the-block
 * Auction frame for the 1/1 triptych. Config-driven until a Manifold
 * listing id or Seaport hash is set on BLOCK_LISTING.
 */

import {
  BLOCK_AUCTION_HOURS,
  BLOCK_BID_OPENS_AT,
  BLOCK_CHAIN,
  BLOCK_CONTRACT,
  BLOCK_SERIES,
  BLOCK_LISTING,
  BLOCK_LISTING_URL,
  BLOCK_PANELS,
  BLOCK_PLACEHOLDER,
  BLOCK_BLIP,
  BLOCK_REVEAL_AT,
  BLOCK_TREASURY,
  BLOCK_WORK_TITLE,
  blockManifoldItem,
  blockOpenSeaItem,
  blockPanelRevealed,
  blockStatusAt,
  blockStatusLabel,
} from '../../config/on-the-block';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=15',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async () => {
  const status = blockStatusAt();
  return json({
    ok: true,
    placeholder: BLOCK_PLACEHOLDER,
    status,
    statusLabel: blockStatusLabel(status),
    title: BLOCK_WORK_TITLE,
    blip: BLOCK_BLIP,
    seriesId: BLOCK_SERIES,
    contract: BLOCK_CONTRACT,
    chain: BLOCK_CHAIN,
    treasury: BLOCK_TREASURY,
    listing: {
      manifoldId: BLOCK_LISTING.manifoldId,
      seaportHash: BLOCK_LISTING.seaportHash,
      startsAt: BLOCK_LISTING.startsAt,
      endsAt: BLOCK_LISTING.endsAt,
      reserveEth: BLOCK_LISTING.reserveEth,
      minIncrement: BLOCK_LISTING.minIncrement,
      extension: BLOCK_LISTING.extension,
      href: BLOCK_LISTING.manifoldId ? BLOCK_LISTING_URL : null,
      timer: BLOCK_LISTING.timer,
      durationHours: BLOCK_AUCTION_HOURS,
      revealAt: BLOCK_REVEAL_AT,
      bidOpensAt: BLOCK_BID_OPENS_AT,
    },
    currentBid: null as string | null,
    bidCount: 0,
    winner: null as string | null,
    fulfillment: 'studio-transfer',
    panels: BLOCK_PANELS.map((p) => ({
      panel: p.panel,
      role: p.role,
      label: p.label,
      name: p.name,
      tokenId: p.tokenId,
      revealed: blockPanelRevealed(p),
      href: blockManifoldItem(p.tokenId) || blockOpenSeaItem(p.tokenId),
      openSea: blockOpenSeaItem(p.tokenId),
    })),
  });
};
