/**
 * Simple inventory of known masters for the private Atelier book.
 * Built from collection dumps + CDN fragment/blossom paths.
 * Later: pin/backup via Anchor (or similar).
 */
import { BLOSSOM_CANVAS } from '../config/catalog';
import {
  FRAGMENT_SHARE_URLS,
  FRAGMENT_SITE_MEDIA,
} from '../../src/config/artist';
import voidJson from '../data/collections/the-void.json';
import lifeJson from '../data/collections/life-impressions.json';
import forYouJson from '../data/collections/for-you.json';
import forHerJson from '../data/collections/for-her.json';
import oneOfOnesJson from '../data/collections/one-of-ones.json';
import afbJson from '../data/collections/a-familiar-burn.json';
import willItJson from '../data/will-it-tokens.json';
import embersJson from '../data/embers-tokens.json';
import { rasterPreviewUrl } from './contracts';

export type AssetStore = 'Arweave' | 'IPFS' | 'CDN';

export type AssetRecord = {
  name: string;
  collection: string;
  kind: string;
  store: AssetStore;
  url: string;
  indexed: string;
};

type Dump = {
  label?: string;
  fetchedAt?: string;
  tokens?: {
    name?: string;
    image?: string;
    mediaUrl?: string;
    animationUrl?: string;
    tokenUri?: string;
    mediaType?: string;
  }[];
};

function kindFromUrl(url: string, mediaType?: string): string {
  if (/\.gif(\?|$)/i.test(url)) return 'gif';
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return 'video';
  if (/\.(png|jpe?g|webp|avif)(\?|$)/i.test(url)) return 'image';
  if (mediaType === 'video') return 'video';
  if (mediaType === 'image') return 'image';
  return 'file';
}

function storeFromUrl(url: string): AssetStore {
  if (/arweave\.net|ar:\/\//i.test(url)) return 'Arweave';
  if (/ipfs|nftstorage|web3storage/i.test(url)) return 'IPFS';
  return 'CDN';
}

function push(
  out: AssetRecord[],
  seen: Set<string>,
  rec: Omit<AssetRecord, 'store' | 'kind'> & { kind?: string; mediaType?: string },
) {
  const url = rec.url?.trim();
  if (!url || seen.has(url)) return;
  seen.add(url);
  out.push({
    name: rec.name,
    collection: rec.collection,
    kind: rec.kind || kindFromUrl(url, rec.mediaType),
    store: storeFromUrl(url),
    url,
    indexed: rec.indexed,
  });
}

function fromDump(dump: Dump, collection: string): AssetRecord[] {
  const indexed = dump.fetchedAt ? dump.fetchedAt.slice(0, 10) : '';
  const out: AssetRecord[] = [];
  const seen = new Set<string>();
  for (const t of dump.tokens || []) {
    const name = (t.name || 'Untitled').replace(/\s*#\s*\d+\s*\/\s*\d+\s*$/i, '').trim();
    for (const url of [t.mediaUrl, t.animationUrl, t.image]) {
      if (!url || url === t.image && t.mediaUrl && url === t.mediaUrl) continue;
      push(out, seen, { name, collection, url, indexed, mediaType: t.mediaType });
    }
    if (t.image && t.image !== t.mediaUrl) {
      push(out, seen, { name: `${name} · still`, collection, url: t.image, indexed, kind: 'image' });
    }
    if (t.tokenUri) {
      push(out, seen, { name: `${name} · metadata`, collection, url: t.tokenUri, indexed, kind: 'json' });
    }
  }
  return out;
}

export function listKnownAssets(): AssetRecord[] {
  const rows: AssetRecord[] = [
    ...fromDump(voidJson as Dump, 'The Void'),
    ...fromDump(lifeJson as Dump, 'Life Impressions'),
    ...fromDump(forYouJson as Dump, 'For You..'),
    ...fromDump(forHerJson as Dump, 'For Her..'),
    ...fromDump(oneOfOnesJson as Dump, '1/1s'),
    ...fromDump(afbJson as Dump, 'A Familiar Burn'),
  ];
  const seen = new Set(rows.map((r) => r.url));
  const today = '';
  push(rows, seen, {
    name: 'Blossom Fragments · Still',
    collection: 'A Familiar Burn',
    url: BLOSSOM_CANVAS.still,
    indexed: today,
    kind: 'image',
  });
  push(rows, seen, {
    name: 'Blossom Fragments · Cover',
    collection: 'A Familiar Burn',
    url: BLOSSOM_CANVAS.cover,
    indexed: today,
    kind: 'gif',
  });
  push(rows, seen, {
    name: 'Blossom Fragments · Animated 4K',
    collection: 'A Familiar Burn',
    url: BLOSSOM_CANVAS.animate4k,
    indexed: today,
    kind: 'video',
  });
  push(rows, seen, {
    name: 'Blossom Fragments · Animated 11K',
    collection: 'A Familiar Burn',
    url: BLOSSOM_CANVAS.animate,
    indexed: today,
    kind: 'video',
  });
  const will = willItJson as {
    panel01: string;
    panelUnrevealed: string;
    tokens: { name: string; panel: number; previewHash: string }[];
  };
  push(rows, seen, {
    name: 'Will It.. · Panel 01',
    collection: 'A Familiar Burn',
    url: will.panel01,
    indexed: today,
    kind: 'image',
  });
  push(rows, seen, {
    name: 'Will It.. · Panel 01 · site',
    collection: 'A Familiar Burn',
    url: '/would-it/canvas-a.webp',
    indexed: today,
    kind: 'image',
  });
  push(rows, seen, {
    name: 'Will It.. · Panel 02 · site',
    collection: 'A Familiar Burn',
    url: '/would-it/canvas-b.webp',
    indexed: today,
    kind: 'image',
  });
  push(rows, seen, {
    name: 'Will It.. · Panel 02 · 5000px',
    collection: 'A Familiar Burn',
    url: '/would-it/canvas-b-full.jpg',
    indexed: today,
    kind: 'image',
  });
  push(rows, seen, {
    name: 'Will It.. · unrevealed',
    collection: 'A Familiar Burn',
    url: will.panelUnrevealed,
    indexed: today,
    kind: 'image',
  });
  for (const t of will.tokens) {
    const preview = rasterPreviewUrl(t.previewHash, 'image/2', 700);
    if (preview) {
      push(rows, seen, {
        name: t.name,
        collection: 'A Familiar Burn',
        url: preview,
        indexed: today,
        kind: 'image',
      });
    }
  }
  const embers = embersJson as {
    fetchedAt?: string;
    tokens?: {
      name?: string;
      image?: string;
      animationUrl?: string | null;
      tokenUri?: string;
      media1080?: string;
      posterUrl?: string;
      coverGif?: string;
    }[];
  };
  const embersIndexed = embers.fetchedAt ? embers.fetchedAt.slice(0, 10) : today;
  for (const t of embers.tokens || []) {
    const name = (t.name || 'Flutter Into The Embers').trim();
    if (t.media1080) {
      push(rows, seen, {
        name: `${name} · 1080p`,
        collection: 'A Familiar Burn',
        url: t.media1080,
        indexed: embersIndexed,
        kind: /\.mp4(\?|$)/i.test(t.media1080) ? 'video' : 'image',
      });
    }
    if (t.coverGif) {
      push(rows, seen, {
        name: `${name} · cover`,
        collection: 'A Familiar Burn',
        url: t.coverGif,
        indexed: embersIndexed,
        kind: 'gif',
      });
    } else if (t.posterUrl) {
      push(rows, seen, {
        name: `${name} · poster`,
        collection: 'A Familiar Burn',
        url: t.posterUrl,
        indexed: embersIndexed,
        kind: 'image',
      });
    }
    if (t.animationUrl) {
      push(rows, seen, {
        name: `${name} · 5k`,
        collection: 'A Familiar Burn',
        url: t.animationUrl,
        indexed: embersIndexed,
        kind: 'video',
      });
    }
    if (t.image) {
      push(rows, seen, {
        name: `${name} · still`,
        collection: 'A Familiar Burn',
        url: t.image,
        indexed: embersIndexed,
        kind: 'image',
      });
    }
    if (t.tokenUri) {
      push(rows, seen, {
        name: `${name} · metadata`,
        collection: 'A Familiar Burn',
        url: t.tokenUri,
        indexed: embersIndexed,
        kind: 'json',
      });
    }
  }
  for (const [piece, url] of Object.entries(FRAGMENT_SHARE_URLS)) {
    const n = Number(piece);
    const media = FRAGMENT_SITE_MEDIA[n];
    push(rows, seen, {
      name: `Fragment ${String(n).padStart(2, '0')} · 1080p`,
      collection: 'A Familiar Burn',
      url,
      indexed: today,
      kind: 'video',
    });
    if (media?.posterUrl) {
      push(rows, seen, {
        name: `Fragment ${String(n).padStart(2, '0')} · poster`,
        collection: 'A Familiar Burn',
        url: media.posterUrl,
        indexed: today,
        kind: kindFromUrl(media.posterUrl),
      });
    }
  }
  return rows.sort((a, b) => {
    const c = a.collection.localeCompare(b.collection);
    if (c) return c;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}
