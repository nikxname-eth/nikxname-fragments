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
  BLOCK_INCREMENT_BPS,
  BLOCK_SERIES,
  BLOCK_LISTING,
  BLOCK_ONCHAIN_LISTING,
  BLOCK_PANELS,
  BLOCK_PLACEHOLDER,
  BLOCK_BLIP,
  BLOCK_REVEAL_AT,
  BLOCK_RESERVE_ETH,
  BLOCK_TREASURY,
  BLOCK_WORK_TITLE,
  blockManifoldItem,
  blockOpenSeaItem,
  blockPanelRevealed,
  blockStatusAt,
  blockStatusLabel,
} from '../../config/on-the-block';
import { formatEth, hexToWei, minNextWei } from '../../lib/blockAuction';

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

type LiveListing = {
  currentBid: string | null;
  currentBidWei: string;
  minBid: string;
  minBidWei: string;
  bidder: string | null;
  endsAt: string | null;
  bidCount: number;
};

async function readListing(): Promise<LiveListing> {
  const empty: LiveListing = {
    currentBid: null,
    currentBidWei: '0',
    minBid: BLOCK_RESERVE_ETH.replace(' ETH', ''),
    minBidWei: minNextWei(0n, hexToWei('0x470de4df820000'), BLOCK_INCREMENT_BPS).toString(),
    bidder: null,
    endsAt: null,
    bidCount: 0,
  };
  try {
    const res = await fetch(
      `https://marketplace.api.manifoldxyz.dev/listing/instance/${BLOCK_LISTING.manifoldId}`,
    );
    if (!res.ok) return empty;
    const rows = (await res.json()) as Array<{
      id?: string;
      bidCount?: number;
      details?: { initialAmount?: { hex?: string }; endTime?: number; startTime?: number };
      bid?: { amount?: { hex?: string }; bidder?: string; timestamp?: number };
    }>;
    const row = rows?.find((r) => r.id === String(BLOCK_ONCHAIN_LISTING)) || rows?.[0];
    if (!row) return empty;
    const reserve = hexToWei(row.details?.initialAmount?.hex);
    const current = hexToWei(row.bid?.amount?.hex);
    const min = minNextWei(current, reserve, BLOCK_INCREMENT_BPS);
    const stamp = row.bid?.timestamp || 0;
    const end = row.details?.endTime || 0;
    const endsAt = stamp > 0 && end > 1_000_000_000 ? new Date(end * 1000).toISOString() : null;
    const bidder = row.bid?.bidder && row.bid.bidder.startsWith('0x') ? row.bid.bidder : null;
    return {
      currentBid: current > 0n ? `${formatEth(current)} ETH` : null,
      currentBidWei: current.toString(),
      minBid: formatEth(min),
      minBidWei: min.toString(),
      bidder,
      endsAt,
      bidCount: row.bidCount || (current > 0n ? 1 : 0),
    };
  } catch {
    return empty;
  }
}

export const onRequestGet = async () => {
  const status = blockStatusAt();
  const live = await readListing();
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
      endsAt: live.endsAt || BLOCK_LISTING.endsAt,
      reserveEth: BLOCK_LISTING.reserveEth,
      minIncrement: BLOCK_LISTING.minIncrement,
      extension: BLOCK_LISTING.extension,
      onchainId: BLOCK_ONCHAIN_LISTING,
      minBid: live.minBid,
      minBidWei: live.minBidWei,
      timer: BLOCK_LISTING.timer,
      durationHours: BLOCK_AUCTION_HOURS,
      revealAt: BLOCK_REVEAL_AT,
      bidOpensAt: BLOCK_BID_OPENS_AT,
    },
    currentBid: live.currentBid,
    currentBidWei: live.currentBidWei,
    bidder: live.bidder,
    bidCount: live.bidCount,
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
