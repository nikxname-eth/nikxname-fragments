export const BANNER_SIZES =
  '(max-width:680px) calc(100vw - 32px),(max-width:1100px) calc(100vw - 64px),1400px';

/** Bump when banner / fragment assets change — busts CDN & browser caches. */
export const SITE_ASSET_VERSION = '20260612c';

const makeBanner = (base: string) => ({
  src: `${base}?width=1400&quality=88&format=auto&v=${SITE_ASSET_VERSION}`,
  srcSet: [
    `${base}?width=640&quality=85&format=auto&v=${SITE_ASSET_VERSION} 640w`,
    `${base}?width=960&quality=85&format=auto&v=${SITE_ASSET_VERSION} 960w`,
    `${base}?width=1400&quality=88&format=auto&v=${SITE_ASSET_VERSION} 1400w`,
  ].join(', '),
});

const optimizeAssetImage = (url: string, width: number) =>
  `${url}?width=${width}&quality=82&format=auto&v=${SITE_ASSET_VERSION}`;

export const BANNER_DARK = makeBanner('https://assets.nikxart.xyz/Banner-Medium.jpg');
export const BANNER_LIGHT = makeBanner('https://assets.nikxart.xyz/main_grid_light_2500px.jpg');

/** Grid after Fragment 01 window closes — public reveal (Dark-2 / Light-2). */
export const PHASE_ONE_REVEAL_BANNER = {
  dark: 'https://assets.nikxart.xyz/Banner-Main-Dark-2.jpg',
  light: 'https://assets.nikxart.xyz/Banner-Main-Light-2.jpg',
};

/** Evolved banner per highest fragment held — puzzle piece revealed in the grid. */
export const EVOLVED_BANNERS: Record<number, { dark: string; light: string }> = {
  1: {
    dark: PHASE_ONE_REVEAL_BANNER.dark,
    light: PHASE_ONE_REVEAL_BANNER.light,
  },
  2: {
    dark: 'https://assets.nikxart.xyz/Banner-Main-Dark-3.jpg',
    light: 'https://assets.nikxart.xyz/Banner-Main-Light-3.jpg',
  },
};

export function getEvolvedBanner(pieceLevel: number, theme: 'dark' | 'light') {
  const urls = EVOLVED_BANNERS[pieceLevel];
  if (!urls) return null;
  return makeBanner(theme === 'dark' ? urls.dark : urls.light);
}

export function getPhaseOneRevealBanner(theme: 'dark' | 'light') {
  return makeBanner(theme === 'dark' ? PHASE_ONE_REVEAL_BANNER.dark : PHASE_ONE_REVEAL_BANNER.light);
}

export function isPhaseOneEnded(now = Date.now()): boolean {
  const f1 = DROP_SCHEDULE.find((entry) => entry.piece === 1);
  if (!f1) return false;
  return now >= Date.parse(getDropEndUTC(f1));
}

/** Resolve hero banner: holder evolution → post–Frag-01 reveal → original grid. */
export function getSiteBanner(options: {
  theme: 'dark' | 'light';
  highestOwnedPiece: number;
  now?: number;
}) {
  const { theme, highestOwnedPiece, now = Date.now() } = options;

  if (highestOwnedPiece > 0) {
    const evolved = getEvolvedBanner(highestOwnedPiece, theme);
    if (evolved) return evolved;
  }

  if (isPhaseOneEnded(now)) {
    return getPhaseOneRevealBanner(theme);
  }

  return theme === 'dark' ? BANNER_DARK : BANNER_LIGHT;
}

/**
 * Direct on-chain media URLs per fragment (from token metadata).
 * Used as fallback if metadata fetch is slow.
 */
export const ON_CHAIN_MEDIA: Record<number, string> = {
  1: 'https://bofrf7ruayhxwfcht2a3bw2h4hcfpulrekva5xqch6iky5j5o6ba.arweave.net/C4sS_jQGD3sUR56BsNtH4cRX0XEiqg7eAj-QrHU9d4I',
};

/** Web-optimised share downloads (Cloudflare CDN) — one URL per released fragment. */
export const FRAGMENT_SHARE_URLS: Record<number, string> = {
  1: 'https://assets.nikxart.xyz/Fragment-01-1080p.mp4',
  2: 'https://assets.nikxart.xyz/Fragment-02-1080p.mp4',
};

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
    posterUrl: optimizeAssetImage('https://assets.nikxart.xyz/PuzzlePc-PH01.jpg', 900),
    hasAudio: true,
  },
  2: {
    displayUrl: FRAGMENT_SHARE_URLS[2],
    posterUrl: 'https://assets.nikxart.xyz/frag_02_web.gif',
    teaserUrl: 'https://assets.nikxart.xyz/frag_02_web.gif',
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

/** Countdown targets the active phase window end (Frag 01 → Fri, then Frag 02 → Mon 15). */
export function getCountdownTarget(now = Date.now()): {
  piece: number;
  endsUTC: string;
  activeDrop: DropScheduleEntry;
} | null {
  if (isPhaseOneEnded(now)) {
    const f2 = getDropEntry(2);
    if (f2 && isDropWindowOpen(2, now)) {
      return { piece: 2, endsUTC: getDropEndUTC(f2), activeDrop: f2 };
    }
  }

  const f1 = getDropEntry(1);
  if (f1 && isDropWindowOpen(1, now)) {
    return { piece: 1, endsUTC: getDropEndUTC(f1), activeDrop: f1 };
  }

  const liveIdx = DROP_SCHEDULE.reduce(
    (acc, item, index) => (Date.parse(item.startsUTC) <= now ? index : acc),
    -1,
  );
  if (liveIdx >= 0) {
    const active = DROP_SCHEDULE[liveIdx];
    return { piece: active.piece, endsUTC: getDropEndUTC(active), activeDrop: active };
  }

  return null;
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

export function formatDropCloseNote(entry: DropScheduleEntry): string {
  const endDay = formatEastern(getDropEndUTC(entry), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return `through ${endDay}, 10 am EST`;
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