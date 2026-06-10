export const MANIFOLD_APP_NAME = process.env.NEXT_PUBLIC_MANIFOLD_APP_NAME ?? 'Nikxart';
export const MANIFOLD_CLIENT_ID = process.env.NEXT_PUBLIC_MANIFOLD_CLIENT_ID ?? '';
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

const WALLETCONNECT_ID_PATTERN = /^[a-f0-9]{32}$/i;

/** Both IDs must be set at build time for Manifold Connect + WalletConnect on mobile. */
export function isManifoldConnectReady(): boolean {
  return (
    MANIFOLD_CLIENT_ID.length > 0 &&
    WALLETCONNECT_ID_PATTERN.test(WALLETCONNECT_PROJECT_ID)
  );
}

export function readManifoldSession(): {
  isAuthenticated: boolean;
  address?: `0x${string}`;
} {
  const manifold = window.manifold;
  if (manifold?.isAuthenticated && manifold.address) {
    return { isAuthenticated: true, address: manifold.address };
  }
  return { isAuthenticated: false };
}

export function refreshManifoldWidgets(): void {
  window.dispatchEvent(new Event('m-refresh-widgets'));
}