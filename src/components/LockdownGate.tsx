import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FINALE_COPY,
  FINALE_PORTAL_URL,
  buildFinaleEntryUrl,
  isFinalePortalLive,
  writeFinaleSession,
} from '../config/finale';
import { verifyCompleteSets } from '../lib/setVerification';
import { clickManifoldConnectButton } from '../lib/openManifoldConnect';
import { readManifoldSession } from '../lib/manifoldConnect';
import { useWallet } from '../providers/WalletProvider';

type Props = {
  now: number;
  /** Preview / force active portal (e.g. ?finale=portal) */
  forceLive?: boolean;
};

type VerifyState = 'idle' | 'scanning' | 'ok' | 'fail';

/**
 * Frag01 Heart E2 silhouette — dark path only from
 * Desktop/PUZZLE-PIECES/Frag01-Heart -E2/E2.svg
 * viewBox cropped tightly around the piece.
 */
const PIECE_PATH =
  'M458.753235,132.001770 C458.755554,127.504929 458.911346,123.500244 458.716980,119.512619 C458.535492,115.789352 460.113708,114.564713 463.730499,114.614639 C474.554260,114.764023 485.381500,114.678162 496.207306,114.655212 C498.665497,114.649994 501.366821,115.139023 502.906708,112.445747 C504.507050,109.646790 501.995697,108.244270 500.713654,106.448624 C497.899780,102.507446 497.817932,98.277412 500.012787,94.196426 C502.851837,88.917679 507.635498,86.115837 513.543701,86.370087 C519.176697,86.612488 523.864319,89.348610 526.276306,94.685829 C528.339600,99.251511 527.997375,103.727791 524.319092,107.620728 C523.056519,108.957001 521.935242,110.544472 523.131897,112.539101 C524.209473,114.335304 525.964783,114.650681 527.890137,114.648964 C538.882568,114.639183 549.874939,114.652794 560.867371,114.669273 C568.346252,114.680481 568.349060,114.688400 568.354614,121.933983 C568.362976,132.759827 568.380432,143.585693 568.361938,154.411484 C568.358093,156.682327 568.653259,158.818420 570.861877,160.004593 C573.127197,161.221252 574.559204,159.461060 576.136658,158.298141 C580.685181,154.944839 585.544250,154.707870 590.034729,157.600037 C594.858643,160.706970 597.863403,167.150391 596.823303,172.157471 C594.484741,183.415070 584.680969,187.368134 575.133057,180.890991 C573.714233,179.928467 572.325806,179.003052 570.572876,180.115707 C568.622009,181.353989 568.364502,183.301712 568.366272,185.365448 C568.375549,196.191299 568.379944,207.017136 568.386108,217.842987 C568.387024,219.508469 568.259827,221.186096 568.415771,222.836945 C568.758972,226.470062 567.239014,227.958939 563.570435,227.910278 C552.415222,227.762283 541.257080,227.838150 530.101440,227.710922 C527.554077,227.681854 524.953125,227.303482 523.362427,229.801300 C521.654236,232.483521 524.056213,234.034607 525.348206,235.861282 C528.263428,239.982986 528.286438,244.401672 525.802124,248.537292 C522.774963,253.576508 518.066467,256.580170 512.085144,256.056976 C506.462555,255.565186 501.988434,252.578796 499.673004,247.222885 C497.638885,242.517715 498.342804,238.128021 502.066162,234.365204 C503.140472,233.279495 504.019775,231.979416 503.250549,230.340515 C502.230774,228.167709 500.175049,227.953491 498.148071,227.946945 C487.322479,227.911987 476.496643,227.954941 465.671051,227.916885 C458.879700,227.893005 458.784637,227.764313 458.774231,220.822540 C458.757507,209.663651 458.677765,198.503906 458.790436,187.346207 C458.835815,182.852707 459.989441,182.322739 463.875916,184.489380 C471.188171,188.565842 478.085114,187.374481 483.553345,181.090286 C488.653503,175.229095 489.105164,166.402176 484.617584,160.291534 C479.136719,152.828323 471.728119,151.196396 463.718506,155.897446 C460.026398,158.064438 458.820740,156.498535 458.782257,152.986511 C458.707489,146.158859 458.756287,139.329834 458.753235,132.001770 Z';

const PIECE_VIEWBOX = '450 80 155 185';

/**
 * Post–F27 lockdown: sparse page with puzzle-piece portal control.
 * Inactive until 4pm ET; then verifies full 1–27 set ownership and opens finale.
 */
export function LockdownGate({ now, forceLive = false }: Props) {
  const { address, sync } = useWallet();
  const live = forceLive || isFinalePortalLive(now);
  const [status, setStatus] = useState<VerifyState>('idle');
  const [progress, setProgress] = useState('');
  const [missing, setMissing] = useState<number[]>([]);
  const [sets, setSets] = useState(0);
  const pendingVerify = useRef(false);

  const resolveAddress = useCallback(async (): Promise<`0x${string}` | undefined> => {
    await sync();
    const session = readManifoldSession();
    if (session.address) return session.address;
    try {
      const accounts = (await window.ManifoldEthereumProvider?.request?.({
        method: 'eth_accounts',
      })) as string[] | undefined;
      if (accounts?.[0]?.startsWith('0x')) {
        return accounts[0] as `0x${string}`;
      }
    } catch {
      /* provider not ready */
    }
    try {
      const eth = (window as unknown as { ethereum?: { request?: (a: { method: string }) => Promise<unknown> } })
        .ethereum;
      const accounts = (await eth?.request?.({ method: 'eth_accounts' })) as string[] | undefined;
      if (accounts?.[0]?.startsWith('0x')) {
        return accounts[0] as `0x${string}`;
      }
    } catch {
      /* no injected ethereum */
    }
    return undefined;
  }, [sync]);

  const openFinale = useCallback((completeSets: number, wallet?: `0x${string}`) => {
    // session + localStorage + query string (Chrome new-tab often drops sessionStorage)
    writeFinaleSession({ sets: completeSets, at: Date.now(), address: wallet });
    const target =
      typeof window !== 'undefined'
        ? buildFinaleEntryUrl(window.location.origin, completeSets, wallet)
        : FINALE_PORTAL_URL;
    const opened = window.open(target, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.href = target;
  }, []);

  const runVerify = useCallback(
    async (wallet: `0x${string}`) => {
      setStatus('scanning');
      setProgress(FINALE_COPY.verifyScanning);
      setMissing([]);
      try {
        const result = await verifyCompleteSets(wallet, setProgress);
        setSets(result.completeSets);
        if (result.completeSets > 0) {
          setStatus('ok');
          setProgress(FINALE_COPY.verifyComplete(result.completeSets));
          window.setTimeout(() => openFinale(result.completeSets, wallet), 900);
        } else {
          setStatus('fail');
          setMissing(result.missing);
          setProgress(FINALE_COPY.verifyIncomplete);
        }
      } catch {
        setStatus('fail');
        setProgress('Verification could not complete. Please try again.');
      }
    },
    [openFinale],
  );

  useEffect(() => {
    if (!pendingVerify.current || !live) return;
    if (!address) return;
    pendingVerify.current = false;
    void runVerify(address);
  }, [address, live, runVerify]);

  const onPuzzleClick = useCallback(async () => {
    if (!live || status === 'scanning' || status === 'ok') return;

    const wallet = (await resolveAddress()) ?? address;
    if (wallet) {
      pendingVerify.current = false;
      await runVerify(wallet);
      return;
    }

    pendingVerify.current = true;
    setProgress('Opening wallet…');
    setStatus('idle');
    const opened = await clickManifoldConnectButton();
    if (!opened) {
      pendingVerify.current = false;
      setProgress(
        'Could not open wallet connect. Use Connect in the header, then click the puzzle again.',
      );
      setStatus('fail');
      return;
    }

    for (let i = 0; i < 40; i++) {
      await new Promise((r) => window.setTimeout(r, 250));
      const next = await resolveAddress();
      if (next) {
        pendingVerify.current = false;
        await runVerify(next);
        return;
      }
    }
  }, [live, status, address, resolveAddress, runVerify]);

  return (
    <section className="lockdown" aria-label="Finale portal">
      <div className="lockdown-inner">
        <p className="lockdown-kicker">Together It Blooms</p>
        <h1 className="lockdown-title">The grid is complete</h1>

        <button
          type="button"
          className={`lockdown-piece${live ? ' is-live' : ' is-waiting'}${
            status === 'scanning' ? ' is-scanning' : ''
          }${status === 'ok' ? ' is-ok' : ''}`}
          onClick={() => void onPuzzleClick()}
          disabled={!live || status === 'scanning' || status === 'ok'}
          aria-label={
            live
              ? 'Verify complete fragment set and open finale'
              : 'Finale portal opens at 4pm Eastern'
          }
        >
          <span className="lockdown-piece-shape" aria-hidden="true">
            <svg viewBox={PIECE_VIEWBOX} className="lockdown-piece-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="pieceSweep" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(196,164,132,0)" />
                  <stop offset="40%" stopColor="rgba(196,164,132,0.45)" />
                  <stop offset="50%" stopColor="rgba(242,236,228,0.9)" />
                  <stop offset="60%" stopColor="rgba(196,164,132,0.45)" />
                  <stop offset="100%" stopColor="rgba(196,164,132,0)" />
                </linearGradient>
                <clipPath id="pieceClip">
                  <path d={PIECE_PATH} />
                </clipPath>
              </defs>
              <path className="lockdown-piece-fill" d={PIECE_PATH} />
              <g clipPath="url(#pieceClip)">
                <rect
                  className="lockdown-piece-sweep"
                  x="430"
                  y="80"
                  width="40"
                  height="185"
                  fill="url(#pieceSweep)"
                />
              </g>
            </svg>
          </span>
          <span
            className={`lockdown-live-dot${
              status === 'ok'
                ? ' is-resolved'
                : status === 'scanning'
                  ? ' is-scanning'
                  : live
                    ? ' is-pending'
                    : ' is-waiting'
            }`}
            aria-hidden="true"
            title={
              status === 'ok'
                ? 'Fragments resolved'
                : status === 'scanning'
                  ? 'Verifying fragments…'
                  : live
                    ? 'Awaiting set verification'
                    : 'Portal not yet open'
            }
          />
        </button>

        <p className="lockdown-script">
          {status === 'ok'
            ? 'Fragments resolved. Opening your finale…'
            : live
              ? FINALE_COPY.lockdownLive
              : FINALE_COPY.lockdownWaiting}
        </p>

        {live && (
          <p className="lockdown-wallet">
            {address
              ? `Connected · ${address.slice(0, 6)}…${address.slice(-4)}`
              : 'Wallet not connected'}
          </p>
        )}

        {(status === 'scanning' || status === 'ok' || status === 'fail' || progress) && (
          <motion.div
            className="lockdown-status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
          >
            <p className="lockdown-status-msg">{progress}</p>
            {status === 'fail' && missing.length > 0 && (
              <p className="lockdown-missing">
                Missing {missing.length} piece{missing.length === 1 ? '' : 's'}:{' '}
                {missing
                  .slice(0, 12)
                  .map((n) => String(n).padStart(2, '0'))
                  .join(' · ')}
                {missing.length > 12 ? ' …' : ''}
              </p>
            )}
            {status === 'ok' && sets > 1 && (
              <p className="lockdown-sets">{sets} complete sets detected</p>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
