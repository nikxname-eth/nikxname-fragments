import { useManifoldRefresh } from '../hooks/useManifoldRefresh';
import { isManifoldConnectReady } from '../lib/manifoldConnect';

type Props = {
  instanceId: string;
  manifoldUrl: string;
  active: boolean;
};

/**
 * Manifold buy widget — wallet connect/auth is handled by the hidden m-connect peer
 * and triggered when the user collects (same pattern as manifold.xyz claim pages).
 */
export function ManifoldBuyButton({ instanceId, manifoldUrl, active }: Props) {
  const ready = isManifoldConnectReady();

  useManifoldRefresh('buy', instanceId, active, ready);

  if (!active) return null;

  if (!ready) {
    return (
      <div className="mint-btn-wrap">
        <a className="collect-btn" href={manifoldUrl} target="_blank" rel="noopener noreferrer">
          Collect on Manifold
        </a>
      </div>
    );
  }

  return (
    <div className="mint-btn-wrap">
      <div
        key={`buy-${instanceId}`}
        data-widget="m-claim-buy-only"
        data-id={instanceId}
        data-network="1"
        data-claim-text="Collect this piece"
      />
    </div>
  );
}