import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  active: boolean;
  /** Remount claim widget when wallet session changes. */
  sessionKey?: string;
};

/**
 * On-site Manifold claim — matches manifold.xyz claim pages (SDK 9.0.1).
 * Uses m-claim-complete (m-claim-buy-only was removed in Claims 9.x).
 */
export function ManifoldBuyButton({ instanceId, active, sessionKey = 'anon' }: Props) {
  useManifoldRefresh('claim', instanceId, active, sessionKey);

  if (!active) return null;

  return (
    <div className="mint-btn-wrap">
      <div
        key={`claim-${instanceId}-${sessionKey}`}
        data-widget="m-claim-complete"
        data-id={instanceId}
        data-network="1"
      />
    </div>
  );
}