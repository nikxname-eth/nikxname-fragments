/**
 * AFB Finale — Blossom Fragments reveal + dual claim (Still | Animated).
 *
 * Flow:
 *   intro → thanks → golden piece → still (+ magnify) →
 *   animated (×2) → banner + claim options
 *
 * Allotment = VIP claim codes when listed, else on-chain complete sets.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ANIMATE_LOOP_COUNT,
  BLOSSOM_MEDIA,
  FINALE_COPY,
  FINALE_REWARDS,
  ANIMATE_SKIP_CLAIM_MS,
  RESOLVE_TO_CLAIM_MS,
  STILL_TO_ANIMATE_DELAY_MS,
  finaleRewardReady,
  getClaimAllotment,
  guestGreeting,
  guestHandleLine,
  normalizeWalletAddress,
  readFinaleSession,
  type FinaleReward,
} from '../config/finale';
import {
  ensureManifoldAuthenticated,
  readManifoldSession,
  refreshManifoldWidgets,
} from '../lib/manifoldConnect';
import {
  clearUsedFinaleCodes,
  ensurePermanentViewerAccess,
  getPendingFinaleCodes,
  getPermanentClaimedCount,
  getUsedFinaleCodes,
  hasFinaleViewerAccess,
  subscribeFinaleClaimsChanged,
} from '../lib/finaleClaimsStorage';
import {
  abortFinaleClaim,
  beginFinaleClaim,
  completeFinaleClaim,
  fetchRemoteClaimSnapshot,
  getBlockedFinaleCodes,
} from '../lib/finaleClaimRegistry';
import { isFinaleWalletFullyClaimed } from '../config/finale';
import { closeManifoldCheckout, watchCheckoutSuccess } from '../lib/manifoldCheckout';
import { MINT_COMPLETE_EVENT, type MintCompleteDetail } from '../lib/mintEvents';
import { verifyCompleteSets } from '../lib/setVerification';
import { useWallet } from '../providers/WalletProvider';
import { BlossomMagnifier } from './BlossomMagnifier';
import { BlossomVideo } from './BlossomVideo';
import { ClaimCodeChip } from './ClaimCodeChip';
import { ClaimSlotForm } from './ClaimSlotForm';

type Stage = 'intro' | 'thanks' | 'piece' | 'still' | 'animated' | 'claim';

/** Same E2 silhouette as lockdown portal — gold fill (not black img). */
const PIECE_PATH =
  'M458.753235,132.001770 C458.755554,127.504929 458.911346,123.500244 458.716980,119.512619 C458.535492,115.789352 460.113708,114.564713 463.730499,114.614639 C474.554260,114.764023 485.381500,114.678162 496.207306,114.655212 C498.665497,114.649994 501.366821,115.139023 502.906708,112.445747 C504.507050,109.646790 501.995697,108.244270 500.713654,106.448624 C497.899780,102.507446 497.817932,98.277412 500.012787,94.196426 C502.851837,88.917679 507.635498,86.115837 513.543701,86.370087 C519.176697,86.612488 523.864319,89.348610 526.276306,94.685829 C528.339600,99.251511 527.997375,103.727791 524.319092,107.620728 C523.056519,108.957001 521.935242,110.544472 523.131897,112.539101 C524.209473,114.335304 525.964783,114.650681 527.890137,114.648964 C538.882568,114.639183 549.874939,114.652794 560.867371,114.669273 C568.346252,114.680481 568.349060,114.688400 568.354614,121.933983 C568.362976,132.759827 568.380432,143.585693 568.361938,154.411484 C568.358093,156.682327 568.653259,158.818420 570.861877,160.004593 C573.127197,161.221252 574.559204,159.461060 576.136658,158.298141 C580.685181,154.944839 585.544250,154.707870 590.034729,157.600037 C594.858643,160.706970 597.863403,167.150391 596.823303,172.157471 C594.484741,183.415070 584.680969,187.368134 575.133057,180.890991 C573.714233,179.928467 572.325806,179.003052 570.572876,180.115707 C568.622009,181.353989 568.364502,183.301712 568.366272,185.365448 C568.375549,196.191299 568.379944,207.017136 568.386108,217.842987 C568.387024,219.508469 568.259827,221.186096 568.415771,222.836945 C568.758972,226.470062 567.239014,227.958939 563.570435,227.910278 C552.415222,227.762283 541.257080,227.838150 530.101440,227.710922 C527.554077,227.681854 524.953125,227.303482 523.362427,229.801300 C521.654236,232.483521 524.056213,234.034607 525.348206,235.861282 C528.263428,239.982986 528.286438,244.401672 525.802124,248.537292 C522.774963,253.576508 518.066467,256.580170 512.085144,256.056976 C506.462555,255.565186 501.988434,252.578796 499.673004,247.222885 C497.638885,242.517715 498.342804,238.128021 502.066162,234.365204 C503.140472,233.279495 504.019775,231.979416 503.250549,230.340515 C502.230774,228.167709 500.175049,227.953491 498.148071,227.946945 C487.322479,227.911987 476.496643,227.954941 465.671051,227.916885 C458.879700,227.893005 458.784637,227.764313 458.774231,220.822540 C458.757507,209.663651 458.677765,198.503906 458.790436,187.346207 C458.835815,182.852707 459.989441,182.322739 463.875916,184.489380 C471.188171,188.565842 478.085114,187.374481 483.553345,181.090286 C488.653503,175.229095 489.105164,166.402176 484.617584,160.291534 C479.136719,152.828323 471.728119,151.196396 463.718506,155.897446 C460.026398,158.064438 458.820740,156.498535 458.782257,152.986511 C458.707489,146.158859 458.756287,139.329834 458.753235,132.001770 Z';
const PIECE_VIEWBOX = '450 80 155 185';

function claimOrdinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function FinaleExperience() {
  const { address, isAuthenticated, sync } = useWallet();
  const [stage, setStage] = useState<Stage>('intro');
  const [sets, setSets] = useState(0);
  const [sessionWallet, setSessionWallet] = useState<string | undefined>();
  const [claimsUsed, setClaimsUsed] = useState(0);
  const [scanning, setScanning] = useState(true);
  const [scanError, setScanError] = useState('');
  const [showAnimateCta, setShowAnimateCta] = useState(false);
  const [animLoops, setAnimLoops] = useState(0);
  const [bannerMode, setBannerMode] = useState<'still' | 'animated'>('still');
  const [claiming, setClaiming] = useState<FinaleReward | null>(null);
  const [claimReveal, setClaimReveal] = useState(true);
  const [showSkipClaim, setShowSkipClaim] = useState(false);
  const [playLabel, setPlayLabel] = useState({ current: 1, total: ANIMATE_LOOP_COUNT });
  /** Codes successfully minted (wallet tx) — one right removed each */
  const [usedCodes, setUsedCodes] = useState<string[]>([]);
  /** Codes reserved in-flight (Claim now pressed) — hidden + blocked immediately */
  const [pendingCodes, setPendingCodes] = useState<string[]>([]);
  /** Code currently in flight (Claim now pressed, waiting for success) */
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const pendingCodeRef = useRef<string | null>(null);
  const pendingAttemptRef = useRef<string | null>(null);
  const pendingInstanceRef = useRef<string | null>(null);
  /** Only accept success that appears after this timestamp */
  const pendingSinceRef = useRef<number>(0);
  const consumedThisPendingRef = useRef(false);
  const [lastMintOk, setLastMintOk] = useState<string | null>(null);
  const [lastMintFail, setLastMintFail] = useState<string | null>(null);
  const [formReset, setFormReset] = useState(0);
  const [ledgerNote, setLedgerNote] = useState<string | null>(null);

  /**
   * Live Manifold wallet wins when present so claim codes match the connected user.
   * Portal session / URL / localStorage is the fallback (Chrome new-tab safe).
   */
  const wallet = normalizeWalletAddress(address ?? sessionWallet);
  const walletReady = Boolean(wallet);

  const allotment = useMemo(
    () => getClaimAllotment(wallet, sets),
    [wallet, sets],
  );
  const usedSet = useMemo(
    () => new Set(usedCodes.map((c) => c.toUpperCase())),
    [usedCodes],
  );
  const pendingSet = useMemo(
    () => new Set(pendingCodes.map((c) => c.toUpperCase())),
    [pendingCodes],
  );
  /** Codes still available to show / enter (not used, not in-flight) */
  const remainingEntries = useMemo(
    () =>
      allotment.claimEntries.filter((e) => {
        const k = e.code.toUpperCase();
        return !usedSet.has(k) && !pendingSet.has(k);
      }),
    [allotment.claimEntries, usedSet, pendingSet],
  );
  /** Confirmed mints only — rights permanently spent */
  const remaining = Math.max(0, allotment.allotted - usedCodes.length);
  /** Rights free for a new checkout (pending locks one right) */
  const availableRights = Math.max(0, remaining - pendingCodes.length);
  const greetName = guestGreeting(allotment.guest);
  const sessionKey = wallet?.toLowerCase() ?? 'session';
  const knownCodes = allotment.claimEntries
    .filter((e) => !usedSet.has(e.code.toUpperCase()))
    .map((e) => e.code);
  const blockedCodes = useMemo(() => getBlockedFinaleCodes(wallet), [wallet, usedCodes, pendingCodes]);
  /** Can still mint more editions */
  const canClaimMore = remaining > 0 && walletReady && allotment.allotted > 0;
  /** Returning claimant — viewer only / skip intro */
  const viewerAccess = Boolean(wallet && hasFinaleViewerAccess(wallet));

  const refreshLocalLedger = useCallback(() => {
    const used = getUsedFinaleCodes(wallet);
    const pending = getPendingFinaleCodes(wallet);
    setUsedCodes(used);
    setClaimsUsed(used.length);
    setPendingCodes(pending);
    // Keep active pending code if still reserved
    const active = pendingCodeRef.current;
    if (active && !pending.map((c) => c.toUpperCase()).includes(active.toUpperCase())) {
      if (used.map((c) => c.toUpperCase()).includes(active.toUpperCase())) {
        pendingCodeRef.current = null;
        setPendingCode(null);
      }
    }
  }, [wallet]);

  // Load permanent + local + remote ledger; skip intro → viewer when claimed
  useEffect(() => {
    refreshLocalLedger();
    ensurePermanentViewerAccess(wallet);
    if (wallet && hasFinaleViewerAccess(wallet)) {
      setStage('claim');
      setBannerMode('still');
      setClaimReveal(true);
    }
    let cancelled = false;
    void fetchRemoteClaimSnapshot(wallet).then((snap) => {
      if (cancelled || !snap) return;
      refreshLocalLedger();
    });
    return () => {
      cancelled = true;
    };
  }, [wallet, refreshLocalLedger]);

  // Cross-tab / storage updates
  useEffect(() => {
    return subscribeFinaleClaimsChanged(() => refreshLocalLedger());
  }, [refreshLocalLedger]);

  /**
   * Success-only: register mint, remove code, close claim UI → art viewer.
   * Watches while a code is pending (even if claim sheet closed).
   */
  useEffect(() => {
    if (!pendingCode) return;

    const consumeOne = (source: string) => {
      if (consumedThisPendingRef.current) return;
      const code = pendingCodeRef.current?.trim().toUpperCase();
      if (!code) return;
      if (!pendingSinceRef.current) return;
      // Block stale success UI from a previous mint
      const elapsed = Date.now() - pendingSinceRef.current;
      if (elapsed < 1_200) return;

      consumedThisPendingRef.current = true;
      const attemptId = pendingAttemptRef.current || undefined;
      const instanceId = pendingInstanceRef.current || claiming?.instanceId || undefined;

      void (async () => {
        const result = await completeFinaleClaim(wallet, code, {
          source,
          attemptId,
          instanceId,
        });
        refreshLocalLedger();
        pendingCodeRef.current = null;
        pendingAttemptRef.current = null;
        pendingInstanceRef.current = null;
        setPendingCode(null);
        setLastMintOk(code);
        setLastMintFail(null);
        setFormReset((n) => n + 1);
        setLedgerNote(
          result.remoteOk
            ? 'Mint registered · code secured'
            : 'Mint saved on this device · syncing ledger…',
        );

        try {
          closeManifoldCheckout();
        } catch {
          /* ignore */
        }
        setClaiming(null);
        setStage('claim');
        setBannerMode('still');
        refreshManifoldWidgets();

        // Background re-confirm if remote was down
        if (!result.remoteOk) {
          window.setTimeout(() => {
            void completeFinaleClaim(wallet, code, {
              source: `${source}:deferred`,
              attemptId,
              instanceId,
            }).then(() => refreshLocalLedger());
          }, 3_000);
        }

        window.setTimeout(() => setLastMintOk(null), 7_000);
        window.setTimeout(() => setLedgerNote(null), 8_000);
        // eslint-disable-next-line no-console
        console.info('[finale] mint success — code removed, art view', {
          code,
          source,
          remoteOk: result.remoteOk,
          remaining: Math.max(0, allotment.allotted - result.used.length),
        });
      })();
    };

    const onFail = (source: string) => {
      const code = pendingCodeRef.current?.trim().toUpperCase();
      if (consumedThisPendingRef.current) return;
      if (code) {
        void abortFinaleClaim(wallet, code, {
          source,
          attemptId: pendingAttemptRef.current || undefined,
          instanceId: pendingInstanceRef.current || undefined,
        }).then(() => refreshLocalLedger());
        setLastMintFail(code);
        window.setTimeout(() => setLastMintFail(null), 8_000);
      }
      pendingCodeRef.current = null;
      pendingAttemptRef.current = null;
      pendingInstanceRef.current = null;
      setPendingCode(null);
      consumedThisPendingRef.current = false;
      setFormReset((n) => n + 1);
      // eslint-disable-next-line no-console
      console.info('[finale] mint failed/rejected — code released for retry', { code, source });
    };

    let stopWatch: (() => void) | undefined;
    if (pendingSinceRef.current) {
      stopWatch = watchCheckoutSuccess({
        sinceMs: pendingSinceRef.current + 800,
        onSuccess: (source) => consumeOne(source),
        onError: (source) => onFail(source),
      });
    }

    const onMintComplete = (ev: Event) => {
      if (!pendingCodeRef.current || !pendingSinceRef.current) return;
      if (Date.now() - pendingSinceRef.current < 2_000) return;
      const detail = (ev as CustomEvent<MintCompleteDetail>).detail;
      if (detail?.address && wallet) {
        if (detail.address.toLowerCase() !== wallet.toLowerCase()) return;
      }
      consumeOne('mint-complete-event');
    };

    window.addEventListener(MINT_COMPLETE_EVENT, onMintComplete);

    // Safety: expire stale pending after 20m without success
    const expireAt = pendingSinceRef.current + 20 * 60 * 1000;
    const expireTimer = window.setTimeout(() => {
      if (!consumedThisPendingRef.current && pendingCodeRef.current) {
        onFail('pending-timeout');
      }
    }, Math.max(1_000, expireAt - Date.now()));

    return () => {
      stopWatch?.();
      window.removeEventListener(MINT_COMPLETE_EVENT, onMintComplete);
      window.clearTimeout(expireTimer);
    };
  }, [pendingCode, wallet, allotment.allotted, claiming?.instanceId, refreshLocalLedger]);

  /* ── Session hint + re-verify on wallet ───────────────── */
  useEffect(() => {
    const session = readFinaleSession();
    if (session?.sets) setSets(Math.max(1, session.sets));
    const seeded = normalizeWalletAddress(session?.address);
    if (seeded) setSessionWallet(seeded);
    // Hydrate Manifold widgets for already-connected collectors
    void sync();
    refreshManifoldWidgets();
    const t = [200, 800, 2_000, 4_000].map((ms) =>
      window.setTimeout(() => {
        void sync();
        refreshManifoldWidgets();
        // Re-read storage/URL in case Chrome late-fills
        const again = readFinaleSession();
        const w = normalizeWalletAddress(again?.address);
        if (w) setSessionWallet(w);
        if (again?.sets) setSets((prev) => Math.max(prev, again.sets));
      }, ms),
    );
    return () => t.forEach((id) => window.clearTimeout(id));
  }, [sync]);

  useEffect(() => {
    if (!wallet) {
      setScanning(false);
      return;
    }
    let cancelled = false;
    const guestListed = Boolean(getClaimAllotment(wallet, 0).guest);
    // Only show "verifying…" if we have no set count yet (session already filled most users)
    setSets((prev) => {
      if (prev <= 0 && !guestListed) setScanning(true);
      else setScanning(false);
      return prev;
    });
    setScanError('');
    void verifyCompleteSets(wallet as `0x${string}`)
      .then((r) => {
        if (cancelled) return;
        // Prefer higher of on-chain vs session so a slow/partial scan never zeroes allotment
        setSets((prev) => {
          const next = Math.max(prev, r.completeSets);
          if (next <= 0 && !guestListed) {
            setScanError(FINALE_COPY.verifyIncomplete);
          } else {
            setScanError('');
          }
          return next;
        });
      })
      .catch(() => {
        // Keep session sets — do not hard-error already-verified portal users
        if (cancelled) return;
        setSets((prev) => {
          if (prev <= 0 && !guestListed) {
            setScanError('Could not re-check this wallet. Using your portal verification.');
          }
          return prev;
        });
      })
      .finally(() => {
        if (!cancelled) setScanning(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  /* Keep claim widgets warm once user reaches claim stage */
  useEffect(() => {
    if (stage !== 'claim') return;
    void sync();
    refreshManifoldWidgets();
    const session = readManifoldSession();
    if (session.isConnected || session.isAuthenticated || session.address) {
      // Soft refresh is enough here; claim click still force-auths
      void ensureManifoldAuthenticated().then(() => refreshManifoldWidgets());
    }
    const t = [150, 600, 1_500].map((ms) =>
      window.setTimeout(() => refreshManifoldWidgets(), ms),
    );
    return () => t.forEach((id) => window.clearTimeout(id));
  }, [stage, sync]);

  /* ── Still → animate CTA delay ────────────────────────── */
  useEffect(() => {
    if (stage !== 'still') {
      setShowAnimateCta(false);
      return;
    }
    setShowAnimateCta(false);
    const t = window.setTimeout(() => setShowAnimateCta(true), STILL_TO_ANIMATE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  /* Preload still so claim hero paints immediately (no click needed). */
  useEffect(() => {
    if (stage !== 'piece' && stage !== 'still' && stage !== 'animated' && stage !== 'claim') {
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = BLOSSOM_MEDIA.still;
  }, [stage]);

  /* Live wallet supersedes portal seed so codes always match the signed-in user */
  useEffect(() => {
    if (!address) return;
    setSessionWallet((prev) => {
      if (!prev || prev.toLowerCase() !== address.toLowerCase()) return address;
      return prev;
    });
  }, [address]);

  /* ── Enter claim (auto after loops, or skip button) ───── */
  const goToClaim = useCallback((immediate = false) => {
    setBannerMode('still');
    setClaimReveal(false);
    setShowSkipClaim(false);
    const img = new Image();
    img.src = BLOSSOM_MEDIA.still;
    if (immediate) {
      setStage('claim');
      return;
    }
    window.setTimeout(() => setStage('claim'), RESOLVE_TO_CLAIM_MS);
  }, []);

  const onAnimateComplete = useCallback(() => {
    goToClaim(false);
  }, [goToClaim]);

  /* Skip-to-claim CTA while animated plays */
  useEffect(() => {
    if (stage !== 'animated') {
      setShowSkipClaim(false);
      setPlayLabel({ current: 1, total: ANIMATE_LOOP_COUNT });
      return;
    }
    setShowSkipClaim(false);
    const t = window.setTimeout(() => setShowSkipClaim(true), ANIMATE_SKIP_CLAIM_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'claim') return;
    setBannerMode('still');
    setClaimReveal(true);
    // Re-sync wallet + allotment the moment claim opens
    void sync();
    const again = readFinaleSession();
    const w = normalizeWalletAddress(again?.address);
    if (w) setSessionWallet(w);
    if (again?.sets) setSets((prev) => Math.max(prev, again.sets));
  }, [stage, sync]);

  const onClaimClick = (reward: FinaleReward) => {
    if (remaining <= 0 || !walletReady) return;
    setClaiming(reward);
    void sync();
    refreshManifoldWidgets();
    // Refresh OAuth when the claim sheet opens so "Claim now · Free" can mint
    // without a second connect / disconnect cycle.
    void ensureManifoldAuthenticated({ force: true }).then(() => refreshManifoldWidgets());
  };

  const onClaimClose = () => {
    // Close sheet but keep pending reservation + success watcher if mint is in flight
    setClaiming(null);
    refreshManifoldWidgets();
  };

  /**
   * Claim now pressed — immediately reserve code (local + remote ledger),
   * then wait for full tx success before permanent consume.
   */
  const onClaimStarted = (code: string) => {
    const key = code.trim().toUpperCase();
    if (!key || !wallet) return;

    setLastMintOk(null);
    setLastMintFail(null);
    setLedgerNote(null);
    consumedThisPendingRef.current = false;
    pendingCodeRef.current = key;
    pendingSinceRef.current = Date.now();
    pendingInstanceRef.current = claiming?.instanceId || null;
    setPendingCode(key);

    void (async () => {
      const result = await beginFinaleClaim(wallet, key, {
        source: 'claim-now',
        instanceId: claiming?.instanceId,
        rewardId: claiming?.id,
      });
      refreshLocalLedger();

      if (!result.ok) {
        pendingCodeRef.current = null;
        pendingAttemptRef.current = null;
        setPendingCode(null);
        consumedThisPendingRef.current = false;
        if (result.reason === 'already_confirmed') {
          setLastMintOk(key);
          setLedgerNote('This code was already registered as minted.');
          setFormReset((n) => n + 1);
          setClaiming(null);
        } else if (result.reason === 'allotment_exhausted') {
          setLastMintFail(key);
          setLedgerNote('All claim rights for this wallet are used.');
        } else if (result.reason === 'reserved_elsewhere') {
          setLastMintFail(key);
          setLedgerNote('This code is already being claimed. Wait or try another code.');
        } else {
          setLastMintFail(key);
          setLedgerNote('Could not reserve this code. Try again.');
        }
        window.setTimeout(() => setLastMintFail(null), 8_000);
        window.setTimeout(() => setLedgerNote(null), 8_000);
        return;
      }

      pendingAttemptRef.current = result.attemptId;
      setLedgerNote('Code reserved · confirm the wallet transaction…');
      // eslint-disable-next-line no-console
      console.info('[finale] code reserved — awaiting wallet success', {
        code: key,
        attemptId: result.attemptId,
      });
    })();
  };

  /**
   * Restore browser-local used marks only.
   * Permanent claims + remote KV confirmed codes re-apply on hydrate.
   */
  const onRestoreCodes = () => {
    clearUsedFinaleCodes(wallet);
    refreshLocalLedger();
    pendingCodeRef.current = null;
    pendingAttemptRef.current = null;
    setPendingCode(null);
    setLastMintOk(null);
    setLastMintFail(null);
    setFormReset((n) => n + 1);
    void fetchRemoteClaimSnapshot(wallet).then(() => refreshLocalLedger());
  };

  const permanentCount = getPermanentClaimedCount(wallet);
  const fullyClaimed = isFinaleWalletFullyClaimed(wallet);

  return (
    <div className={`finale stage-${stage}`}>
      <AnimatePresence mode="wait">
        {/* ── Intro (brief welcome, personalized) ─────────── */}
        {stage === 'intro' && (
          <motion.section
            key="intro"
            className="finale-stage finale-welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="finale-kicker">A Fragmented Blossom</p>
            <h1 className="finale-title-lg">
              {allotment.guest ? `${greetName}, you made it.` : 'You made it.'}
            </h1>
            <p className="finale-body-wide">
              Twenty-seven fragments. One full set
              {sets > 1 ? ` · ${sets} complete sets held` : ''}.
              What follows is the resolution of the canvas.
            </p>
            {allotment.allotted > 0 && !scanning && (
              <p className="finale-allot-hint">
                You may claim up to <strong>{allotment.allotted}</strong> edition
                {allotment.allotted === 1 ? '' : 's'} across Still and Animated.
              </p>
            )}
            <button
              type="button"
              className="finale-btn finale-btn--claim finale-cta"
              onClick={() => setStage('thanks')}
            >
              Continue
            </button>
          </motion.section>
        )}

        {/* ── Thank you ───────────────────────────────────── */}
        {stage === 'thanks' && (
          <motion.section
            key="thanks"
            className="finale-stage finale-thanks-stage"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
          >
            <p className="finale-kicker">From Nikx</p>
            <p className="finale-thanks-text">{FINALE_COPY.thankYou}</p>
            <div className="finale-letter">
              <p>
                {allotment.guest ? `${greetName} — ` : ''}
                collecting every piece of this puzzle was never meant to be easy. You stayed with
                the work through each release, each shift of the canvas, each quiet hour between
                drops.
              </p>
              <p>
                This chamber is yours. What you are about to see is the blossom fully open — still
                and in motion — offered only to those who hold a complete set.
              </p>
              <p className="finale-letter-sign">With gratitude · Nikx</p>
            </div>
            <button
              type="button"
              className="finale-btn finale-btn--claim finale-cta"
              onClick={() => setStage('piece')}
            >
              Continue
            </button>
          </motion.section>
        )}

        {/* ── Golden piece ────────────────────────────────── */}
        {stage === 'piece' && (
          <motion.section
            key="piece"
            className="finale-stage finale-piece-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="finale-kicker finale-piece-header">Fragment Reveal</h1>
            <p className="finale-body-wide">{FINALE_COPY.pieceReveal}</p>
            <button
              type="button"
              className="finale-gold-piece"
              onClick={() => setStage('still')}
              aria-label="Reveal Blossom Fragments"
            >
              <span className="finale-gold-glow" aria-hidden />
              {/* Green: set already resolved at portal; ready to reveal canvas */}
              <span className="finale-gold-live is-resolved" aria-hidden title="Fragments resolved" />
              <svg
                className="finale-gold-svg"
                viewBox={PIECE_VIEWBOX}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden
              >
                <defs>
                  <linearGradient id="finaleGoldFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f2e8d4" />
                    <stop offset="35%" stopColor="#e0c48a" />
                    <stop offset="55%" stopColor="#c4a484" />
                    <stop offset="80%" stopColor="#a67c52" />
                    <stop offset="100%" stopColor="#d4b896" />
                  </linearGradient>
                  <filter id="finaleGoldBloom" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  className="finale-gold-fill"
                  d={PIECE_PATH}
                  fill="url(#finaleGoldFill)"
                  filter="url(#finaleGoldBloom)"
                />
              </svg>
            </button>
            <p className="finale-intro-hint">Tap the piece when you are ready</p>
          </motion.section>
        )}

        {/* ── Still + magnify ─────────────────────────────── */}
        {stage === 'still' && (
          <motion.section
            key="still"
            className="finale-stage finale-reveal-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85 }}
          >
            <div className="finale-reveal-head">
              <p className="finale-kicker">Blossom Fragments</p>
              <h1 className="finale-title-lg">Still</h1>
            </div>
            <BlossomMagnifier src={BLOSSOM_MEDIA.still} className="finale-mag" />
            <div className={`finale-reveal-actions${showAnimateCta ? ' is-visible' : ''}`}>
              {showAnimateCta ? (
                <button
                  type="button"
                  className="finale-btn finale-btn--claim finale-cta"
                  onClick={() => setStage('animated')}
                >
                  {FINALE_COPY.viewAnimated}
                </button>
              ) : (
                <p className="finale-intro-hint">{FINALE_COPY.exploreStill}</p>
              )}
            </div>
          </motion.section>
        )}

        {/* ── Animated ×2 (11K → 4K fallback) ─────────────── */}
        {stage === 'animated' && (
          <motion.section
            key="animated"
            className="finale-stage finale-reveal-stage finale-anim-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="finale-reveal-head">
              <p className="finale-kicker">Blossom Fragments</p>
              <h1 className="finale-title-lg">Animated</h1>
              <p className="finale-intro-hint">
                Playing {playLabel.current} of {playLabel.total}
              </p>
            </div>
            <BlossomVideo
              key="blossom-cinematic"
              cinematic
              className="finale-video-cinematic"
              onPlayIndex={(current, total) => {
                setAnimLoops(Math.max(0, current - 1));
                setPlayLabel({ current, total });
              }}
              onComplete={onAnimateComplete}
            />
            <div className={`finale-reveal-actions finale-skip-claim${showSkipClaim ? ' is-visible' : ''}`}>
              {showSkipClaim && (
                <button
                  type="button"
                  className="finale-btn finale-btn--claim finale-cta"
                  onClick={() => goToClaim(true)}
                >
                  {FINALE_COPY.continueToClaim}
                </button>
              )}
            </div>
            {walletReady && allotment.guest && (
              <p className="finale-anim-allot-hint">
                {greetName} · {allotment.allotted} claim{allotment.allotted === 1 ? '' : 's'} ready
              </p>
            )}
          </motion.section>
        )}

        {/* ── Claim: still/animated viewer + two options ──── */}
        {stage === 'claim' && (
          <motion.section
            key="claim"
            className="finale-stage finale-claim-stage finale--choose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="finale-banner-block">
              <p className="finale-viewer-kicker">
                {canClaimMore ? 'Blossom Fragments' : 'Your Blossom Fragments'}
              </p>
              <div className="finale-banner-toggles" role="tablist" aria-label="View version">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bannerMode === 'still'}
                  className={`finale-toggle${bannerMode === 'still' ? ' is-active' : ''}`}
                  onClick={() => setBannerMode('still')}
                >
                  Still
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bannerMode === 'animated'}
                  className={`finale-toggle${bannerMode === 'animated' ? ' is-active' : ''}`}
                  onClick={() => setBannerMode('animated')}
                >
                  Animated
                </button>
              </div>

              <div
                className={`finale-banner-panel${bannerMode === 'still' ? ' is-active' : ''}`}
                hidden={bannerMode !== 'still'}
                aria-hidden={bannerMode !== 'still'}
              >
                <BlossomMagnifier
                  src={BLOSSOM_MEDIA.still}
                  className="finale-mag finale-mag-banner"
                />
              </div>
              <div
                className={`finale-banner-panel${bannerMode === 'animated' ? ' is-active' : ''}`}
                hidden={bannerMode !== 'animated'}
                aria-hidden={bannerMode !== 'animated'}
              >
                {bannerMode === 'animated' && (
                  <BlossomVideo preview className="finale-video-banner" />
                )}
              </div>
            </div>

            <motion.div
              className="finale-claim-body"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
            {walletReady && (
              <p className="finale-wallet-ready" aria-live="polite">
                {wallet
                  ? `Wallet · ${wallet.slice(0, 6)}…${wallet.slice(-4)}${
                      isAuthenticated ? ' · signed in' : ''
                    }${allotment.guest ? ` · ${greetName}` : ''}`
                  : 'Recognizing wallet…'}
              </p>
            )}

            {/* Returning collectors who finished claiming — viewer only */}
            {!canClaimMore && viewerAccess && (
              <div className="finale-viewer-complete">
                <p className="finale-choose-kicker">Your token</p>
                <p className="finale-choose-sets">
                  {greetName !== 'Collector' ? `${greetName}, ` : ''}
                  use Still / Animated above to view your Blossom. Claiming is complete for this
                  wallet
                  {allotment.allotted > 0 ? ` (${usedCodes.length} of ${allotment.allotted})` : ''}.
                </p>
              </div>
            )}

            {canClaimMore && (
              <>
                <p className="finale-choose-kicker">Your claim rights</p>
                <p className="finale-choose-sets">
                  {scanning && allotment.allotted <= 0
                    ? 'Verifying complete sets…'
                    : walletReady
                      ? allotment.guest
                        ? `${greetName}, you hold ${allotment.allotted} claim${
                            allotment.allotted === 1 ? '' : 's'
                          }. Remaining: ${remaining}${
                            usedCodes.length > 0 ? ` (${usedCodes.length} minted)` : ''
                          }.`
                        : FINALE_COPY.claimHint(allotment.allotted, remaining)
                      : 'Connect your wallet to load claim rights and codes.'}
                </p>
              </>
            )}

            {walletReady && !allotment.guest && canClaimMore && (
              <p className="finale-codes-missing">
                No personal claim codes for this wallet. If you are on the list, connect the same
                wallet used for your fragments (or re-open from the portal after verify).
              </p>
            )}
            {scanError && <p className="finale-choose-error">{scanError}</p>}
            {lastMintOk && (
              <p className="finale-claim-success" role="status">
                Mint confirmed · code <code>{lastMintOk}</code> secured · {remaining} remaining —
                enjoy the art
              </p>
            )}
            {lastMintFail && (
              <p className="finale-claim-fail" role="status">
                Transaction failed or rejected · code <code>{lastMintFail}</code> released for retry
              </p>
            )}
            {ledgerNote && (
              <p className="finale-claim-pending" role="status">
                {ledgerNote}
              </p>
            )}
            {pendingCode && !claiming && (
              <p className="finale-claim-pending" role="status">
                Mint in progress for <code>{pendingCode}</code> — finish the wallet prompt. This code
                stays locked until success or failure.
              </p>
            )}
            {canClaimMore && !fullyClaimed && usedCodes.length > permanentCount && (
              <div className="finale-restore-codes">
                <p className="finale-restore-codes-text">
                  Failed mint stuck? Restore browser-local marks only. Server-registered successes and
                  completed collectors (Vanta, RIP, Geoff) stay claimed.
                </p>
                <button
                  type="button"
                  className="finale-btn finale-btn--ghost finale-restore-codes-btn"
                  onClick={onRestoreCodes}
                >
                  Restore local claim codes
                </button>
              </div>
            )}

            {/* Claim options only while rights remain */}
            {canClaimMore && (
              <div className="finale-columns finale-columns-2">
                {FINALE_REWARDS.map((reward) => (
                  <article key={reward.id} className="finale-card">
                    <button
                      type="button"
                      className="finale-card-preview"
                      onClick={() =>
                        setBannerMode(reward.id === 'animated' ? 'animated' : 'still')
                      }
                      aria-label={`View ${reward.title}`}
                    >
                      {reward.mediaType === 'video' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reward.previewUrl} alt="" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reward.previewUrl} alt="" />
                      )}
                      <span className="finale-card-ratio">{reward.ratio}</span>
                    </button>
                    <h2 className="finale-card-title">{reward.title}</h2>
                    <p className="finale-card-sub">{reward.subtitle}</p>
                    <p className="finale-card-desc">{reward.description}</p>
                    <dl className="finale-card-meta">
                      <div className="finale-card-meta-row">
                        <dt>Artist</dt>
                        <dd>{reward.meta.artist}</dd>
                      </div>
                      <div className="finale-card-meta-row">
                        <dt>Artwork Dimensions</dt>
                        <dd>{reward.meta.dimensions}</dd>
                      </div>
                      <div className="finale-card-meta-row">
                        <dt>Medium</dt>
                        <dd>{reward.meta.medium}</dd>
                      </div>
                      <div className="finale-card-meta-row">
                        <dt>Year</dt>
                        <dd>{reward.meta.year}</dd>
                      </div>
                    </dl>
                    <div className="finale-card-actions">
                      <button
                        type="button"
                        className="finale-btn finale-btn--claim finale-card-claim"
                        onClick={() => onClaimClick(reward)}
                      >
                        Claim
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Info cards without claim when finished — view only via toggle above */}
            {!canClaimMore && viewerAccess && (
              <div className="finale-columns finale-columns-2 finale-columns--view-only">
                {FINALE_REWARDS.map((reward) => (
                  <article key={reward.id} className="finale-card finale-card--view">
                    <button
                      type="button"
                      className="finale-card-preview"
                      onClick={() =>
                        setBannerMode(reward.id === 'animated' ? 'animated' : 'still')
                      }
                      aria-label={`View ${reward.title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={reward.previewUrl} alt="" />
                      <span className="finale-card-ratio">{reward.ratio}</span>
                    </button>
                    <h2 className="finale-card-title">{reward.title}</h2>
                    <p className="finale-card-sub">{reward.subtitle}</p>
                    <button
                      type="button"
                      className="finale-btn finale-btn--ghost finale-card-claim"
                      onClick={() =>
                        setBannerMode(reward.id === 'animated' ? 'animated' : 'still')
                      }
                    >
                      View
                    </button>
                  </article>
                ))}
              </div>
            )}

            {canClaimMore && allotment.guest && remainingEntries.length > 0 && (
              <section className="finale-codes finale-codes--panel" aria-label="Your claim codes">
                <h3 className="finale-codes-heading">
                  Your claim codes · {greetName} · {remainingEntries.length} left
                </h3>
                {guestHandleLine(allotment.guest) && (
                  <p className="finale-codes-handles">{guestHandleLine(allotment.guest)}</p>
                )}
                <ul>
                  {remainingEntries.map((entry) => (
                    <li key={entry.code} className="finale-codes-item">
                      <ClaimCodeChip code={entry.code} holder={entry.holder} />
                    </li>
                  ))}
                </ul>
                <p className="finale-codes-note">
                  Matched to {wallet?.slice(0, 6)}…{wallet?.slice(-4)}. {remaining} of{' '}
                  {allotment.allotted} remaining.
                </p>
              </section>
            )}

            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Claim sheet with Manifold widget */}
      <AnimatePresence>
        {claiming && (
          <motion.div
            className="finale-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            onClick={() => onClaimClose()}
          >
            <motion.div
              className="finale-claim-panel"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="finale-claim-title">Claim · {claiming.title}</p>
              <p className="finale-claim-sub">
                {allotment.guest ? `${greetName} — ` : ''}
                Enter code → OK → Claim now · Free. Checkout starts at quantity 1
                {remaining > 1 ? ` (max ${remaining} for this wallet)` : ''}. Manifold mints{' '}
                {claiming.id === 'still' ? 'Still' : 'Animated'} on this site.
              </p>
              {walletReady && (
                <p className="finale-claim-wallet">
                  Claiming as{' '}
                  <strong>
                    {allotment.guest ? greetName : `${wallet!.slice(0, 6)}…${wallet!.slice(-4)}`}
                  </strong>
                  {isAuthenticated ? ' · signed in' : ''}
                  {` · ${remaining} right${remaining === 1 ? '' : 's'} left`}
                </p>
              )}
              {pendingCode && (
                <p className="finale-claim-pending" role="status">
                  Code <code>{pendingCode}</code> reserved · confirm the wallet transaction.
                  On full success this closes and the code disappears — you keep the art.
                </p>
              )}

              {finaleRewardReady(claiming) && remaining > 0 ? (
                <ClaimSlotForm
                  key={`${claiming.id}-${sessionKey}-${formReset}`}
                  instanceId={claiming.instanceId}
                  pieceNumber={200 + (claiming.id === 'still' ? 1 : 2)}
                  sessionKey={`${sessionKey}-${claiming.id}-${formReset}`}
                  knownCodes={knownCodes}
                  usedCodes={blockedCodes}
                  maxQuantity={Math.max(1, availableRights || remaining)}
                  mintInFlight={Boolean(pendingCode)}
                  onClaimStarted={onClaimStarted}
                  resetToken={formReset}
                />
              ) : finaleRewardReady(claiming) && remaining <= 0 ? (
                <p className="finale-claim-success">
                  All claim rights for this wallet have been used successfully.
                </p>
              ) : (
                <p className="finale-claim-wait">
                  Manifold claim is almost ready. Token IDs are being finalized.
                </p>
              )}

              <button
                type="button"
                className="finale-btn finale-btn--ghost"
                onClick={() => onClaimClose()}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
