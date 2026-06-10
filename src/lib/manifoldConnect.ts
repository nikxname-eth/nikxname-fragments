export const MANIFOLD_APP_NAME = process.env.NEXT_PUBLIC_MANIFOLD_APP_NAME ?? 'Nikxart';
export const MANIFOLD_CLIENT_ID = process.env.NEXT_PUBLIC_MANIFOLD_CLIENT_ID ?? '';
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

const CONNECT_HOST_SELECTOR = '[data-widget="m-connect"]';

export function getManifoldConnectHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(CONNECT_HOST_SELECTOR);
}

export function getManifoldConnectButton(): HTMLButtonElement | null {
  const host = getManifoldConnectHost();
  const button = host?.querySelector('button');
  return button instanceof HTMLButtonElement ? button : null;
}

export function refreshManifoldWidgets(): void {
  window.dispatchEvent(new Event('m-refresh-widgets'));
}

export async function waitForManifoldConnectButton(maxWaitMs = 12_000): Promise<HTMLButtonElement | null> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    refreshManifoldWidgets();
    const button = getManifoldConnectButton();
    if (button) return button;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }

  return null;
}

/** Opens the hidden Manifold Connect flow (WalletConnect on mobile). */
export async function openManifoldConnect(): Promise<void> {
  const button = await waitForManifoldConnectButton();
  if (!button) {
    throw new Error('Manifold Connect is not ready');
  }
  button.click();
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

export function waitForManifoldAuthentication(maxWaitMs = 90_000): Promise<boolean> {
  const existing = readManifoldSession();
  if (existing.isAuthenticated) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (authenticated: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener('m-authenticated', onAuthenticated);
      window.removeEventListener('m-unauthenticated', onUnauthenticated);
      resolve(authenticated);
    };

    const onAuthenticated = () => {
      finish(readManifoldSession().isAuthenticated);
    };

    const onUnauthenticated = () => {
      /* user may still be mid WalletConnect handoff */
    };

    const timeoutId = window.setTimeout(() => {
      finish(readManifoldSession().isAuthenticated);
    }, maxWaitMs);

    window.addEventListener('m-authenticated', onAuthenticated);
    window.addEventListener('m-unauthenticated', onUnauthenticated);
  });
}