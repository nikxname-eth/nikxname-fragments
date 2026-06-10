import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  active: boolean;
  /** Remount claim widget when wallet session changes. */
  sessionKey?: string;
};

export function ManifoldBuyButton({ instanceId, active, sessionKey = 'anon' }: Props) {
  useManifoldRefresh('buy', instanceId, active, sessionKey);

  if (!active) return null;

  return (
    <div className="mint-btn-wrap">
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