/**
 * Explore catalog — curated body of work for explore.nikxart.xyz.
 *
 * Stage II fragments are generated from the live site config (claims + media).
 * Other series are curated from Manifold creator catalog + Raster secondary market.
 * Expand series entries over time without touching the live drop site.
 */

import {
  CLAIM_INSTANCES,
  FRAGMENT_SITE_MEDIA,
  FRAGMENT_SHARE_URLS,
  PIECE_NAMES,
  getReleasedFragments,
  getPrimaryLiveMintPiece,
  isDropWindowOpen,
} from '../../src/config/artist';
import { getAllChainWorks } from '../lib/chainWorks';

export type SeriesId =
  | 'together-it-blooms'
  | 'a-familiar-burn'
  | 'life-impressions'
  | 'the-void'
  | 'for-you'
  | 'for-her'
  | 'one-of-ones'
  | 'secondary';

export type WorkKind = 'fragment' | 'series' | 'edition' | 'market';

export type ExploreWork = {
  id: string;
  seriesId: SeriesId;
  title: string;
  subtitle?: string;
  kind: WorkKind;
  coverUrl: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  manifoldUrl?: string;
  rasterUrl?: string;
  openSeaUrl?: string;
  contractAddress?: string;
  tokenId?: number;
  pieceNumber?: number;
  mintPrice?: string;
  tags?: string[];
  blurb?: string;
  sort: number;
  /** Total editions of this title (xN badge when > 1) */
  editionCount?: number;
  /** The Void subsection ordering */
  voidSubgroup?: 'artwork' | 'flutter-editions' | 'guardians';
};

export type ExploreSeries = {
  id: SeriesId;
  label: string;
  tagline: string;
  description: string;
  manifoldUrl?: string;
  rasterUrl?: string;
};

export const MANIFOLD_CREATOR = 'https://manifold.xyz/@nikxnames-art';
export const RASTER_ARTIST = 'https://www.raster.art/artist/nikxname';
export const LIVE_SITE = 'https://nikxart.xyz';
export const X_PROFILE = 'https://x.com/nikxname';

export const ARTIST = {
  name: 'Nikxname',
  tagline: 'Telling Human Stories',
  portrait:
    'https://assets.manifold.xyz/original/7185bec68793d1e8d6fd6c90cd8cb679d23647607064137598a798711958012c.jpg',
  bio: `Nik is a visionary digital artist whose journey in creation spans decades, beginning in his youth with acrylic painting, sculpting, and intricate model building. These early explorations fostered a profound, multifaceted perspective — one that weaves emotional depth with documentary-like precision, capturing both the chaos of existence and the quiet beauty of fleeting moments. Today, he channels this into digital painting, leveraging blockchain technology to immortalise the present's ephemeral essence, turning virtual brushstrokes into timeless Life Impressions.`,
  ethos: 'Create more than you consume.',
};

export const SERIES: ExploreSeries[] = [
  {
    id: 'together-it-blooms',
    label: 'Together It Blooms',
    tagline: 'Collection I · live drop experience',
    description:
      'Twenty-seven on-chain fragments revealed over time. A living grid — each piece a window into the whole.',
    manifoldUrl: MANIFOLD_CREATOR,
  },
  {
    id: 'a-familiar-burn',
    label: 'A Familiar Burn',
    tagline: 'On-chain collection · Stage II contract',
    description:
      'The full A Familiar Burn contract — every mint, grouped by artwork with edition counts.',
    manifoldUrl: MANIFOLD_CREATOR,
  },
  {
    id: 'life-impressions',
    label: 'Life Impressions',
    tagline: 'Blockchain-preserved snapshots of transient beauty',
    description:
      'Ethereal digital landscapes and portraits that evoke mindfulness and emotional resonance — pauses in the present.',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/p/1913617113',
  },
  {
    id: 'the-void',
    label: 'The Void',
    tagline: 'Artworks · Flutter editions · Guardians',
    description:
      'Stillness amid turmoil — main artworks first, then Flutter Into The Void editions, then Guardians.',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/p/thevoid',
  },
  {
    id: 'for-you',
    label: 'For You..',
    tagline: 'Intimate dedications',
    description:
      'Emotionally charged tributes — personalized narratives with a painterly touch.',
    manifoldUrl: MANIFOLD_CREATOR,
  },
  {
    id: 'for-her',
    label: 'For Her..',
    tagline: 'Intimate dedications',
    description:
      'Relational studies and dedications — human stories held on-chain.',
    manifoldUrl: MANIFOLD_CREATOR,
  },
  {
    id: 'one-of-ones',
    label: '1/1 Artworks',
    tagline: 'Singular pieces',
    description:
      'One-of-one works — complete statements, each a self-contained world.',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/p/nikxname1of1s',
  },
  {
    id: 'secondary',
    label: 'Portfolio & Secondary',
    tagline: 'Market & archive on Raster',
    description:
      'Secondary market listings and broader portfolio references — the work as it lives beyond primary mint.',
    rasterUrl: RASTER_ARTIST,
  },
];

function fragmentCover(piece: number): string {
  const media = FRAGMENT_SITE_MEDIA[piece];
  if (media?.posterUrl) return media.posterUrl;
  if (piece <= 5) {
    return `https://assets.nikxart.xyz/stageii/releasedfragment${String(piece).padStart(2, '0')}.jpg`;
  }
  return `https://assets.nikxart.xyz/releasedfragment${String(piece).padStart(2, '0')}.jpg`;
}

function fragmentVideo(piece: number): string | undefined {
  return FRAGMENT_SITE_MEDIA[piece]?.displayUrl ?? FRAGMENT_SHARE_URLS[piece];
}

/** Stage II fragments that have media available for the gallery. */
export function getFragmentWorks(now = Date.now()): ExploreWork[] {
  const released = new Set(getReleasedFragments(now));
  const live = getPrimaryLiveMintPiece(now);

  return Object.keys(FRAGMENT_SITE_MEDIA)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((piece) => released.has(piece) || piece === live || isDropWindowOpen(piece, now))
    .map((piece) => {
      const claim = CLAIM_INSTANCES[piece];
      const isLive = live === piece;
      return {
        id: `fragment-${piece}`,
        seriesId: 'together-it-blooms' as const,
        title: PIECE_NAMES[piece] ?? `Fragment ${piece}`,
        subtitle: isLive ? 'Live now on nikxart.xyz' : 'Released fragment',
        kind: 'fragment' as const,
        coverUrl: fragmentCover(piece),
        mediaUrl: fragmentVideo(piece),
        mediaType: 'video' as const,
        manifoldUrl: claim?.manifoldUrl,
        pieceNumber: piece,
        mintPrice: claim?.mintPrice,
        tags: isLive ? ['live', 'open edition'] : ['open edition'],
        sort: piece,
      };
    });
}

/** Curated portals — only when a series has no on-chain dump yet. */
export const SERIES_PORTALS: ExploreWork[] = [
  {
    id: 'portal-1of1',
    seriesId: 'one-of-ones',
    title: '1/1 Artworks',
    subtitle: 'Singular works on Manifold',
    kind: 'edition',
    coverUrl: ARTIST.portrait,
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/p/nikxname1of1s',
    tags: ['1/1'],
    blurb: 'One-of-one statements — complete worlds, each held as a unique on-chain object.',
    sort: 1002,
  },
  {
    id: 'portal-raster',
    seriesId: 'secondary',
    title: 'Portfolio & Secondary',
    subtitle: 'On Raster',
    kind: 'market',
    coverUrl: 'https://assets.nikxart.xyz/sharepreview.jpg',
    rasterUrl: RASTER_ARTIST,
    tags: ['secondary', 'market'],
    blurb:
      'Browse listings and secondary market references for Nikxname works across the wider archive.',
    sort: 1004,
  },
];

/** Series populated from on-chain dumps (explore/data/collections). */
const CHAIN_BACKED_SERIES = new Set<SeriesId>([
  'the-void',
  'life-impressions',
  'for-you',
  'for-her',
  'a-familiar-burn',
]);

export function getAllWorks(now = Date.now()): ExploreWork[] {
  const chain = getAllChainWorks();
  const portals = SERIES_PORTALS.filter((p) => !CHAIN_BACKED_SERIES.has(p.seriesId));
  return [...getFragmentWorks(now), ...chain, ...portals].sort((a, b) => {
    if (a.seriesId !== b.seriesId) {
      const order = SERIES.map((s) => s.id);
      return order.indexOf(a.seriesId) - order.indexOf(b.seriesId);
    }
    // The Void: artworks → flutter editions → guardians
    if (a.seriesId === 'the-void') {
      const order = { artwork: 0, 'flutter-editions': 1, guardians: 2 } as const;
      const ga = order[a.voidSubgroup ?? 'artwork'];
      const gb = order[b.voidSubgroup ?? 'artwork'];
      if (ga !== gb) return ga - gb;
    }
    return a.sort - b.sort;
  });
}

export function getWorksBySeries(seriesId: SeriesId | 'all', now = Date.now()): ExploreWork[] {
  const all = getAllWorks(now);
  if (seriesId === 'all') return all;
  return all.filter((w) => w.seriesId === seriesId);
}

export function getSeriesById(id: SeriesId): ExploreSeries | undefined {
  return SERIES.find((s) => s.id === id);
}

export function getLiveFragmentNote(now = Date.now()): {
  piece: number;
  claimUrl?: string;
} | null {
  const piece = getPrimaryLiveMintPiece(now);
  if (piece == null) return null;
  return { piece, claimUrl: CLAIM_INSTANCES[piece]?.manifoldUrl };
}
