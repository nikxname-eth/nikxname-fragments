import { refreshManifoldWidgets } from './manifoldConnect';

const CONNECT_HOST_ID = 'manifold-connect';

const CONNECT_BUTTON_SELECTORS = [
  `#${CONNECT_HOST_ID} .m-connection-connect-wallet`,
  `#${CONNECT_HOST_ID} [data-widget="m-connect"] .m-connection-connect-wallet`,
  `#${CONNECT_HOST_ID} [data-widget="m-connect"] button`,
  '#m-connection .m-connection-connect-wallet',
];

function setConnectHostActivating(active: boolean): void {
  const host = document.getElementById(CONNECT_HOST_ID);
  if (!host) return;
  host.classList.toggle('manifold-connect-host--activating', active);
}

function findConnectButton(): HTMLElement | null {
  for (const selector of CONNECT_BUTTON_SELECTORS) {
    const button = document.querySelector<HTMLElement>(selector);
    if (button && !button.hasAttribute('disabled')) return button;
  }
  return null;
}

function findManifoldWalletButton(): HTMLElement | null {
  const connected = document.querySelector<HTMLElement>(
    `#${CONNECT_HOST_ID} .m-connection-disconnect-wallet`,
  );
  if (connected && !connected.hasAttribute('disabled')) return connected;
  return findConnectButton();
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
    window.setTimeout(() => setConnectHostActivating(false), 2_000);
  }
}