export const MANIFOLD_APP_NAME = process.env.NEXT_PUBLIC_MANIFOLD_APP_NAME ?? 'Nikxart';
export const MANIFOLD_CLIENT_ID = process.env.NEXT_PUBLIC_MANIFOLD_CLIENT_ID ?? '';
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nikxart.xyz';
/** Websocket RPC for mobile browsers without an injected wallet (Manifold fallback provider). */
export const ETH_FALLBACK_WSS =
  process.env.NEXT_PUBLIC_ETH_FALLBACK_WSS ?? 'wss://ethereum-rpc.publicnode.com';

const WALLETCONNECT_ID_PATTERN = /^[a-f0-9]{32}$/i;
const WSS_PATTERN = /^wss:\/\/.+/;

/** Both IDs must be set at build time for Manifold Connect + WalletConnect on mobile. */
export function isManifoldConnectReady(): boolean {
  return (
    MANIFOLD_CLIENT_ID.length > 0 &&
    WALLETCONNECT_ID_PATTERN.test(WALLETCONNECT_PROJECT_ID)
  );
}

export function readManifoldSession(): {
  isAuthenticated: boolean;
  isConnected: boolean;
  address?: `0x${string}`;
} {
  const manifold = window.manifold;
  if (manifold?.address) {
    return {
      isAuthenticated: !!manifold.isAuthenticated,
      isConnected: true,
      address: manifold.address,
    };
  }
  return { isAuthenticated: false, isConnected: false };
}

export function hasFallbackProvider(): boolean {
  return WSS_PATTERN.test(ETH_FALLBACK_WSS);
}

/** Resume WalletConnect handoff after returning from a mobile wallet app. */
export function recoverManifoldMobileSession(): void {
  refreshManifoldWidgets();
  for (const ms of [150, 500, 1_200, 3_000]) {
    window.setTimeout(() => {
      refreshManifoldWidgets();
      const session = readManifoldSession();
      if (session.isConnected && !session.isAuthenticated) {
        void ensureManifoldAuthenticated();
      }
    }, ms);
  }
}

export function refreshManifoldWidgets(): void {
  window.dispatchEvent(new Event('m-refresh-widgets'));
}

let authInFlight: Promise<boolean> | null = null;

/**
 * Claim widgets need an OAuth token — not just a connected provider.
 * Rainbow/WalletConnect can show an address while mint still fails without this.
 */
export function ensureManifoldAuthenticated(): Promise<boolean> {
  if (authInFlight) return authInFlight;

  authInFlight = (async () => {
    const session = readManifoldSession();
    if (session.isAuthenticated) return true;

    const provider = window.ManifoldEthereumProvider;
    if (!provider?.getOAuth) return false;

    try {
      await provider.getOAuth({
        appName: MANIFOLD_APP_NAME,
        clientId: MANIFOLD_CLIENT_ID,
      });
      window.dispatchEvent(new CustomEvent('m-reauthenticate'));
      refreshManifoldWidgets();
      return readManifoldSession().isAuthenticated;
    } catch {
      return false;
    } finally {
      authInFlight = null;
    }
  })();

  return authInFlight;
}