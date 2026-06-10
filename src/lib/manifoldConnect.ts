export const MANIFOLD_APP_NAME = process.env.NEXT_PUBLIC_MANIFOLD_APP_NAME ?? 'Nikxart';
export const MANIFOLD_CLIENT_ID = process.env.NEXT_PUBLIC_MANIFOLD_CLIENT_ID ?? '';
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

const CONNECT_HOST_SELECTOR = '[data-widget="m-connect"]';
const SLEEP_MS = 160;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function getManifoldConnectHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(CONNECT_HOST_SELECTOR);
}

export function getManifoldConnectButton(): HTMLButtonElement | null {
  const host = getManifoldConnectHost();
  if (!host) return null;

  const buttons = host.querySelectorAll('button');
  for (const button of buttons) {
    if (button instanceof HTMLButtonElement) return button;
  }

  return null;
}

export function refreshManifoldWidgets(): void {
  window.dispatchEvent(new Event('m-refresh-widgets'));
}

export async function waitForManifoldProvider(maxWaitMs = 20_000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (window.ManifoldEthereumProvider) return true;
    refreshManifoldWidgets();
    await sleep(SLEEP_MS);
  }

  return !!window.ManifoldEthereumProvider;
}

export async function waitForManifoldConnectButton(maxWaitMs = 15_000): Promise<HTMLButtonElement | null> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    refreshManifoldWidgets();
    const button = getManifoldConnectButton();
    if (button) return button;
    await sleep(SLEEP_MS);
  }

  return null;
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

export function waitForManifoldAuthentication(maxWaitMs = 120_000): Promise<boolean> {
  const existing = readManifoldSession();
  if (existing.isAuthenticated) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (authenticated: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      window.removeEventListener('m-authenticated', onAuthenticated);
      window.removeEventListener('m-unauthenticated', onUnauthenticated);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('focus', onVisible);
      resolve(authenticated);
    };

    const check = () => {
      if (readManifoldSession().isAuthenticated) finish(true);
    };

    const onAuthenticated = () => check();
    const onUnauthenticated = () => check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    const timeoutId = window.setTimeout(() => finish(readManifoldSession().isAuthenticated), maxWaitMs);
    const pollId = window.setInterval(check, 800);

    window.addEventListener('m-authenticated', onAuthenticated);
    window.addEventListener('m-unauthenticated', onUnauthenticated);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('focus', onVisible);
  });
}

async function tryGetOAuth(): Promise<boolean> {
  const provider = window.ManifoldEthereumProvider;
  if (!provider?.getOAuth || !MANIFOLD_CLIENT_ID) return false;

  try {
    await provider.getOAuth({
      appName: MANIFOLD_APP_NAME,
      clientId: MANIFOLD_CLIENT_ID,
    });
    window.dispatchEvent(new CustomEvent('m-reauthenticate'));
    refreshManifoldWidgets();
    await sleep(400);
    return readManifoldSession().isAuthenticated;
  } catch {
    return false;
  }
}

/** Full Manifold auth — wallet pick + signature. */
export async function authenticateWithManifold(): Promise<boolean> {
  if (readManifoldSession().isAuthenticated) return true;

  refreshManifoldWidgets();
  await waitForManifoldProvider();
  await waitForManifoldConnectButton();

  const button = getManifoldConnectButton();
  if (button) button.click();

  let authed = await waitForManifoldAuthentication(120_000);
  if (authed) return true;

  authed = await tryGetOAuth();
  if (authed) return true;

  if (button) button.click();
  return waitForManifoldAuthentication(60_000);
}

/** @deprecated Use authenticateWithManifold */
export async function openManifoldConnect(): Promise<void> {
  const ok = await authenticateWithManifold();
  if (!ok) throw new Error('Manifold Connect is not ready');
}