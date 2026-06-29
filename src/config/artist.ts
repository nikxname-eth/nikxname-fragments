/** Bump when banner / fragment assets change — busts CDN & browser caches. */
export const SITE_ASSET_VERSION = '20260626f09a';

/** Ambient site audio — toggled from nav. */
export const SITE_AUDIO_URL = 'https://assets.nikxart.xyz/siteaudio-09.mp3';
export const SITE_AUDIO_VOLUME = 0.3;

const optimizeAssetImage = (url: string, width: number) =>
  `${url}?width=${width}&quality=82&format=auto&v=${SITE_ASSET_VERSION}`;

/** Stage II animated grid banners — single source per theme. */
export const BANNER_GIF = {
  dark: 'https://assets.nikxart.xyz/BannerGridDark-09-web.gif',
  light: 'https://assets.nikxart.xyz/BannerGridLight-09-web.gif',
} as const;

const releasedCoverUrl = (piece: number) =>
  `https://assets.nikxart.xyz/stageii/releasedfragment${String(piece).padStart(2, '0')}.jpg`;

/** CDN share filenames — exact casing per asset (F01–02 hyphen; F03–06 lowercase p; F07–09 uppercase P). */
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
};

/** Hero banner — theme GIF only (no holder evolution variants). */
export function getSiteBanner(options: { theme: 'dark' | 'light' }) {
  const base = options.theme === 'dark' ? BANNER_GIF.dark : BANNER_GIF.light;
  return {
    src: `${base}?v=${SITE_ASSET_VERSION}`,
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

  return applyDropScheduleOverrides(schedule);
}

/** Manual window patches when a drop period differs from the generated cadence. */
function applyDropScheduleOverrides(schedule: DropScheduleEntry[]): DropScheduleEntry[] {
  const patched = schedule.map((entry) => ({ ...entry }));

  // Fragment 09: Fri Jun 26 11 am Eastern → Wed Jul 1 11 am Eastern.
  const f09StartMs = Date.parse('2026-06-26T15:00:00Z');
  const f09EndMs = Date.parse('2026-07-01T15:00:00Z');
  const f09Hours = (f09EndMs - f09StartMs) / HOUR_MS;

  const f08 = patched.find((entry) => entry.piece === 8);
  const f09 = patched.find((entry) => entry.piece === 9);
  if (f08 && f09) {
    const f08StartMs = Date.parse(f08.startsUTC);
    f08.windowHours = Math.max(0, (f09StartMs - f08StartMs) / HOUR_MS);
    f09.startsUTC = toDropISO(f09StartMs);
    f09.windowHours = f09Hours;
    f09.windowType = 'launch';
  }

  return patched;
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
  return DROP_SCHEDULE.filter(
    (entry) => isDropWindowEnded(entry.piece, now) && FRAGMENT_SITE_MEDIA[entry.piece],
  ).map((entry) => entry.piece);
}

/** The single active mint promoted to the primary slot (F2 replaces F1 when its window opens). */
export function getPrimaryLiveMintPiece(now = Date.now()): number | null {
  const active = DROP_SCHEDULE.find(
    (entry) => CLAIM_INSTANCES[entry.piece] && isDropWindowOpen(entry.piece, now),
  );
  return active?.piece ?? null;
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

export const ABOUT_COLLECTIONS = [
  { label: 'Together It Blooms', onSite: true as const },
  {
    label: 'Raster',
    href: 'https://www.raster.art/artwork/a-familiar-burn-by-nikxname',
    external: true as const,
  },
  {
    label: 'The Void',
    href: 'https://manifold.xyz/@nikxnames-art/p/thevoid',
    external: true as const,
  },
  {
    label: 'Life Impressions',
    href: 'https://manifold.xyz/@nikxnames-art/p/1913617113',
    external: true as const,
  },
  {
    label: '1/1 Artworks',
    href: 'https://manifold.xyz/@nikxnames-art/p/nikxname1of1s',
    external: true as const,
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