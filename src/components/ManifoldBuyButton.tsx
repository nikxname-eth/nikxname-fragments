import { useEffect, useRef } from 'react';
import {
  ensureManifoldAuthenticated,
  readManifoldSession,
  refreshManifoldWidgets,
} from '../lib/manifoldConnect';
import { getPieceNumberForInstanceId } from '../config/artist';
import { dispatchMintComplete } from '../lib/mintEvents';
import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  pieceNumber: number;
  active: boolean;
  /** Remount claim widget when wallet session changes. */
  sessionKey?: string;
};

/**
 * Clean on-site buy button — m-claim-buy-only (Claims 1.x).
 * With delay-auth, wallet connects first; finish Manifold sign-in before checkout opens.
 */
export function ManifoldBuyButton({
  instanceId,
  pieceNumber,
  active,
  sessionKey = 'anon',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const resolvedPiece = pieceNumber || getPieceNumberForInstanceId(instanceId);
  useManifoldRefresh('buy', instanceId, active, sessionKey);

  useEffect(() => {
    if (!active) return;

    const wrap = wrapRef.current;
    if (!wrap) return;

    const onCheckoutSuccess = () => {
      const success =
        document.querySelector('.checkout-modal.success') ||
        document.querySelector('.checkout-success-actions') ||
        document.querySelector('.checkout-post-mint-message');
      if (!success) return;

      const session = readManifoldSession();
      dispatchMintComplete({
        pieceNumber: resolvedPiece,
        address: session.address,
      });
    };

    const checkoutObserver = new MutationObserver(onCheckoutSuccess);
    checkoutObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    const checkoutPoll = window.setInterval(onCheckoutSuccess, 1_000);

    let authPending = false;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest('button')) return;
      if (readManifoldSession().isAuthenticated) return;
      if (authPending) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      authPending = true;
      void ensureManifoldAuthenticated().then((ok) => {
        authPending = false;
        refreshManifoldWidgets();
        if (ok) {
          wrap.querySelector('button')?.click();
        }
      });
    };

    wrap.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, true);
      checkoutObserver.disconnect();
      window.clearInterval(checkoutPoll);
    };
  }, [active, sessionKey, resolvedPiece]);

  if (!active) return null;

  return (
    <div className="mint-btn-wrap" ref={wrapRef}>
      <div
        key={`buy-${instanceId}-${sessionKey}`}
        data-widget="m-claim-buy-only"
        data-id={instanceId}
        data-network="1"
        data-claim-text="Collect this piece"
      />
    </div>
  );
}