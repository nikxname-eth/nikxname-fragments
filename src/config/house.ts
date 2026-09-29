/** La Maison — rooms that open onto Explore. Copy stays in step with Explore leads. */

export const EXPLORE_ORIGIN = 'https://explore.nikxart.xyz';
export const GARDEN_URL = `${EXPLORE_ORIGIN}/garden`;
export const WILL_IT_URL = `${EXPLORE_ORIGIN}/will-it`;
export const SECONDARY_MARKET_URL = 'https://www.raster.art/artist/nikxname';

export type HouseRoom = {
  id: string;
  label: string;
  tagline: string;
  lead: string;
  href: string;
  image: string;
  imageAlt: string;
  /** CSS object-position for cover crops (e.g. Stiletto bud above midline). */
  objectPosition?: string;
};

function roomUrl(id: string) {
  return `${EXPLORE_ORIGIN}/${id}`;
}

export const HOUSE_ROOMS: HouseRoom[] = [
  {
    id: 'a-familiar-burn',
    label: 'A Familiar Burn',
    tagline: 'Together It Blooms · Fragments I-XXVII',
    lead: 'The full Blossom canvas above — still or animated — then all twenty-seven fragments in order.',
    href: roomUrl('a-familiar-burn'),
    image: 'https://assets.nikxart.xyz/BlossomFragments-Still.jpg',
    imageAlt: 'Blossom Fragments — Still',
  },
  {
    id: 'the-void',
    label: 'The Void',
    tagline: 'A journey into the depths of the abyss.',
    lead: 'A 44-piece impressionistic meditation on existence, framed by Into The Void and Into The Abyss.',
    href: roomUrl('the-void'),
    image: 'https://assets.nikxart.xyz/explore/feature/the-void/the-void-1.jpg',
    imageAlt: 'Into The Void',
  },
  {
    id: 'life-impressions',
    label: 'Life Impressions',
    tagline: 'Snapshots of transient beauty',
    lead: 'An evolving series of unique digital paintings — a visual testament to slowing down, and to the beauty of nature amid our fast-paced lives.',
    href: roomUrl('life-impressions'),
    image: 'https://arweave.net/go-fR7JoIbiBkS9yZNbyECNZcE861ty1CJXpIIMLumU',
    imageAlt: 'Life Impression 54 — Highway To Freedom..',
  },
  {
    id: 'for-her',
    label: 'For Her..',
    tagline: 'Intimate dedications · Base',
    lead: 'Dedicated to Moms around the world. A series of five roses — each with their own story to tell. Digital flowers, the kind that last forever.',
    href: roomUrl('for-her'),
    image: 'https://assets.nikxart.xyz/explore/feature/for-her/for-her-1.jpg',
    imageAlt: 'EtherRose — Stiletto',
    objectPosition: '50% 28%',
  },
  {
    id: 'for-you',
    label: 'For You..',
    tagline: 'Intimate dedications',
    lead: 'A 12-part love story in digitally painted roses — gifting art over ephemeral flowers, at a cost comparable to the real thing.',
    href: roomUrl('for-you'),
    image: 'https://assets.nikxart.xyz/explore/feature/for-you/for-you-1.jpg',
    imageAlt: 'The Letter',
  },
  {
    id: 'one-of-ones',
    label: '1 of 1s',
    tagline: 'Singular works',
    lead: 'One-of-one digital paintings and animated works — complete worlds, each a unique on-chain object.',
    href: roomUrl('one-of-ones'),
    image: 'https://assets.nikxart.xyz/explore/feature/one-of-ones/one-of-ones-1.jpg',
    imageAlt: 'Reflection Of Self',
  },
];

/** Cloudflare Image Resizing on assets.nikxart.xyz */
export function houseImage(url: string, width = 1800): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('assets.nikxart.xyz')) return url;
    if (u.pathname.includes('/cdn-cgi/image/')) return url;
    const path = u.pathname.replace(/^\//, '');
    return `${u.origin}/cdn-cgi/image/width=${width},quality=82,format=auto,fit=scale-down/${path}`;
  } catch {
    return url;
  }
}
