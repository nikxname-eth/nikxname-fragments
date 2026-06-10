type Props = {
  address?: `0x${string}`;
  shortAddress?: string;
  isConnecting: boolean;
};

/** Shows wallet session state; connect UI is the visible Manifold widget beside this. */
export function WalletButton({ address, shortAddress, isConnecting }: Props) {
  if (address && shortAddress) {
    return (
      <span className="wallet-btn wallet-btn--connected" title={address} aria-label={`Connected wallet ${address}`}>
        {shortAddress}
      </span>
    );
  }

  if (isConnecting) {
    return (
      <span className="wallet-btn wallet-btn--pending" aria-busy="true">
        Signing in…
      </span>
    );
  }

  return null;
}