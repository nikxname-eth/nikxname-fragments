/**
 * Post–Fragment 27 culmination — timing, Blossom media, VIP allotments, claims.
 *
 * Phases (Eastern):
 *  1) F27 mint window open → normal site
 *  2) F27 closed → lockdown (puzzle piece)
 *  3) Same day 4:00pm ET → portal LIVE (verify full set → /fragment)
 *
 * Manifold instance IDs: fill after Token IDs from Manifold.
 */

import { getDropEndUTC, getDropEntry, FINAL_FRAGMENT_PIECE } from './artist';

/** Public culmination domain (CF Pages custom domain → /fragment). */
export const FINALE_PORTAL_URL = 'https://fragment.nikxart.xyz';

/** Same-origin path while domain is wired. */
export const FINALE_PATH = '/fragment';

/**
 * Portal unlock: Thursday 13 Aug 2026, 4:00pm America/New_York (EDT = UTC-4).
 */
export const FINALE_PORTAL_ACTIVE_UTC = '2026-08-13T20:00:00Z';

/** @deprecated prefer FINALE_PORTAL_ACTIVE_UTC */
export const FINALE_PORTAL_OPENS_AT = new Date(FINALE_PORTAL_ACTIVE_UTC);

export type FinalePhase = 'live-mint' | 'lockdown' | 'portal' | 'before';

export function getFragment27EndMs(): number {
  const entry = getDropEntry(FINAL_FRAGMENT_PIECE);
  if (!entry) return Date.parse(FINALE_PORTAL_ACTIVE_UTC);
  return Date.parse(getDropEndUTC(entry));
}

export function getFinalePortalActiveMs(): number {
  return Date.parse(FINALE_PORTAL_ACTIVE_UTC);
}

export function getFinalePhase(now = Date.now()): FinalePhase {
  const f27End = getFragment27EndMs();
  const portalAt = getFinalePortalActiveMs();
  if (now < f27End) return 'live-mint';
  if (now < portalAt) return 'lockdown';
  return 'portal';
}

export function isSiteLockdown(now = Date.now()): boolean {
  const phase = getFinalePhase(now);
  return phase === 'lockdown' || phase === 'portal';
}

export function isFinalePortalLive(now = Date.now()): boolean {
  return getFinalePhase(now) === 'portal';
}

/** Preview: ?finale=lockdown | ?finale=portal */
export function getFinalePhaseOverride(): FinalePhase | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search).get('finale');
  if (p === 'lockdown' || p === 'portal' || p === 'live-mint') return p;
  return null;
}

export function resolveFinalePhase(now = Date.now()): FinalePhase {
  return getFinalePhaseOverride() ?? getFinalePhase(now);
}

/* ── Blossom media (R2) ─────────────────────────────────── */

export const BLOSSOM_MEDIA = {
  still: 'https://assets.nikxart.xyz/BlossomFragments-Still.jpg',
  /** Prefer highest-res master; falls back to 4K if the client cannot play it. */
  animate: 'https://assets.nikxart.xyz/BlossomFragments-Animate-11K.mp4',
  animate4k: 'https://assets.nikxart.xyz/BlossomFragments-Animate-4k.mp4',
  cover: 'https://assets.nikxart.xyz/BlossomFragments-Cover.gif',
} as const;

/** Ordered highest → backup for <video> source selection. */
export const BLOSSOM_ANIMATE_SOURCES = [
  BLOSSOM_MEDIA.animate,
  BLOSSOM_MEDIA.animate4k,
] as const;

/** Delay before “view animated” appears on still (ms). */
export const STILL_TO_ANIMATE_DELAY_MS = 9000;

/** Animated sequence plays this many times before evolving to still + claims. */
export const ANIMATE_LOOP_COUNT = 2;

/** Brief settle before claim banner (ms). Claim viewer opens right after. */
export const RESOLVE_TO_CLAIM_MS = 600;

export const FINALE_COPY = {
  thankYou:
    'Thank you for taking your precious time and energy to be part of this Art Experience',
  lockdownWaiting: 'The final window has closed. The portal opens today at 4:00pm Eastern.',
  lockdownLive: 'Connect wallet & click the puzzle to verify you hold all 27 Fragments.',
  verifyScanning: 'Reading your wallet against the contract…',
  verifyIncomplete: 'This wallet does not yet hold a complete set of Fragments 1–27.',
  verifyComplete: (sets: number) =>
    sets === 1
      ? 'Complete set verified. Opening your finale…'
      : `${sets} complete sets verified. Opening your finale…`,
  claimHint: (sets: number, remaining: number) =>
    sets <= 0
      ? 'A complete set of all 27 Fragments is required to claim.'
      : remaining <= 0
        ? 'All claim rights for this wallet have been used.'
        : sets === 1
          ? 'You may claim 1 Blossom edition with this set.'
          : `You hold ${sets} complete sets — up to ${remaining} Blossom claim${remaining === 1 ? '' : 's'} remaining.`,
  pieceReveal: 'Click the golden fragment to open the canvas.',
  exploreStill: 'Explore the canvas…',
  viewAnimated: 'View animated version',
  continueToClaim: 'Continue to claim',
} as const;

/** Delay before skip-to-claim appears during animated playback (ms). */
export const ANIMATE_SKIP_CLAIM_MS = 2500;

/* ── Claim options (Still | Animated only) ──────────────── */

export type FinaleRewardId = 'still' | 'animated';

export type FinaleRewardMeta = {
  artist: string;
  dimensions: string;
  medium: string;
  year: string;
};

export type FinaleReward = {
  id: FinaleRewardId;
  title: string;
  subtitle: string;
  description: string;
  ratio: string;
  aspect: `${number}/${number}`;
  previewUrl: string;
  motionUrl?: string;
  mediaType: 'image' | 'video';
  /**
   * Manifold claim instance id — leave empty until Token IDs land.
   */
  instanceId: string;
  mintPrice: string;
  meta: FinaleRewardMeta;
};

export const FINALE_REWARDS: FinaleReward[] = [
  {
    id: 'still',
    title: 'Blossom Fragments — Still',
    subtitle: 'The resolved canvas as a still master',
    description:
      'Explore every detail with the magnifier, then claim your allotted still edition.',
    ratio: 'Master',
    aspect: '3/1',
    previewUrl: BLOSSOM_MEDIA.still,
    mediaType: 'image',
    instanceId: '4039463152', // https://manifold.xyz/@nikxnames-art/id/4039463152
    mintPrice: 'Claim',
    meta: {
      artist: 'Nikxname',
      dimensions: '15,000px × 5,000px',
      medium: 'Hand Painted On Digital Canvas',
      year: '2026',
    },
  },
  {
    id: 'animated',
    title: 'Blossom Fragments — Animated',
    subtitle: '11K motion sequence of the full reveal',
    description: 'Claim your allotted animated edition of the blossom sequence.',
    ratio: '11K',
    aspect: '16/9',
    previewUrl: BLOSSOM_MEDIA.cover,
    motionUrl: BLOSSOM_MEDIA.animate,
    mediaType: 'video',
    instanceId: '4039465200', // https://manifold.xyz/@nikxnames-art/id/4039465200
    mintPrice: 'Claim',
    meta: {
      artist: 'Nikxname',
      dimensions: '11,520px × 3,840px',
      medium: 'Hand Painted On Digital Canvas Animated Frame by Frame',
      year: '2026',
    },
  },
];

export function getFinaleReward(id: FinaleRewardId): FinaleReward | undefined {
  return FINALE_REWARDS.find((r) => r.id === id);
}

export function finaleRewardReady(reward: FinaleReward): boolean {
  return Boolean(reward.instanceId && reward.instanceId.length > 4);
}

export function manifoldClaimUrl(instanceId: string): string {
  return `https://manifold.xyz/@nikxnames-art/id/${instanceId}`;
}

/* ── VIP guests + claim codes (allotment = claimEntries.length) ── */

export type FinaleClaimEntry = {
  /** Display name on the code (matches roster) */
  holder: string;
  code: string;
};

export type FinaleGuest = {
  address: string;
  /** Primary name for greeting */
  name: string;
  /** Other people on the same wallet (e.g. Geoff with Robbie) */
  alsoKnownAs?: string[];
  ensOrHandles: string[];
  /** Each code is owned by a named holder — allotment = length */
  claimEntries: FinaleClaimEntry[];
};

/**
 * Canonical AFB finale roster (addresses lowercase for lookup).
 * | Wallet | Profile(s) | Codes |
 * |--------|------------|-------|
 * | 0x38f55f77…037e eyequeen.eth | Yen | 1 |
 * | 0x4b3dcc15…5541 leadwithlove.eth | Robbie | 3 |
 * | 0xc58adc69…85bf 2009Block0 | Geoff | 2 |
 * | 0x3d85e3b4…7810 TheMrsLv | Liette | 2 |
 * | 0xcc3bcddc…42c7 Sir Mavv | Mavv | 1 |
 * | 0x173820fc…968d dropbearvisuals.eth | Michael | 1 |
 * | 0x121fded4…1e1e RIP | RIP | 1 |
 * | 0x81c306bc…0763 Nikx | Nikx | 7 |
 * | 0x50221b1d…f487 Vanta | Vanta | 2 |
 * | 0x094e7af7…d9d2 Martin | Martin | 1 |
 */
export const FINALE_GUESTS: FinaleGuest[] = [
  {
    address: '0x38f55f77ce4087e1c3fbf4873fec69f2a2c2037e',
    name: 'Yen',
    ensOrHandles: ['eyequeen.eth'],
    claimEntries: [{ holder: 'Yen', code: 'AFB-YEN-01-A4B7' }],
  },
  {
    address: '0x4b3dcc15a8ab43128210fe3327bc830c36a15541',
    name: 'Robbie',
    ensOrHandles: ['leadwithlove.eth'],
    claimEntries: [
      { holder: 'Robbie', code: 'AFB-ROBBIE-01-C9F2' },
      { holder: 'Robbie', code: 'AFB-ROBBIE-02-E3A1' },
      { holder: 'Robbie', code: 'AFB-ROBBIE-03-F8D6' },
    ],
  },
  {
    address: '0xc58adc6945966c04c74efc5a045fec55a03685bf',
    name: 'Geoff',
    ensOrHandles: ['2009Block0'],
    claimEntries: [
      { holder: 'Geoff', code: 'AFB-GEOFF-01-B5C3' },
      { holder: 'Geoff', code: 'AFB-GEOFF-02-D7A4' },
    ],
  },
  {
    address: '0x3d85e3b4bb7cfc6225110e3a9c2c35a5b7e97810',
    name: 'Liette',
    ensOrHandles: ['TheMrsLv'],
    claimEntries: [
      { holder: 'Liette', code: 'AFB-LIETTE-01-F2E8' },
      { holder: 'Liette', code: 'AFB-LIETTE-02-A9C1' },
    ],
  },
  {
    address: '0xcc3bcddc1bf219a88e28c2f400f4a30a466f42c7',
    name: 'Mavv',
    ensOrHandles: ['Sir Mavv'],
    claimEntries: [{ holder: 'Mavv', code: 'AFB-MAVV-01-E4B7' }],
  },
  {
    address: '0x173820fc6e6f8d4f85a7a7e186e5852e1b4a968d',
    name: 'Michael',
    ensOrHandles: ['dropbearvisuals.eth'],
    claimEntries: [{ holder: 'Michael', code: 'AFB-MICHAEL-01-D3F2' }],
  },
  {
    address: '0x121fded4df77dedca7f7ae13dc2995d64b421e1e',
    name: 'RIP',
    ensOrHandles: ['RIP'],
    claimEntries: [{ holder: 'RIP', code: 'AFB-RIP-01-B8A4' }],
  },
  {
    address: '0x81c306bcdc036f334ef4fb8f85a8e6be730a0763',
    name: 'Nikx',
    ensOrHandles: ['Nikx'],
    claimEntries: [
      { holder: 'Nikx', code: 'AFB-NIKX-01-C5E9' },
      { holder: 'Nikx', code: 'AFB-NIKX-02-F1A3' },
      { holder: 'Nikx', code: 'AFB-NIKX-03-D7B2' },
      { holder: 'Nikx', code: 'AFB-NIKX-04-E8F6' },
      { holder: 'Nikx', code: 'AFB-NIKX-05-A2C4' },
      { holder: 'Nikx', code: 'AFB-NIKX-06-B9D1' },
      { holder: 'Nikx', code: 'AFB-NIKX-07-F4E7' },
    ],
  },
  {
    address: '0x50221b1df389649721f16df208f820138615f487',
    name: 'Vanta',
    ensOrHandles: ['Vanta'],
    claimEntries: [
      { holder: 'Vanta', code: 'AFB-VANTA-01-A3C9' },
      { holder: 'Vanta', code: 'AFB-VANTA-02-E7B2' },
    ],
  },
  {
    address: '0x094e7af740db3c79dd47a9594d6dedbf1607d9d2',
    name: 'Martin',
    ensOrHandles: ['Martin'],
    claimEntries: [{ holder: 'Martin', code: 'AFB-MARTIN-01-D8F4' }],
  },
];

/** Total codes across roster (Yen1 + R3 + G2 + L2 + Mav1 + Mic1 + RIP1 + Nikx7 + Van2 + Mar1 = 21). */
export const FINALE_ROSTER_CODE_COUNT = FINALE_GUESTS.reduce(
  (n, g) => n + g.claimEntries.length,
  0,
);

/**
 * Permanently claimed on-site codes (confirmed complete — cannot remint via site gate).
 * Vanta, RIP, Geoff fully claimed; all other roster codes remain open.
 */
export const FINALE_PERMANENTLY_CLAIMED_CODES: readonly string[] = [
  // Vanta — both
  'AFB-VANTA-01-A3C9',
  'AFB-VANTA-02-E7B2',
  // RIP — one
  'AFB-RIP-01-B8A4',
  // Geoff — both
  'AFB-GEOFF-01-B5C3',
  'AFB-GEOFF-02-D7A4',
] as const;

const PERMANENT_CLAIMED_SET = new Set(
  FINALE_PERMANENTLY_CLAIMED_CODES.map((c) => c.toUpperCase()),
);

export function isFinaleCodePermanentlyClaimed(code: string): boolean {
  return PERMANENT_CLAIMED_SET.has(code.trim().toUpperCase());
}

/** All permanently claimed codes for a wallet (from roster + permanent list). */
export function getPermanentClaimedCodesForWallet(
  address: string | undefined | null,
): string[] {
  const guest = findFinaleGuest(address);
  if (!guest) return [];
  return guest.claimEntries
    .map((e) => e.code.toUpperCase())
    .filter((c) => PERMANENT_CLAIMED_SET.has(c));
}

export function isFinaleWalletFullyClaimed(address: string | undefined | null): boolean {
  const guest = findFinaleGuest(address);
  if (!guest || guest.claimEntries.length === 0) return false;
  return guest.claimEntries.every((e) => PERMANENT_CLAIMED_SET.has(e.code.toUpperCase()));
}

/** Normalize 0x addresses for roster lookup (trim + lowercase). */
export function normalizeWalletAddress(
  address: string | undefined | null,
): `0x${string}` | undefined {
  if (!address) return undefined;
  const t = String(address).trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(t)) return undefined;
  return t.toLowerCase() as `0x${string}`;
}

export function findFinaleGuest(address: string | undefined | null): FinaleGuest | null {
  const a = normalizeWalletAddress(address);
  if (!a) return null;
  return FINALE_GUESTS.find((g) => g.address.toLowerCase() === a) ?? null;
}

export type FinaleAllotment = {
  allotted: number;
  guest: FinaleGuest | null;
  /** Flat codes for slot count / simple lists */
  codes: string[];
  /** Named entries for UI (holder + code) */
  claimEntries: FinaleClaimEntry[];
  onChainSets: number;
};

/**
 * How many editions this wallet may claim.
 * VIP list codes win when present; otherwise on-chain complete sets.
 */
export function getClaimAllotment(
  address: string | undefined | null,
  onChainCompleteSets: number,
): FinaleAllotment {
  const guest = findFinaleGuest(address);
  if (guest) {
    return {
      allotted: guest.claimEntries.length,
      guest,
      codes: guest.claimEntries.map((e) => e.code),
      claimEntries: guest.claimEntries,
      onChainSets: onChainCompleteSets,
    };
  }
  return {
    allotted: Math.max(0, onChainCompleteSets),
    guest: null,
    codes: [],
    claimEntries: [],
    onChainSets: onChainCompleteSets,
  };
}

export function guestGreeting(guest: FinaleGuest | null, fallback = 'Collector'): string {
  if (!guest) return fallback;
  if (guest.alsoKnownAs?.length) {
    return `${guest.name} & ${guest.alsoKnownAs.join(' & ')}`;
  }
  return guest.name;
}

/** ENS / handle line for claim UI */
export function guestHandleLine(guest: FinaleGuest | null): string {
  if (!guest?.ensOrHandles?.length) return '';
  return guest.ensOrHandles.join(' · ');
}

/**
 * Portal → finale handoff.
 * Chrome often gives new tabs empty sessionStorage when opened with noopener,
 * so we write sessionStorage + localStorage and also pass ?w=&sets= on the URL.
 */
export const FINALE_SESSION_KEY = 'nikxart:finale-sets';
/** localStorage twin — survives new-tab / Chrome sessionStorage isolation */
export const FINALE_SESSION_LOCAL_KEY = 'nikxart:finale-sets:v1';
const FINALE_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 48; // 48h

export type FinaleSessionPayload = {
  sets: number;
  at: number;
  address?: string;
};

function parseFinalePayload(raw: string | null): FinaleSessionPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FinaleSessionPayload;
    if (typeof parsed.sets !== 'number' || parsed.sets < 0) return null;
    if (typeof parsed.at === 'number' && Date.now() - parsed.at > FINALE_SESSION_MAX_AGE_MS) {
      return null;
    }
    if (parsed.address) {
      parsed.address = normalizeWalletAddress(parsed.address) ?? parsed.address;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Persist portal verify so /fragment can resolve VIP codes even if sessionStorage is blank. */
export function writeFinaleSession(payload: FinaleSessionPayload): void {
  if (typeof window === 'undefined') return;
  const body: FinaleSessionPayload = {
    sets: payload.sets,
    at: payload.at || Date.now(),
    address: normalizeWalletAddress(payload.address) ?? payload.address,
  };
  const raw = JSON.stringify(body);
  try {
    sessionStorage.setItem(FINALE_SESSION_KEY, raw);
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(FINALE_SESSION_LOCAL_KEY, raw);
  } catch {
    /* private mode */
  }
}

export function readFinaleSession(): FinaleSessionPayload | null {
  if (typeof window === 'undefined') return null;

  // 1) URL handoff (most reliable across Chrome new tabs)
  try {
    const q = new URLSearchParams(window.location.search);
    const w = normalizeWalletAddress(q.get('w') || q.get('wallet'));
    const setsRaw = q.get('sets');
    const sets = setsRaw != null ? Number(setsRaw) : NaN;
    if (w || (Number.isFinite(sets) && sets >= 0)) {
      const fromUrl: FinaleSessionPayload = {
        sets: Number.isFinite(sets) && sets >= 0 ? sets : 1,
        at: Date.now(),
        address: w,
      };
      // Persist so refresh still works without query string
      writeFinaleSession(fromUrl);
      return fromUrl;
    }
  } catch {
    /* ignore */
  }

  // 2) sessionStorage (same-tab)
  const fromSession = parseFinalePayload(sessionStorage.getItem(FINALE_SESSION_KEY));
  if (fromSession?.address || (fromSession && fromSession.sets >= 1)) return fromSession;

  // 3) localStorage (cross-tab Chrome)
  try {
    const fromLocal = parseFinalePayload(localStorage.getItem(FINALE_SESSION_LOCAL_KEY));
    if (fromLocal?.address || (fromLocal && fromLocal.sets >= 1)) {
      // Re-seed sessionStorage for this tab
      try {
        sessionStorage.setItem(FINALE_SESSION_KEY, JSON.stringify(fromLocal));
      } catch {
        /* ignore */
      }
      return fromLocal;
    }
  } catch {
    /* ignore */
  }

  return fromSession;
}

/** Build /fragment URL with wallet + sets so claim codes load without storage. */
export function buildFinaleEntryUrl(
  origin: string,
  completeSets: number,
  wallet?: string,
): string {
  const params = new URLSearchParams();
  if (completeSets > 0) params.set('sets', String(completeSets));
  const w = normalizeWalletAddress(wallet);
  if (w) params.set('w', w);
  const q = params.toString();
  return `${origin}${FINALE_PATH}${q ? `?${q}` : ''}`;
}
