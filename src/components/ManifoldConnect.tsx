import { useManifoldRefresh } from '../hooks/useManifoldRefresh';
import {
  isManifoldConnectReady,
  MANIFOLD_APP_NAME,
  MANIFOLD_CLIENT_ID,
  WALLETCONNECT_PROJECT_ID,
} from '../lib/manifoldConnect';

type Props = {
  /** Renders the real Manifold button in the nav (required for mobile deep links). */
  visible?: boolean;
  /** Keep widget mounted but visually hidden after sign-in. */
  sessionActive?: boolean;
};

/**
 * Manifold Connect — powers wallet auth and claim widgets.
 * Visible in the nav so users tap the real widget (proxy clicks fail on iOS).
 */
export function ManifoldConnect({ visible = false, sessionActive = false }: Props) {
  const ready = isManifoldConnectReady();

  useManifoldRefresh('connect', MANIFOLD_CLIENT_ID, WALLETCONNECT_PROJECT_ID, visible, sessionActive, ready);

  if (!ready) return null;

  return (
    <div
      id="manifold-connect"
      className={`manifold-connect-host${visible ? ' manifold-connect-host--visible' : ' manifold-connect-host--hidden'}${sessionActive ? ' manifold-connect-host--session' : ''}`}
      aria-hidden={visible && !sessionActive ? undefined : true}
    >
      <div
        data-widget="m-connect"
        data-app-name={MANIFOLD_APP_NAME}
        data-client-id={MANIFOLD_CLIENT_ID}
        data-network="1"
        data-multi="true"
        data-delay-auth="true"
        data-auto-reconnect="true"
        data-show-balance="false"
        data-show-chain="false"
        data-wallet-connect-project-id={WALLETCONNECT_PROJECT_ID}
      />
    </div>
  );
}