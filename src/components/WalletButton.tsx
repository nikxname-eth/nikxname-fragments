type Props = {
  address?: `0x${string}`;
  shortAddress?: string;
};

import { clickManifoldConnectButton } from '../lib/openManifoldConnect';

/** Shows authenticated wallet after Manifold claim flow completes. */
export function WalletButton({ address, shortAddress }: Props) {
  if (!address || !shortAddress) return null;

  return (
    <button
      type="button"
      className="wallet-btn wallet-btn--connected nav-connect-btn nav-connect-btn--linked"
      title={address}
      aria-label={`Connected wallet ${address}`}
      onClick={() => {
        void clickManifoldConnectButton();
      }}
    >
      {shortAddress}
    </button>
  );
}