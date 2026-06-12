import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  active: boolean;
  /** Remount claim widget when wallet session changes. */
  sessionKey?: string;
};

/**
 * Full Manifold claim widget — m-claim-complete (Claims 9.x).
 * Auth is deferred until collect (data-delay-auth on m-connect).
 */
export function ManifoldBuyButton({ instanceId, active, sessionKey = 'anon' }: Props) {
  useManifoldRefresh('claim', instanceId, active, sessionKey);

  if (!active) return null;

  return (
    <div className="mint-claim-wrap">
      <div
        key={`claim-${instanceId}-${sessionKey}`}
        data-widget="m-claim-complete"
        data-id={instanceId}
        data-network="1"
      />
    </div>
  );
}