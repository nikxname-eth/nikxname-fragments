import { useManifoldRefresh } from '../hooks/useManifoldRefresh';

type Props = {
  instanceId: string;
  active: boolean;
};

export function ManifoldMintCount({ instanceId, active }: Props) {
  useManifoldRefresh('count', instanceId, active);

  if (!active) return <span>—</span>;

  return (
    <div
      key={`count-${instanceId}`}
      className="mint-count-widget"
      data-widget="m-claim-mint-count"
      data-id={instanceId}
      data-network="1"
    />
  );
}