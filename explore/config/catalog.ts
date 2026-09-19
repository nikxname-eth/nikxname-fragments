/**
 * Explore catalog - curated body of work for explore.nikxart.xyz.
 *
 * Tabs: A Familiar Burn · The Void · Life Impressions · For Her.. · For You.. · 1/1s · Market
 * Catalogue grid uses R2 previews when available; Theatre loads full origin media on demand.
 */

import {
  CLAIM_INSTANCES,
  FRAGMENT_SITE_MEDIA,
  FRAGMENT_SHARE_URLS,
  fragment4kUrl,
  PIECE_NAMES,
  getPrimaryLiveMintPiece,
} from '../../src/config/artist';
import { afbFragmentCopies, getChainWorksForSeries } from '../lib/chainWorks';
import { getMarketWorks } from '../lib/market';
import { resolveCatalogueCover } from '../lib/previews';

export type SeriesId =
  | 'a-familiar-burn'
  | 'the-void'
  | 'life-impressions'
  | 'for-her'
  | 'for-you'
  | 'one-of-ones'
  | 'market';

export type WorkKind = 'fragment' | 'series' | 'edition' | 'market';

export type ExploreWork = {
  id: string;
  seriesId: SeriesId;
  title: string;
  /** Light caption under the card - keep short; omit token # unless fragment */
  subtitle?: string;
  kind: WorkKind;
  /** Catalogue grid (prefer R2 preview) */
  coverUrl: string;
  /** Origin still/poster - used when R2 preview is missing */
  originCoverUrl?: string;
  /** Theatre playback (1080p / optimized when available) */
  mediaUrl?: string;
  /** Master / 4K — Theatre loads only when requested */
  mediaUrlHi?: string;
  /** Highest encode (e.g. 11K) — Theatre loads only when requested */
  mediaUrlMax?: string;
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
  /** Garden / unmatched token collection name when seriesId is not in SERIES */
  collectionLabel?: string;
  sort: number;
  editionCount?: number;
  /** Encode / hang frame rate when the master is a known constant (Embers = 24). */
  nativeFps?: number;
  voidSubgroup?: 'artwork' | 'flutter-editions' | 'guardians';
};

export type ExploreSeries = {
  id: SeriesId;
  label: string;
  tagline: string;
  /** Short 1–2 lines for the Explore lead page */
  lead: string;
  /** Full text for the individual collection page */
  description: string;
  manifoldUrl?: string;
  rasterUrl?: string;
};

export const MANIFOLD_CREATOR = 'https://manifold.xyz/@nikxnames-art';
export const RASTER_ARTIST = 'https://www.raster.art/artist/nikxname';
export const OPENSEA_PROFILE = 'https://opensea.io/nikxname';

const RASTER_SERIES: Partial<Record<SeriesId, string>> = {
  'a-familiar-burn': 'https://www.raster.art/artwork/a-familiar-burn-by-nikxname?sort=listing',
  'the-void': 'https://www.raster.art/artwork/the-void-by-nikxname?sort=listing',
  'life-impressions': 'https://www.raster.art/artwork/life-impressions-by-nikxname?sort=listing',
  'for-you': 'https://www.raster.art/artwork/for-you-by-nikxname?sort=listing',
  'for-her': 'https://www.raster.art/artwork/for-her-by-nikxname?sort=listing',
};

/** Raster secondary market. Collection pages use the series listing view. */
export function rasterMarketUrl(seriesId?: SeriesId | string): string {
  if (seriesId && seriesId in RASTER_SERIES) return RASTER_SERIES[seriesId as SeriesId]!;
  return RASTER_ARTIST;
}
export const LIVE_SITE = 'https://nikxart.xyz';
export const X_PROFILE = 'https://x.com/nikxname';

/**
 * Artist voice - Manifold bio, public X (@nikxname), and the living practice.
 * WHO? section shows full bio (no read-more); short lines feed gems / footer.
 */
export const ARTIST = {
  name: 'Nikxname',
  handle: '@nikxname',
  role: 'Artist',
  portrait:
    'https://assets.manifold.xyz/original/7185bec68793d1e8d6fd6c90cd8cb679d23647607064137598a798711958012c.jpg',
  /**
   * Full bio for WHO? section (always shown, no read-more).
   * Paragraph break after model building for easier reading.
   */
  bioParagraphs: [
    `Nik is a visionary digital artist whose journey in creation spans decades, beginning in his youth with acrylic painting, sculpting, and intricate model building.`,
    `These early explorations fostered a profound, multifaceted perspective - one that weaves emotional depth with documentary-like precision, capturing both the chaos of existence and the quiet beauty of fleeting moments. Today, he channels this into digital painting, leveraging blockchain technology to immortalise the present's ephemeral essence, turning virtual brushstrokes into timeless Life Impressions. At the heart of his practice is a commitment to iterative growth and stillness amid turmoil. His art serves as a bridge between personal introspection and communal connection.`,
  ],
  /** Primary ethos (footer / closing band only - not repeated under bio) */
  ethos: 'Create more than you consume.',
  /** Pull quote under bio - distinct from footer ethos */
  quoteSecondary: 'Telling Human Stories',
  /** Museum "world" notes - inviting, not platform thesis */
  worldTitle: 'Enter the world',
  worldKicker: 'A living practice',
  worldLead:
    'Not a Marketplace, but a theatre for human stories, held on-chain so that our presence can outlast the scroll.',
  gems: [
    {
      title: 'Brushstrokes as memory',
      body: 'Each work is a document of feeling - chaos and quiet, painted so a fleeting moment can remain.',
    },
    {
      title: 'Stillness amid turmoil',
      body: 'The Void, Life Impressions, and the Fragments all circle the same question: how do we stay human while the world moves too fast?',
    },
    {
      title: 'Create more than you consume',
      body: 'An ethos spoken on X and lived in the studio - iterative growth, less noise, more making.',
    },
    {
      title: 'Stories through brushstrokes',
      body: 'From dedications For Her.. and For You.. to singular 1/1s - relational, painterly, never generic.',
    },
  ],
};

/** Primary collection tabs only */
export const SERIES: ExploreSeries[] = [
  {
    id: 'a-familiar-burn',
    label: 'A Familiar Burn',
    tagline: 'Together It Blooms · Fragments I-XXVII',
    lead: 'The full Blossom canvas above — still or animated — then all twenty-seven fragments in order.',
    description:
      'The full Blossom canvas above — still or animated — then all twenty-seven fragments in order.',
    manifoldUrl: MANIFOLD_CREATOR,
    rasterUrl: RASTER_SERIES['a-familiar-burn'],
  },
  {
    id: 'the-void',
    label: 'The Void',
    tagline: 'A journey into the depths of the abyss.',
    lead: 'A 44-piece impressionistic meditation on existence, framed by Into The Void and Into The Abyss.',
    description: `“The Void” is a 44-piece impressionistic collection that defies silence, offering a profound meditation on existence. This series is shaped by the interplay of water, sky, clouds, and the spaces in between, anchored by two monumental works: “Into the Void” and “Into The Abyss.” These pieces frame 42 square visions, each a testament of resilience through rigorous mark making.

This series emerged during a time of personal adversity, recovering from a hand injury, finding solace and inspiration in the vastness of nature and the cosmos. Constraint turned method and style, “The Void” reflects a contemplative exploration of life’s mysteries, capturing the essence of existence through my artistic lens.

Created using Digital Paint, each artwork resonates with cosmic rhythms and human longing. The medium’s fluidity allows for layered distortions and fractured blends, creating depth through thousands of strokes that merge hues of blue, black, and white. These marks transform chaos into form, each piece a deliberate act born from the artist’s physical struggle and a testament to dreams extracted from the void.`,
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/p/thevoid',
    rasterUrl: RASTER_SERIES['the-void'],
  },
  {
    id: 'life-impressions',
    label: 'Life Impressions',
    tagline: 'Snapshots of transient beauty',
    lead: 'An evolving series of unique digital paintings — a visual testament to slowing down, and to the beauty of nature amid our fast-paced lives.',
    description: `In the relentless pace of modern life, the mantra "there's no time" echoes universally, often drowning out the gentle whispers of nature. I, too, have felt this disconnection, swept away by the currents of daily obligations. To counter this, I've chosen to slow down, to step outside the temporal whirlwind and reconnect with the earth's rhythms. Amidst the chaos, I find solace in pausing, not just to reflect on fleeting human moments, but to immerse myself in the timeless beauty of nature. This realization has birthed "Life Impressions," an evolving series of unique digital paintings.

Each piece is hand-crafted to capture not only personal micro-moments and emotions but also the serene, often overlooked, interactions with the natural world. This collection serves as a visual testament to the importance of slowing down, of finding and appreciating the profound simplicity and beauty in nature, amidst our fast-paced lives.`,
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/p/1913617113',
    rasterUrl: RASTER_SERIES['life-impressions'],
  },
  {
    id: 'for-her',
    label: 'For Her..',
    tagline: 'Intimate dedications · Base',
    lead: 'Dedicated to Moms around the world. A series of five roses — each with their own story to tell. Digital flowers, the kind that last forever.',
    description: `Dedicated to the incredible Moms around the world in celebration of Mother's Day. A series of 5 roses — based around culture, with a solid foundation and a blooming variety of petals. Each with their own story to tell.

Forget the real flowers. Digital flowers are the kind that last forever.

Those who originally minted a full set were rewarded with PearlsNRoses as a thank you.`,
    manifoldUrl: MANIFOLD_CREATOR,
    rasterUrl: RASTER_SERIES['for-her'],
  },
  {
    id: 'for-you',
    label: 'For You..',
    tagline: 'Intimate dedications',
    lead: 'A 12-part love story in digitally painted roses — gifting art over ephemeral flowers, at a cost comparable to the real thing.',
    description: `A transformative 12-part love story told through digitally painted roses on the Ethereum Blockchain (L1), celebrating love and the act of gifting art over ephemeral flowers.

An experiment where digital paintings are the roses, available at a cost comparable to real roses. An effort to expand our perspective of value — be it fleeting, or one that lasts forever.`,
    manifoldUrl: MANIFOLD_CREATOR,
    rasterUrl: RASTER_SERIES['for-you'],
  },
  {
    id: 'one-of-ones',
    label: '1/1s',
    tagline: 'Singular works',
    lead: 'One-of-one digital paintings and animated works — complete worlds, each a unique on-chain object.',
    description:
      'One-of-one digital paintings and animated works from the Nikxname 1/1s contract - complete worlds, each a unique on-chain object.',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/p/nikxname1of1s',
  },
  {
    id: 'market',
    label: 'Market',
    tagline: 'OpenSea · Raster · Ethereum · Base',
    lead: 'Secondary market gateways for each collection on OpenSea and Raster.',
    description:
      'Secondary market gateways for each collection on OpenSea and Raster. With OPENSEA_API_KEY, active asks sync into this tab.',
    rasterUrl: RASTER_ARTIST,
  },
];

/** Still poster (jpg) - thumbs / fallback when no GIF on CDN */
function fragmentStill(piece: number): string {
  const media = FRAGMENT_SITE_MEDIA[piece];
  if (media?.posterUrl) return media.posterUrl;
  if (piece <= 5) {
    return `https://assets.nikxart.xyz/stageii/releasedfragment${String(piece).padStart(2, '0')}.jpg`;
  }
  return `https://assets.nikxart.xyz/releasedfragment${String(piece).padStart(2, '0')}.jpg`;
}

/**
 * Same Blossom master files used for the finale claim viewer.
 * Still JPG + 11K animate (4K fallback) + cover GIF poster.
 */
export const BLOSSOM_CANVAS = {
  still: 'https://assets.nikxart.xyz/BlossomFragments-Still.jpg',
  animate: 'https://assets.nikxart.xyz/BlossomFragments-Animate-11K.mp4',
  animate4k: 'https://assets.nikxart.xyz/BlossomFragments-Animate-4k.mp4',
  cover: 'https://assets.nikxart.xyz/BlossomFragments-Cover.gif',
} as const;

export const BLOSSOM_ANIMATE_SOURCES = [
  BLOSSOM_CANVAS.animate,
  BLOSSOM_CANVAS.animate4k,
] as const;

/** Full-canvas work for Theatre (still or animated, matching the AFB toggle). */
export function getBlossomCanvasWork(mode: 'still' | 'animated' = 'still'): ExploreWork {
  const animated = mode === 'animated';
  return {
    id: animated ? 'blossom-canvas-animated' : 'blossom-canvas-still',
    seriesId: 'a-familiar-burn',
    title: animated ? 'Blossom Fragments · Animated' : 'Blossom Fragments · Still',
    subtitle: animated ? 'Animated' : 'Still',
    kind: 'series',
    coverUrl: animated ? BLOSSOM_CANVAS.cover : BLOSSOM_CANVAS.still,
    originCoverUrl: BLOSSOM_CANVAS.still,
    mediaUrl: animated ? BLOSSOM_CANVAS.animate4k : BLOSSOM_CANVAS.still,
    mediaUrlHi: animated ? BLOSSOM_CANVAS.animate4k : undefined,
    mediaUrlMax: animated ? BLOSSOM_CANVAS.animate : undefined,
    mediaType: animated ? 'video' : 'image',
    sort: 0,
    blurb: 'The full canvas — twenty-seven fragments together.',
  };
}

/**
 * Per-fragment cover GIF:
 *   https://assets.nikxart.xyz/Fragments/Fragment-NN_Cover.gif
 * Catalogue / landing use GIF; Theatre opens full video (with audio).
 */
function fragmentCoverGif(piece: number): string {
  if (piece === 27) return 'https://assets.nikxart.xyz/Fragment-27_Cover.gif';
  const pad = String(piece).padStart(2, '0');
  return `https://assets.nikxart.xyz/Fragments/Fragment-${pad}_Cover.gif`;
}

function fragmentCover(piece: number): string {
  if (piece >= 1 && piece <= 27) return fragmentCoverGif(piece);
  return fragmentStill(piece);
}

function fragmentVideo(piece: number): string | undefined {
  return FRAGMENT_SITE_MEDIA[piece]?.displayUrl ?? FRAGMENT_SHARE_URLS[piece];
}

/**
 * A Familiar Burn = complete Fragments 1–27.
 * Cover GIF in the 9×3 grid; full video in Theatre when clicked.
 */
export function getFragmentWorks(now = Date.now()): ExploreWork[] {
  const live = getPrimaryLiveMintPiece(now);

  const pieces: number[] = [];
  for (let piece = 1; piece <= 27; piece++) {
    if (!FRAGMENT_SITE_MEDIA[piece] && !FRAGMENT_SHARE_URLS[piece]) continue;
    pieces.push(piece);
  }

  return pieces.map((piece) => {
    const claim = CLAIM_INSTANCES[piece];
    const isLive = live === piece;
    const coverGif = fragmentCover(piece);
    const video = fragmentVideo(piece);
    const id = `fragment-${piece}`;
    return {
      id,
      seriesId: 'a-familiar-burn' as const,
      title: PIECE_NAMES[piece] ?? `Fragment ${piece}`,
      subtitle: isLive ? 'Live' : undefined,
      kind: 'fragment' as const,
      // Cover GIF for grid / feature / thumbs (not BannerGrid, not R2 still previews)
      coverUrl: coverGif,
      originCoverUrl: coverGif,
      // Full MP4 with audio when opened in Theatre (1080p). 4K on demand.
      mediaUrl: video,
      mediaUrlHi: fragment4kUrl(piece),
      mediaType: 'video' as const,
      manifoldUrl: claim?.manifoldUrl,
      pieceNumber: piece,
      mintPrice: claim?.mintPrice,
      tags: isLive ? ['live'] : undefined,
      sort: piece,
      editionCount: afbFragmentCopies(piece),
      nativeFps: 24,
    };
  });
}

/** Chain series - exclude A Familiar Burn contract dump (fragments only for that tab). */
const CHAIN_SERIES: SeriesId[] = [
  'the-void',
  'life-impressions',
  'for-you',
  'for-her',
  'one-of-ones',
];

export function getAllWorks(now = Date.now()): ExploreWork[] {
  const chain = CHAIN_SERIES.flatMap((id) => getChainWorksForSeries(id));
  return [...getFragmentWorks(now), ...chain, ...getMarketWorks()].sort(
    (a, b) => {
      if (a.seriesId !== b.seriesId) {
        const order = SERIES.map((s) => s.id);
        return order.indexOf(a.seriesId) - order.indexOf(b.seriesId);
      }
      if (a.seriesId === 'the-void') {
        const order = { artwork: 0, 'flutter-editions': 1, guardians: 2 } as const;
        const ga = order[a.voidSubgroup ?? 'artwork'];
        const gb = order[b.voidSubgroup ?? 'artwork'];
        if (ga !== gb) return ga - gb;
      }
      return a.sort - b.sort;
    },
  );
}

export function getWorksBySeries(seriesId: SeriesId | 'all', now = Date.now()): ExploreWork[] {
  if (seriesId === 'all') return getAllWorks(now);
  if (seriesId === 'a-familiar-burn') return getFragmentWorks(now);
  if (seriesId === 'market') return getMarketWorks();
  return getChainWorksForSeries(seriesId);
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

/** Flat list of works used by preview sync (id + source image + series). */
export function listWorksForPreviewSync(now = Date.now()): {
  seriesId: string;
  workId: string;
  sourceUrl: string;
}[] {
  const all = getAllWorks(now);
  return all
    .map((w) => ({
      seriesId: w.seriesId,
      workId: w.id,
      sourceUrl:
        w.originCoverUrl ||
        (w.mediaType === 'image' ? w.mediaUrl : undefined) ||
        '',
    }))
    .filter((w) => w.sourceUrl && !w.sourceUrl.includes('/explore/previews/'));
}
