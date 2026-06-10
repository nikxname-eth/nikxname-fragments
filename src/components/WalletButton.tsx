type Props = {
  address?: `0x${string}`;
  shortAddress?: string;
};

/** Shows authenticated wallet after Manifold claim flow completes. */
export function WalletButton({ address, shortAddress }: Props) {
  if (!address || !shortAddress) return null;

  return (
    <span
      className="wallet-btn wallet-btn--connected nav-connect-chip"
      title={address}
      aria-label={`Connected wallet ${address}`}
    >
      {shortAddress}
    </span>
  );
}