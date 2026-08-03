/** Bump when banner / fragment assets change — busts CDN & browser caches. */
export const SITE_ASSET_VERSION = '20260803f24a';

/** Ambient site audio — toggled from nav (loops). */
export const SITE_AUDIO_URL = 'https://assets.nikxart.xyz/TogetherItBloomsAudio.mp3';
export const SITE_AUDIO_VOLUME = 0.3;

const optimizeAssetImage = (url: string, width: number) =>
  `${url}?width=${width}&quality=82&format=auto&v=${SITE_ASSET_VERSION}`;

/** Generic dimmed preview for the next-window teaser (before a fragment cover exists). */
export const TEASER_PREVIEW_URL = `https://assets.nikxart.xyz/previewtmp.jpg?v=${SITE_ASSET_VERSION}`;

/**
 * Highest piece with hero banners + Theatre canvas stills on the CDN
 * (bump both together each evolution).
 *
 * IMPORTANT: This is not “what the site shows right now.” Hero banners and
 * Theatre canvas follow getCanvasStatePiece() / the live mint window — same
 * rule as the mint block. Deploying the next fragment’s assets early must NOT
 * advance banner or canvas until the current window closes and the new one opens.
 */
export const CANVAS_STATE_LATEST_PIECE = 24;

/** Latest banner piece on CDN — same number as canvas (always bump together). */
export const BANNER_LATEST_PIECE = CANVAS_STATE_LATEST_PIECE;

export function getBannerUrls(piece: number) {
  return {
    dark: `https://assets.nikxart.xyz/BannerGridDark-${piece}-web.gif`,
    light: `https://assets.nikxart.xyz/BannerGridLight-${piece}-web.gif`,
  } as const;
}

/** @deprecated Prefer getSiteBanner({ now }) — latest CDN pair only, not live display. */
export const BANNER_GIF = getBannerUrls(BANNER_LATEST_PIECE);

/** @deprecated Prefer getCanvasStatePiece() — alias of latest CDN upload piece. */
export const CANVAS_STATE_PIECE = CANVAS_STATE_LATEST_PIECE;

export function getCanvasStateUrls(piece: number) {
  return {
    dark: `https://assets.nikxart.xyz/canvasstatedark-${piece}.jpg`,
    light: `https://assets.nikxart.xyz/canvasstatelight-${piece}.jpg`,
  } as const;
}

const releasedCoverUrl = (piece: number) =>
  `https://assets.nikxart.xyz/stageii/releasedfragment${String(piece).padStart(2, '0')}.jpg`;

/** CDN share filenames — exact casing per asset (F01–02 hyphen; F03–06 lowercase p; F07+ uppercase P). */
const FRAGMENT_SHARE_URL_BY_PIECE: Record<number, string> = {
  1: 'https://assets.nikxart.xyz/Fragment-01-1080p.mp4',
  2: 'https://assets.nikxart.xyz/Fragment-02-1080p.mp4',
  3: 'https://assets.nikxart.xyz/Fragment-03_1080p.mp4',
  4: 'https://assets.nikxart.xyz/Fragment-04_1080p.mp4',
  5: 'https://assets.nikxart.xyz/Fragment-05_1080p.mp4',
  6: 'https://assets.nikxart.xyz/Fragment-06_1080p.mp4',
  7: 'https://assets.nikxart.xyz/Fragment-07_1080P.mp4',
  8: 'https://assets.nikxart.xyz/Fragment-08_1080P.mp4',
  9: 'https://assets.nikxart.xyz/Fragment-09_1080P.mp4',
  10: 'https://assets.nikxart.xyz/Fragment-10_1080P.mp4',
  11: 'https://assets.nikxart.xyz/Fragment-11_1080P.mp4',
  12: 'https://assets.nikxart.xyz/Fragment-12_1080P.mp4',
  13: 'https://assets.nikxart.xyz/Fragment-13_1080P.mp4',
  14: 'https://assets.nikxart.xyz/Fragment-14_1080P.mp4',
  15: 'https://assets.nikxart.xyz/Fragment-15_1080P.mp4',
  16: 'https://assets.nikxart.xyz/Fragment-16_1080P.mp4',
  17: 'https://assets.nikxart.xyz/Fragment-17_1080P.mp4',
  18: 'https://assets.nikxart.xyz/Fragment-18_1080P.mp4',
  19: 'https://assets.nikxart.xyz/Fragment-19_1080P.mp4',
  20: 'https://assets.nikxart.xyz/Fragment-20_1080P.mp4',
  21: 'https://assets.nikxart.xyz/Fragment-21_1080P.mp4',
  22: 'https://assets.nikxart.xyz/Fragment-22_1080P.mp4',
  23: 'https://assets.nikxart.xyz/Fragment-23_1080P.mp4',
  24: 'https://assets.nikxart.xyz/Fragment-24_1080P.mp4',
};

/**
 * Hero banner — theme GIF for the live mint window piece (not deploy-time latest).
 * Matches mint + Theatre canvas timing so early evolutions do not flash the next grid.
 */
export function getSiteBanner(options: {
  theme: 'dark' | 'light';
  piece?: number;
  now?: number;
}) {
  const piece = options.piece ?? getCanvasStatePiece(options.now);
  const urls = getBannerUrls(piece);
  const base = options.theme === 'dark' ? urls.dark : urls.light;
  return {
    piece,
    src: `${base}?v=${SITE_ASSET_VERSION}`,
  };
}

/**
 * Still canvas for Theatre — theme-matched, piece from live schedule (not deploy-time latest).
 * Pass `piece` to pin; otherwise uses getCanvasStatePiece(now).
 */
export function getCanvasStateStill(options: {
  theme: 'dark' | 'light';
  width?: number;
  piece?: number;
  now?: number;
}) {
  const piece = options.piece ?? getCanvasStatePiece(options.now);
  const urls = getCanvasStateUrls(piece);
  const base = options.theme === 'dark' ? urls.dark : urls.light;
  const width = options.width ?? 1600;
  return {
    piece,
    src: optimizeAssetImage(base, width),
    fullSrc: `${base}?v=${SITE_ASSET_VERSION}`,
  };
}

/**
 * Direct on-chain media URLs per fragment (from token metadata).
 * Used as fallback if metadata fetch is slow.
 */
export const ON_CHAIN_MEDIA: Record<number, string> = {
  1: 'https://bofrf7ruayhxwfcht2a3bw2h4hcfpulrekva5xqch6iky5j5o6ba.arweave.net/C4sS_jQGD3sUR56BsNtH4cRX0XEiqg7eAj-QrHU9d4I',
};

/** Web-optimised share downloads (Cloudflare CDN) — one URL per released fragment. */
export const FRAGMENT_SHARE_URLS: Record<number, string> = { ...FRAGMENT_SHARE_URL_BY_PIECE };

/**
 * Web-optimised playback assets (Cloudflare CDN).
 * MP4 preferred in the square frame — smoother loop + audio toggle.
 */
export const FRAGMENT_SITE_MEDIA: Record<
  number,
  {
    displayUrl: string;
    posterUrl?: string;
    hasAudio?: boolean;
    teaserUrl?: string;
  }
> = {
  1: {
    displayUrl: FRAGMENT_SHARE_URLS[1],
    posterUrl: releasedCoverUrl(1),
    hasAudio: true,
  },
  2: {
    displayUrl: FRAGMENT_SHARE_URLS[2],
    posterUrl: releasedCoverUrl(2),
    hasAudio: true,
  },
  3: {
    displayUrl: FRAGMENT_SHARE_URLS[3],
    posterUrl: releasedCoverUrl(3),
    hasAudio: true,
  },
  4: {
    displayUrl: FRAGMENT_SHARE_URLS[4],
    posterUrl: releasedCoverUrl(4),
    hasAudio: true,
  },
  5: {
    displayUrl: FRAGMENT_SHARE_URLS[5],
    posterUrl: releasedCoverUrl(5),
    hasAudio: true,
  },
  6: {
    displayUrl: FRAGMENT_SHARE_URLS[6],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment06.jpg',
    hasAudio: true,
  },
  7: {
    displayUrl: FRAGMENT_SHARE_URLS[7],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment07.jpg',
    hasAudio: true,
  },
  8: {
    displayUrl: FRAGMENT_SHARE_URLS[8],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment08.jpg',
    hasAudio: true,
  },
  9: {
    displayUrl: FRAGMENT_SHARE_URLS[9],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment09.jpg',
    hasAudio: true,
  },
  10: {
    displayUrl: FRAGMENT_SHARE_URLS[10],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment10.jpg',
    hasAudio: true,
  },
  11: {
    displayUrl: FRAGMENT_SHARE_URLS[11],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment11.jpg',
    hasAudio: true,
  },
  12: {
    displayUrl: FRAGMENT_SHARE_URLS[12],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment12.jpg',
    hasAudio: true,
  },
  13: {
    displayUrl: FRAGMENT_SHARE_URLS[13],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment13.jpg',
    hasAudio: true,
  },
  14: {
    displayUrl: FRAGMENT_SHARE_URLS[14],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment14.jpg',
    hasAudio: true,
  },
  15: {
    displayUrl: FRAGMENT_SHARE_URLS[15],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment15.jpg',
    hasAudio: true,
  },
  16: {
    displayUrl: FRAGMENT_SHARE_URLS[16],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment16.jpg',
    hasAudio: true,
  },
  17: {
    displayUrl: FRAGMENT_SHARE_URLS[17],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment17.jpg',
    hasAudio: true,
  },
  18: {
    displayUrl: FRAGMENT_SHARE_URLS[18],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment18.jpg',
    hasAudio: true,
  },
  19: {
    displayUrl: FRAGMENT_SHARE_URLS[19],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment19.jpg',
    hasAudio: true,
  },
  20: {
    displayUrl: FRAGMENT_SHARE_URLS[20],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment20.jpg',
    hasAudio: true,
  },
  21: {
    displayUrl: FRAGMENT_SHARE_URLS[21],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment21.jpg',
    hasAudio: true,
  },
  22: {
    displayUrl: FRAGMENT_SHARE_URLS[22],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment22.jpg',
    hasAudio: true,
  },
  23: {
    displayUrl: FRAGMENT_SHARE_URLS[23],
    posterUrl: 'https://assets.nikxart.xyz/releasedfragment23.jpg',
    hasAudio: true,
  },
  24: {
    displayUrl: FRAGMENT_SHARE_URLS[24],
    hasAudio: true,
  },
};

/**
 * On-chain tokenURI markers for each fragment's Manifold claim mints.
 * Only tokens matching these are counted in collection / banner evolution.
 */
export const FRAGMENT_CLAIM_URI_MARKERS: Record<number, string[]> = {
  1: ['y59jKPO1M12WQ81y-h4sRouWXegvhxYV_Wxg1ccjyQk'],
  2: ['tyMlGm_W8v-sIn8PyTWRKcGw3owGbfDGU-vOERVRksM'],
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
  2: {
    instanceId: '4058790128',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4058790128',
    mintPrice: '0.00044 ETH',
  },
  3: {
    instanceId: '4027818224',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4027818224',
    mintPrice: '0.00044 ETH',
  },
  4: {
    instanceId: '4027390192',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4027390192',
    mintPrice: '0.00044 ETH',
  },
  5: {
    instanceId: '4026896624',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4026896624',
    mintPrice: '0.00044 ETH',
  },
  6: {
    instanceId: '4030679280',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4030679280',
    mintPrice: '0.00044 ETH',
  },
  7: {
    instanceId: '4030071024',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4030071024',
    mintPrice: '0.00044 ETH',
  },
  8: {
    instanceId: '4029524208',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4029524208',
    mintPrice: '0.00044 ETH',
  },
  9: {
    instanceId: '4029038832',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4029038832',
    mintPrice: '0.00044 ETH',
  },
  10: {
    instanceId: '4032751856',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4032751856',
    mintPrice: '0.00044 ETH',
  },
  11: {
    instanceId: '4032102640',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4032102640',
    mintPrice: '0.00044 ETH',
  },
  12: {
    instanceId: '4031764720',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4031764720',
    mintPrice: '0.00044 ETH',
  },
  13: {
    instanceId: '4031072496',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4031072496',
    mintPrice: '0.00044 ETH',
  },
  14: {
    instanceId: '4034797808',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4034797808',
    mintPrice: '0 ETH',
  },
  15: {
    instanceId: '4033667312',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4033667312',
    mintPrice: '0.00044 ETH',
  },
  16: {
    instanceId: '4033071344',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4033071344',
    mintPrice: '0.00044 ETH',
  },
  17: {
    instanceId: '4036684016',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4036684016',
    mintPrice: '0.00044 ETH',
  },
  18: {
    instanceId: '4036370672',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4036370672',
    mintPrice: '0.00044 ETH',
  },
  19: {
    instanceId: '4035944688',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4035944688',
    mintPrice: '0.00044 ETH',
  },
  20: {
    instanceId: '4035268848',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4035268848',
    mintPrice: '0 ETH',
  },
  21: {
    instanceId: '4039002352',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4039002352',
    mintPrice: '0.00044 ETH',
  },
  22: {
    instanceId: '4038547696',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4038547696',
    mintPrice: '0.00044 ETH',
  },
  23: {
    instanceId: '4037951728',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4037951728',
    mintPrice: '0.00044 ETH',
  },
  24: {
    instanceId: '4037478640',
    manifoldUrl: 'https://manifold.xyz/@nikxnames-art/id/4037478640',
    mintPrice: '0.00044 ETH',
  },
};

/** Resolve fragment number from a Manifold claim instance id. */
export function getPieceNumberForInstanceId(instanceId: string | null | undefined): number {
  if (!instanceId) return 0;
  for (const [piece, claim] of Object.entries(CLAIM_INSTANCES)) {
    if (claim.instanceId === instanceId) return Number(piece);
  }
  return 0;
}

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

export function getDropEntry(piece: number): DropScheduleEntry | undefined {
  return DROP_SCHEDULE.find((item) => item.piece === piece);
}

export function getDropEndUTC(entry: DropScheduleEntry): string {
  const next = DROP_SCHEDULE.find((item) => item.piece === entry.piece + 1);
  if (next) return next.startsUTC;
  return toDropISO(Date.parse(entry.startsUTC) + entry.windowHours * HOUR_MS);
}

export function isDropWindowOpen(piece: number, now = Date.now()): boolean {
  const entry = getDropEntry(piece);
  if (!entry) return false;
  const start = Date.parse(entry.startsUTC);
  const end = Date.parse(getDropEndUTC(entry));
  return now >= start && now < end;
}

export function isDropWindowEnded(piece: number, now = Date.now()): boolean {
  const entry = getDropEntry(piece);
  if (!entry) return false;
  return now >= Date.parse(getDropEndUTC(entry));
}

/** Fragments whose mint windows have closed — shown in the released gallery. */
export function getReleasedFragments(now = Date.now()): number[] {
  const primary = getPrimaryLiveMintPiece(now);

  return DROP_SCHEDULE.filter((entry) => {
    if (!FRAGMENT_SITE_MEDIA[entry.piece]) return false;
    if (primary != null && entry.piece < primary) return true;
    return isDropWindowEnded(entry.piece, now);
  }).map((entry) => entry.piece);
}

/** The single active mint promoted to the primary slot (F2 replaces F1 when its window opens). */
export function getPrimaryLiveMintPiece(now = Date.now()): number | null {
  const active = DROP_SCHEDULE.find(
    (entry) => CLAIM_INSTANCES[entry.piece] && isDropWindowOpen(entry.piece, now),
  );
  return active?.piece ?? null;
}

/**
 * Canvas state for Theatre = the fragment currently in its mint window.
 * Falls back to the latest opened piece (never the next unopened evolution).
 * Matches mint timing so early deploys do not advance Theatre canvas early.
 */
export function getCanvasStatePiece(now = Date.now()): number {
  const live = getPrimaryLiveMintPiece(now);
  if (live != null) {
    return Math.min(live, CANVAS_STATE_LATEST_PIECE);
  }

  for (let piece = CANVAS_STATE_LATEST_PIECE; piece >= 1; piece--) {
    if (isDropWindowOpen(piece, now) || isDropWindowEnded(piece, now)) {
      return piece;
    }
  }

  return 1;
}

export function getFragmentThumbUrl(piece: number, width = 160): string | null {
  const media = FRAGMENT_SITE_MEDIA[piece];
  if (!media) return null;
  const base = (media.posterUrl ?? media.displayUrl).split('?')[0];
  return optimizeAssetImage(base, width);
}

/** Countdown targets the active mint window close (11 am Eastern). */
export function getCountdownTarget(now = Date.now()): {
  piece: number;
  endsUTC: string;
  activeDrop: DropScheduleEntry;
} | null {
  const active = DROP_SCHEDULE.find(
    (entry) => CLAIM_INSTANCES[entry.piece] && isDropWindowOpen(entry.piece, now),
  );
  if (!active) return null;
  return { piece: active.piece, endsUTC: getDropEndUTC(active), activeDrop: active };
}

function formatEastern(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    ...options,
  });
}

export function getDropWindowNote(entry: DropScheduleEntry): string {
  const endDay = formatEastern(getDropEndUTC(entry), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  switch (entry.windowType) {
    case 'launch': {
      const days = Math.round(entry.windowHours / 24);
      return `${days} days · through ${endDay}, 11 am Eastern`;
    }
    case 'weekend':
      return `over the weekend · through ${endDay}, 11 am Eastern`;
    case 'forty-eight':
      return `48 hours · through ${endDay}, 11 am Eastern`;
  }
}

export function formatDropArrivalNote(entry: DropScheduleEntry): string {
  const startDay = formatEastern(entry.startsUTC, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  switch (entry.windowType) {
    case 'launch': {
      const days = Math.round(entry.windowHours / 24);
      return `${startDay} — 11 am Eastern · ${days} days`;
    }
    case 'weekend':
      return `${startDay} — 11 am Eastern · over the weekend`;
    case 'forty-eight':
      return `${startDay} — 11 am Eastern · 48 hours`;
  }
}

export function getLivePieceIndex(now = Date.now()): number {
  return DROP_SCHEDULE.reduce(
    (acc, item, index) => (Date.parse(item.startsUTC) <= now ? index : acc),
    -1,
  );
}

function getMaxSharePiece(now = Date.now()): number {
  return Object.keys(FRAGMENT_SHARE_URLS).reduce((max, pieceKey) => {
    const piece = Number(pieceKey);
    if (isDropWindowEnded(piece, now) || isDropWindowOpen(piece, now)) {
      return Math.max(max, piece);
    }
    return max;
  }, 0);
}

/** Single schedule snapshot for the home page. */
export function getDropState(now = Date.now()) {
  const livePieceIdx = getLivePieceIndex(now);
  const livePieceNumber = livePieceIdx >= 0 ? livePieceIdx + 1 : 1;
  const dropsStarted = livePieceIdx >= 0;
  const primaryLivePiece = getPrimaryLiveMintPiece(now);
  const nextPiece = primaryLivePiece != null ? primaryLivePiece + 1 : null;
  const teaserPiece =
    primaryLivePiece != null &&
    nextPiece != null &&
    CLAIM_INSTANCES[nextPiece] &&
    !isDropWindowOpen(nextPiece, now)
      ? nextPiece
      : null;
  const countdownPhase = getCountdownTarget(now);

  return {
    livePieceNumber,
    dropsStarted,
    primaryLivePiece,
    teaserPiece,
    releasedFragments: getReleasedFragments(now),
    maxSharePiece: getMaxSharePiece(now),
    countdownPhase,
    countdownTarget:
      countdownPhase?.endsUTC ?? (dropsStarted ? null : DROP_SCHEDULE[0].startsUTC),
  };
}

/** About drawer footer tags — add one at a time. */
export const ABOUT_COLLECTIONS = [
  {
    label: 'Portfolio & Secondary',
    href: 'https://www.raster.art/artist/nikxname',
    external: true as const,
  },
  {
    label: 'Social | X',
    href: 'https://x.com/nikxname',
    external: true as const,
    icon: 'x' as const,
  },
] as const;

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
      downloadName: downloadUrl.split('/').pop() ?? `Fragment-${String(number).padStart(2, '0')}_1080p.mp4`,
    };
  })
  .sort((a, b) => a.number - b.number);