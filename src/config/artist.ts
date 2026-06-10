export const BANNER_SIZES =
  '(max-width:680px) calc(100vw - 32px),(max-width:1100px) calc(100vw - 64px),1400px';

const makeBanner = (base: string) => ({
  src: `${base}?width=1400&quality=88&format=auto`,
  srcSet: [
    `${base}?width=640&quality=85&format=auto 640w`,
    `${base}?width=960&quality=85&format=auto 960w`,
    `${base}?width=1400&quality=88&format=auto 1400w`,
  ].join(', '),
});

const optimizeAssetImage = (url: string, width: number) =>
  `${url}?width=${width}&quality=82&format=auto`;

export const BANNER_DARK = makeBanner('https://assets.nikxart.xyz/Banner-Medium.jpg');
export const BANNER_LIGHT = makeBanner('https://assets.nikxart.xyz/main_grid_light_2500px.jpg');

/** Evolved banner per fragment collected — puzzle piece revealed in the grid. */
export const EVOLVED_BANNERS: Record<number, { dark: string; light: string }> = {
  1: {
    dark: 'https://assets.nikxart.xyz/Banner-Main-Dark-2.jpg',
    light: 'https://assets.nikxart.xyz/Banner-Main-Light-2.jpg',
  },
};

export function getEvolvedBanner(pieceLevel: number, theme: 'dark' | 'light') {
  const urls = EVOLVED_BANNERS[pieceLevel];
  if (!urls) return null;
  return makeBanner(theme === 'dark' ? urls.dark : urls.light);
}

/**
 * Direct on-chain media URLs per fragment (from token metadata).
 * Used as fallback if metadata fetch is slow.
 * Fragment 01: Arweave gateway for the minted ERC-721 token media.
 */
export const ON_CHAIN_MEDIA: Record<number, string> = {
  1: 'https://bofrf7ruayhxwfcht2a3bw2h4hcfpulrekva5xqch6iky5j5o6ba.arweave.net/C4sS_jQGD3sUR56BsNtH4cRX0XEiqg7eAj-QrHU9d4I',
};

/** Full-resolution on-chain source for Theatre view — add per fragment as they drop. */
export const THEATRE_PREP_MESSAGES = [
  'Take a moment..',
  'Slow down..',
  'Breathe..',
] as const;

export function getTheatreSource(piece: number): { url: string; formatHint?: string } | null {
  const url = ON_CHAIN_MEDIA[piece];
  if (!url) return null;
  return { url, formatHint: 'gif' };
}

/** Web-optimised share downloads (Cloudflare CDN) — one URL per released fragment. */
export const FRAGMENT_SHARE_URLS: Record<number, string> = {
  1: 'https://assets.nikxart.xyz/Fragment-01-1080p.mp4',
};

/**
 * Web-optimised playback assets (Cloudflare CDN).
 * Add a row when each fragment drops.
 */
export const FRAGMENT_SITE_MEDIA: Record<
  number,
  {
    displayUrl: string;
    posterUrl?: string;
    hasAudio?: boolean;
  }
> = {
  1: {
    displayUrl: FRAGMENT_SHARE_URLS[1],
    posterUrl: optimizeAssetImage('https://assets.nikxart.xyz/PuzzlePc-PH01.jpg', 900),
    hasAudio: true,
  },
};

/**
 * On-chain tokenURI markers for each fragment's Manifold claim mints.
 * Only tokens matching these are counted in collection / banner evolution.
 * (Earlier contract tokens 1–5 used legacy metadata and are excluded.)
 */
export const FRAGMENT_CLAIM_URI_MARKERS: Record<number, string[]> = {
  1: ['y59jKPO1M12WQ81y-h4sRouWXegvhxYV_Wxg1ccjyQk'],
};

/** Manifold claim instance per fragment — add a row when each piece drops. */
export const CLAIM_INSTANCES: Record<
  number,
  { instanceId: string; manifoldUrl: string; mintPrice: string }
> = {
  1: {
    instanceId: '4056113392',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4056113392',
    mintPrice: '0.00044 ETH',
  },
};

export type DropWindowType = 'launch' | 'weekend' | 'forty-eight';

export type DropScheduleEntry = {
  piece: number;
  startsUTC: string;
  windowType: DropWindowType;
  windowHours: number;
};

const DROP_LAUNCH_START_MS = Date.parse('2026-06-08T15:00:00Z');
const HOUR_MS = 3_600_000;

function toDropISO(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 19)}Z`;
}

function getDropWindowMeta(piece: number): Pick<DropScheduleEntry, 'windowType' | 'windowHours'> {
  if (piece === 1) return { windowType: 'launch', windowHours: 96 };
  if (piece % 3 === 2) return { windowType: 'weekend', windowHours: 72 };
  return { windowType: 'forty-eight', windowHours: 48 };
}

/** Fragment 01: Mon 10am EST (96h). Then weekend → 48h → 48h, repeating through 27. */
function buildDropSchedule(): DropScheduleEntry[] {
  const schedule: DropScheduleEntry[] = [];
  let t = DROP_LAUNCH_START_MS;

  for (let piece = 1; piece <= 27; piece++) {
    const meta = getDropWindowMeta(piece);
    schedule.push({ piece, startsUTC: toDropISO(t), ...meta });
    t += meta.windowHours * HOUR_MS;
  }

  return schedule;
}

export const DROP_SCHEDULE = buildDropSchedule();

function formatEastern(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    ...options,
  });
}

export function getDropEndUTC(entry: DropScheduleEntry): string {
  const next = DROP_SCHEDULE.find((item) => item.piece === entry.piece + 1);
  if (next) return next.startsUTC;
  return toDropISO(Date.parse(entry.startsUTC) + entry.windowHours * HOUR_MS);
}

export function getDropWindowNote(entry: DropScheduleEntry): string {
  const endDay = formatEastern(getDropEndUTC(entry), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  switch (entry.windowType) {
    case 'launch':
      return `four days · through ${endDay}, 10 am EST`;
    case 'weekend':
      return `over the weekend · through ${endDay}, 10 am EST`;
    case 'forty-eight':
      return `48 hours · through ${endDay}, 10 am EST`;
  }
}

export function formatDropArrivalNote(entry: DropScheduleEntry): string {
  const startDay = formatEastern(entry.startsUTC, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  switch (entry.windowType) {
    case 'launch':
      return `${startDay} — 10 am EST · four days`;
    case 'weekend':
      return `${startDay} — 10 am EST · over the weekend`;
    case 'forty-eight':
      return `${startDay} — 10 am EST · 48 hours`;
  }
}

/** Pinned X post introducing Together It Blooms / Fragment 01. */
export const PROJECT_X_ARTICLE = 'https://x.com/Nikxname/status/2064076924138172738';

export const PREVIEW_MODE = false;

export const PIECE_NAMES: Record<number, string> = {
  1: 'Fragment I',
  2: 'Fragment II',
  3: 'Fragment III',
  4: 'Fragment IV',
  5: 'Fragment V',
  6: 'Fragment VI',
  7: 'Fragment VII',
  8: 'Fragment VIII',
  9: 'Fragment IX',
  10: 'Fragment X',
  11: 'Fragment XI',
  12: 'Fragment XII',
  13: 'Fragment XIII',
  14: 'Fragment XIV',
  15: 'Fragment XV',
  16: 'Fragment XVI',
  17: 'Fragment XVII',
  18: 'Fragment XVIII',
  19: 'Fragment XIX',
  20: 'Fragment XX',
  21: 'Fragment XXI',
  22: 'Fragment XXII',
  23: 'Fragment XXIII',
  24: 'Fragment XXIV',
  25: 'Fragment XXV',
  26: 'Fragment XXVI',
  27: 'Fragment XXVII',
};

export const SHARE_PIECES: {
  number: number;
  label: string;
  thumbUrl: string;
  downloadUrl: string;
  downloadName: string;
}[] = Object.entries(FRAGMENT_SHARE_URLS)
  .map(([piece, downloadUrl]) => {
    const number = Number(piece);
    const media = FRAGMENT_SITE_MEDIA[number];
    return {
      number,
      label: PIECE_NAMES[number] ?? `Fragment ${number}`,
      thumbUrl: media?.posterUrl
        ? optimizeAssetImage(media.posterUrl.split('?')[0], 480)
        : downloadUrl,
      downloadUrl,
      downloadName: `Fragment-${String(number).padStart(2, '0')}-1080p.mp4`,
    };
  })
  .sort((a, b) => a.number - b.number);