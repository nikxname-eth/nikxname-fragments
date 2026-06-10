type Props = {
  address?: `0x${string}`;
  shortAddress?: string;
  isConnecting: boolean;
  connect: () => void;
};

export function WalletButton({ address, shortAddress, isConnecting, connect }: Props) {

  if (address && shortAddress) {
    return (
      <button
        type="button"
        className="wallet-btn wallet-btn--connected"
        title={address}
        aria-label={`Connected wallet ${address}`}
      >
        {shortAddress}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="wallet-btn"
      onClick={() => connect()}
      disabled={isConnecting}
      aria-busy={isConnecting}
    >
      {isConnecting ? 'Signing in…' : 'Connect'}
    </button>
  );
}