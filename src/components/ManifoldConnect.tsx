import { useManifoldRefresh } from '../hooks/useManifoldRefresh';
import {
  MANIFOLD_APP_NAME,
  MANIFOLD_CLIENT_ID,
  WALLETCONNECT_PROJECT_ID,
} from '../lib/manifoldConnect';

type Props = {
  /** When true, renders the real Manifold button in the nav (required for mobile). */
  visible?: boolean;
  /** Keep widget mounted but visually hidden after sign-in. */
  sessionActive?: boolean;
};

/**
 * Manifold Connect — powers wallet auth and claim widgets.
 * Use visible mode in the nav so users tap the real widget (proxy clicks fail on iOS).
 */
export function ManifoldConnect({ visible = false, sessionActive = false }: Props) {
  useManifoldRefresh('connect', MANIFOLD_CLIENT_ID, WALLETCONNECT_PROJECT_ID, visible, sessionActive);

  return (
    <div
      className={`manifold-connect-host${visible ? ' manifold-connect-host--visible' : ' manifold-connect-host--hidden'}${sessionActive ? ' manifold-connect-host--session' : ''}`}
      aria-hidden={visible && !sessionActive ? undefined : true}
    >
      <div
        data-widget="m-connect"
        data-app-name={MANIFOLD_APP_NAME}
        data-client-id={MANIFOLD_CLIENT_ID}
        data-network="1"
        data-multi="true"
        {...(WALLETCONNECT_PROJECT_ID
          ? { 'data-wallet-connect-project-id': WALLETCONNECT_PROJECT_ID }
          : {})}
      />
    </div>
  );
}