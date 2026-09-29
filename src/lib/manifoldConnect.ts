/** Manifold SDK versions — keep in sync with _document.tsx stylesheets and _app.tsx scripts. */
export const CONNECT_SDK_VERSION = '6.1.0';
export const CLAIM_SDK_VERSION = '1.16.1';

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

function readProviderAddress(): `0x${string}` | undefined {
  const provider = window.ManifoldEthereumProvider as
    | { selectedAddress?: string; address?: string }
    | undefined;
  const candidate = provider?.selectedAddress ?? provider?.address;
  if (typeof candidate === 'string' && candidate.startsWith('0x')) {
    return candidate as `0x${string}`;
  }
  return undefined;
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

  const providerAddress = readProviderAddress();
  if (providerAddress) {
    return {
      isAuthenticated: false,
      isConnected: true,
      address: providerAddress,
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
      /* delay-auth: claim widget triggers getOAuth at collect time */
    }, ms);
  }
}

export function refreshManifoldWidgets(): void {
  window.dispatchEvent(new Event('m-refresh-widgets'));
}

let authInFlight: Promise<boolean> | null = null;

export function waitForManifoldProvider(timeoutMs = 12_000): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.ManifoldEthereumProvider?.getOAuth) {
      resolve(true);
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.ManifoldEthereumProvider?.getOAuth) {
        window.clearInterval(timer);
        resolve(true);
      } else if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 100);
  });
}

export type EnsureAuthOptions = {
  /**
   * Always re-run getOAuth even if the session already looks authenticated.
   * Manifold claim checkout often sits half-authed (address bar + isAuthenticated)
   * while OAuth is stale — mint stays blocked until disconnect/reconnect.
   * Force refresh fixes that before "Claim now · Free".
   */
  force?: boolean;
  timeoutMs?: number;
};

/**
 * Claim widgets need a live OAuth token — not just a connected provider address.
 * Rainbow/WalletConnect can show an address while mint still fails without this.
 */
export function ensureManifoldAuthenticated(
  options: EnsureAuthOptions = {},
): Promise<boolean> {
  const { force = false, timeoutMs = 15_000 } = options;

  // Coalesce concurrent soft checks; force always runs a fresh handshake.
  if (authInFlight && !force) return authInFlight;

  const run = (async () => {
    if (!force && readManifoldSession().isAuthenticated) return true;

    const ready = await waitForManifoldProvider(timeoutMs);
    if (!ready || !window.ManifoldEthereumProvider?.getOAuth) return false;

    try {
      await Promise.race([
        window.ManifoldEthereumProvider.getOAuth({
          appName: MANIFOLD_APP_NAME,
          clientId: MANIFOLD_CLIENT_ID,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('oauth timeout')), timeoutMs),
        ),
      ]);
      window.dispatchEvent(new CustomEvent('m-reauthenticate'));
      refreshManifoldWidgets();
      // After force refresh, prefer success of getOAuth itself; session flag can lag.
      if (force) return true;
      return readManifoldSession().isAuthenticated;
    } catch {
      return false;
    }
  })();

  if (!force) {
    authInFlight = run.finally(() => {
      authInFlight = null;
    });
    return authInFlight;
  }

  return run;
}