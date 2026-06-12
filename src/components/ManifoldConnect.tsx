import { useManifoldRefresh } from '../hooks/useManifoldRefresh';
import {
  ETH_FALLBACK_WSS,
  hasFallbackProvider,
  isManifoldConnectReady,
  MANIFOLD_APP_NAME,
  MANIFOLD_CLIENT_ID,
  SITE_URL,
  WALLETCONNECT_PROJECT_ID,
} from '../lib/manifoldConnect';

type Props = {
  /** Renders the real Manifold button in the nav (required for mobile deep links). */
  visible?: boolean;
};

/**
 * Manifold Connect — powers wallet auth and claim widgets.
 * Visible in the nav so users tap the real widget (proxy clicks fail on iOS).
 */
export function ManifoldConnect({ visible = false }: Props) {
  const ready = isManifoldConnectReady();

  useManifoldRefresh('connect', MANIFOLD_CLIENT_ID, WALLETCONNECT_PROJECT_ID, visible, ready);

  if (!ready) return null;

  return (
    <div
      id="manifold-connect"
      className={`manifold-connect-host${visible ? ' manifold-connect-host--visible' : ' manifold-connect-host--hidden'}`}
      aria-hidden={visible ? undefined : true}
    >
      <div
        data-widget="m-connect"
        data-app-name={MANIFOLD_APP_NAME}
        data-client-id={MANIFOLD_CLIENT_ID}
        data-grant-type="signature"
        data-network="1"
        data-multi="true"
        data-auto-reconnect="true"
        data-show-balance="false"
        data-show-chain="false"
        data-wallet-connect-project-id={WALLETCONNECT_PROJECT_ID}
        {...(hasFallbackProvider()
          ? { 'data-fallback-provider': ETH_FALLBACK_WSS }
          : {})}
        {...(SITE_URL ? { 'data-app-url': SITE_URL } : {})}
      />
    </div>
  );
}