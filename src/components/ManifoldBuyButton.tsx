import { useEffect, useRef } from 'react';
import {
  ensureManifoldAuthenticated,
  readManifoldSession,
  refreshManifoldWidgets,
} from '../lib/manifoldConnect';
import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  active: boolean;
  /** Remount claim widget when wallet session changes. */
  sessionKey?: string;
};

/**
 * Clean on-site buy button — m-claim-buy-only (Claims 1.x).
 * Intercepts Collect to complete Manifold sign-in before checkout opens.
 */
export function ManifoldBuyButton({ instanceId, active, sessionKey = 'anon' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useManifoldRefresh('buy', instanceId, active, sessionKey);

  useEffect(() => {
    if (!active) return;

    const wrap = wrapRef.current;
    if (!wrap) return;

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
          const button = wrap.querySelector('button');
          button?.click();
        }
      });
    };

    wrap.addEventListener('pointerdown', onPointerDown, true);
    return () => wrap.removeEventListener('pointerdown', onPointerDown, true);
  }, [active, sessionKey]);

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