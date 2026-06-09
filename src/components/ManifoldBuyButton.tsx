import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  active: boolean;
};

export function ManifoldBuyButton({ instanceId, active }: Props) {
  useManifoldRefresh('buy', instanceId, active);

  if (!active) return null;

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