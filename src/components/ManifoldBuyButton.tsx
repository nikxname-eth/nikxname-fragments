import { useEffect, useId, useRef } from 'react';
import {
  ensureManifoldAuthenticated,
  readManifoldSession,
  refreshManifoldWidgets,
} from '../lib/manifoldConnect';
import {
  advanceCheckoutToWallet,
  isManifoldCheckoutOpen,
} from '../lib/manifoldCheckout';
import {
  isolateManifoldClaimWidget,
  watchManifoldCheckoutQuantity,
} from '../lib/manifoldCheckoutQty';
import { clickManifoldConnectOnly } from '../lib/openManifoldConnect';
import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  pieceNumber: number;
  active: boolean;
  sessionKey?: string;
  claimText?: string;
  singleControl?: boolean;
  /**
   * Max Manifold checkout quantity for this wallet (remaining allotment).
   * Always starts at 1; cannot exceed this. Most collectors: 1.
   */
  maxQuantity?: number;
  /** @deprecated use maxQuantity={1} */
  qtyOne?: boolean;
  onClaimIntent?: () => void;
};

function clampMaxQuantity(n: number | undefined, qtyOne?: boolean): number {
  if (qtyOne) return 1;
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 1) return 1;
  return Math.min(v, 99);
}

function pruneTwinClaimControls(wrap: HTMLElement) {
  const buttons = Array.from(wrap.querySelectorAll<HTMLElement>('button, a'));
  buttons.forEach((el, i) => {
    if (i > 0) el.remove();
  });
  Array.from(wrap.querySelectorAll<HTMLElement>('[data-widget="m-claim-buy-only"]')).forEach(
    (el, i) => {
      if (i > 0) el.remove();
    },
  );
}

function clickLiveClaimControl(wrap: HTMLElement): boolean {
  const btn = wrap.querySelector<HTMLElement>(
    'button:not(.finale-mint-programmatic):not([disabled]), a:not(.finale-mint-programmatic)',
  );
  if (!btn) return false;
  btn.click();
  return true;
}

/**
 * On-site Manifold free mint — qty starts at 1, max = wallet remaining allotment.
 *
 * Claim click path:
 * 1) Force fresh Manifold OAuth
 * 2) Click the live claim widget on this page
 * 3) Clamp qty + auto-advance checkout → wallet signature
 */
export function ManifoldBuyButton({
  instanceId,
  pieceNumber,
  active,
  sessionKey = 'anon',
  claimText = 'Claim now · Free',
  singleControl = false,
  maxQuantity = 1,
  qtyOne = false,
  onClaimIntent,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const stableKey = sessionKey && sessionKey !== 'anon' ? sessionKey : 'session';
  const stopQty = useRef<(() => void) | null>(null);
  const stopIsolate = useRef<(() => void) | null>(null);
  const maxQty = clampMaxQuantity(maxQuantity, qtyOne);
  const guardQty = qtyOne || maxQty >= 1;

  useManifoldRefresh(
    'buy',
    instanceId,
    active,
    stableKey,
    singleControl ? 'single' : 'multi',
  );

  useEffect(() => {
    return () => {
      stopQty.current?.();
      stopIsolate.current?.();
      stopQty.current = null;
      stopIsolate.current = null;
    };
  }, []);

  // Isolate this instance while active (finale single-claim sheet)
  useEffect(() => {
    if (!active || !guardQty) return;
    stopIsolate.current?.();
    stopIsolate.current = isolateManifoldClaimWidget(instanceId);
    return () => {
      stopIsolate.current?.();
      stopIsolate.current = null;
    };
  }, [active, guardQty, instanceId]);

  // Warm OAuth when the claim control mounts (soft — no force popup spam)
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      const session = readManifoldSession();
      if (session.isAuthenticated) return;
      if (!session.isConnected && !session.address) return;
      const ok = await ensureManifoldAuthenticated();
      if (!cancelled && ok) refreshManifoldWidgets();
    })();
    return () => {
      cancelled = true;
    };
  }, [active, sessionKey, instanceId]);

  useEffect(() => {
    if (!active) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let authPending = false;

    const armQtyGuard = () => {
      if (!guardQty) return;
      stopQty.current?.();
      stopQty.current = watchManifoldCheckoutQuantity(maxQty, 120_000);
    };

    /**
     * Always own the claim click. Never let a stale isAuthenticated flag
     * pass through to Manifold half-authed checkout (the disconnect/reconnect bug).
     */
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest('button, a')) return;
      if (target.closest('.finale-mint-programmatic')) return;

      onClaimIntent?.();
      armQtyGuard();

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      if (authPending) return;
      authPending = true;

      void (async () => {
        try {
          if (isManifoldCheckoutOpen()) {
            await advanceCheckoutToWallet(12_000, { maxQty });
            return;
          }

          const ok = await ensureManifoldAuthenticated({ force: true, timeoutMs: 15_000 });
          refreshManifoldWidgets();

          if (!ok) {
            await clickManifoldConnectOnly();
            return;
          }

          await new Promise((r) => setTimeout(r, 350));
          armQtyGuard();

          let clicked = clickLiveClaimControl(wrap);
          if (!clicked) {
            refreshManifoldWidgets();
            await new Promise((r) => setTimeout(r, 450));
            clicked = clickLiveClaimControl(wrap);
          }
          if (!clicked) return;

          await advanceCheckoutToWallet(14_000, { maxQty });
        } finally {
          authPending = false;
        }
      })();
    };

    wrap.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [active, sessionKey, singleControl, onClaimIntent, guardQty, maxQty]);

  useEffect(() => {
    if (!active || !singleControl) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const run = () => pruneTwinClaimControls(wrap);
    run();
    const observer = new MutationObserver(run);
    observer.observe(wrap, { childList: true, subtree: true });
    const times = [200, 800, 2_000].map((ms) => window.setTimeout(run, ms));
    return () => {
      observer.disconnect();
      times.forEach((t) => window.clearTimeout(t));
    };
  }, [active, sessionKey, instanceId, singleControl]);

  if (!active) return null;

  const maxAttr = String(maxQty);

  return (
    <div
      className={`mint-btn-wrap finale-mint-wrap${singleControl ? ' finale-mint-wrap--single' : ''}`}
      ref={wrapRef}
      data-finale-slot={uid}
      data-instance={instanceId}
      data-max-qty={maxAttr}
    >
      {/* Start at 1; Manifold + our guard clamp to wallet remaining allotment */}
      <div
        key={`buy-${instanceId}-${stableKey}-${uid}-m${maxAttr}`}
        data-widget="m-claim-buy-only"
        data-id={instanceId}
        data-network="1"
        data-claim-text={claimText}
        data-max={maxAttr}
        data-quantity="1"
        data-max-quantity={maxAttr}
      />
    </div>
  );
}
