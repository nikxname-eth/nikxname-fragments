import { refreshManifoldWidgets } from './manifoldConnect';

const CONNECT_HOST_ID = 'manifold-connect';

const CONNECT_BUTTON_SELECTORS = [
  `#${CONNECT_HOST_ID} .m-connection-connect-wallet`,
  `#${CONNECT_HOST_ID} [data-widget="m-connect"] .m-connection-connect-wallet`,
  `#${CONNECT_HOST_ID} [data-widget="m-connect"] button`,
  '#m-connection .m-connection-connect-wallet',
];

const DISCONNECT_SELECTORS = [
  `#${CONNECT_HOST_ID} .m-connection-disconnect-wallet`,
  `#${CONNECT_HOST_ID} [data-widget="m-connect"] .m-connection-disconnect-wallet`,
  '#m-connection .m-connection-disconnect-wallet',
  'button.m-connection-disconnect-wallet',
  '[class*="disconnect"]',
];

function setConnectHostActivating(active: boolean): void {
  const host = document.getElementById(CONNECT_HOST_ID);
  if (!host) return;
  host.classList.toggle('manifold-connect-host--activating', active);
  // While activating, allow pointer events so Manifold can open its modal
  if (active) {
    host.classList.add('manifold-connect-host--interactive');
  } else {
    host.classList.remove('manifold-connect-host--interactive');
  }
}

function findConnectButton(): HTMLElement | null {
  for (const selector of CONNECT_BUTTON_SELECTORS) {
    const button = document.querySelector<HTMLElement>(selector);
    if (button && !button.hasAttribute('disabled')) return button;
  }
  return null;
}

function findDisconnectButton(): HTMLElement | null {
  for (const selector of DISCONNECT_SELECTORS) {
    try {
      const button = document.querySelector<HTMLElement>(selector);
      if (!button || button.hasAttribute('disabled')) continue;
      const text = (button.textContent || '').toLowerCase();
      // Prefer real disconnect controls; skip generic buttons
      if (
        selector.includes('disconnect') ||
        text.includes('disconnect') ||
        text.includes('log out') ||
        text.includes('logout') ||
        text.includes('sign out')
      ) {
        return button;
      }
    } catch {
      /* invalid selector in some environments */
    }
  }
  return null;
}

function findManifoldWalletButton(): HTMLElement | null {
  return findDisconnectButton() ?? findConnectButton();
}

async function waitForElement(
  finder: () => HTMLElement | null,
  maxAttempts = 50,
  intervalMs = 120,
): Promise<HTMLElement | null> {
  let attempts = 0;

  return new Promise((resolve) => {
    const tryFind = () => {
      refreshManifoldWidgets();
      const el = finder();
      if (el || ++attempts >= maxAttempts) {
        window.clearInterval(timer);
        resolve(el);
      }
    };

    tryFind();
    const timer = window.setInterval(tryFind, intervalMs);
  });
}

/** Open Manifold wallet UI (connect picker or account modal when linked). */
export async function clickManifoldConnectButton(): Promise<boolean> {
  refreshManifoldWidgets();
  setConnectHostActivating(true);

  try {
    const button = await waitForElement(findManifoldWalletButton, 45, 100);
    if (!button) return false;
    button.click();
    return true;
  } finally {
    window.setTimeout(() => setConnectHostActivating(false), 2_500);
  }
}

/** Explicit connect only (never hits disconnect control). */
export async function clickManifoldConnectOnly(): Promise<boolean> {
  refreshManifoldWidgets();
  setConnectHostActivating(true);
  try {
    const button = await waitForElement(findConnectButton, 45, 100);
    if (!button) return false;
    button.click();
    return true;
  } finally {
    window.setTimeout(() => setConnectHostActivating(false), 2_500);
  }
}

/**
 * Disconnect wallet across Manifold UI + local session.
 * Clears sticky app state so Connect shows again immediately.
 */
export async function disconnectManifoldWallet(): Promise<boolean> {
  refreshManifoldWidgets();
  setConnectHostActivating(true);

  let clicked = false;
  try {
    // 1) Manifold disconnect control (may need account menu open first)
    let button = findDisconnectButton();
    if (!button) {
      // Open account UI then look again
      const manage = findManifoldWalletButton();
      manage?.click();
      button = await waitForElement(findDisconnectButton, 30, 100);
    }
    if (button) {
      button.click();
      clicked = true;
    }

    // 2) Provider-level disconnect if exposed
    try {
      await window.ManifoldEthereumProvider?.request?.({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch {
      /* not supported */
    }

    try {
      const eth = (window as unknown as {
        ethereum?: { request?: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
      }).ethereum;
      await eth?.request?.({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch {
      /* not supported */
    }

    // 3) Broadcast so app clears sticky address immediately
    window.dispatchEvent(new Event('m-unauthenticated'));
    refreshManifoldWidgets();
    return clicked || true;
  } finally {
    window.setTimeout(() => setConnectHostActivating(false), 1_500);
  }
}
