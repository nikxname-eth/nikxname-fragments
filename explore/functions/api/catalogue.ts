/**
 * GET /api/catalogue
 * Studio book: collections as the site shows them, plus Will It.. panels.
 */

import { SERIES, getFragmentWorks, getWorksBySeries, type SeriesId } from '../../config/catalog';
import { getAfbSpecialEditions } from '../../lib/chainWorks';
import { getEmbersWorks } from '../../lib/embersWorks';
import { getWillItWorks } from '../../lib/willItWorks';
import type { ExploreWork } from '../../config/catalog';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function toRow(w: ExploreWork, collection: string) {
  return {
    title: w.title,
    collection,
    seriesId: w.seriesId,
    tokenId: w.tokenId,
    contract: w.contractAddress,
    qty: w.editionCount && w.editionCount > 1 ? w.editionCount : 1,
    cover: w.coverUrl || w.originCoverUrl,
    openSeaUrl: w.openSeaUrl,
  };
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (): Promise<Response> => {
  const collections = SERIES.filter((s) => s.id !== 'market').map((s) => {
    let works: ExploreWork[] = [];
    if (s.id === 'a-familiar-burn') {
      works = [
        ...getAfbSpecialEditions(),
        ...getFragmentWorks(),
        ...getEmbersWorks(),
        ...getWillItWorks(),
      ];
    } else {
      works = getWorksBySeries(s.id as SeriesId);
    }
    return {
      id: s.id,
      label: s.label,
      works: works.map((w) => toRow(w, s.label)),
    };
  });

  return json({ ok: true, collections });
};
