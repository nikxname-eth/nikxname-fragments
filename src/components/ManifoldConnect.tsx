import { useManifoldRefresh } from '../hooks/useManifoldRefresh';
import {
  MANIFOLD_APP_NAME,
  MANIFOLD_CLIENT_ID,
  WALLETCONNECT_PROJECT_ID,
} from '../lib/manifoldConnect';

/** Hidden host — Manifold Connect powers wallet auth + claim widgets. UI is WalletButton. */
export function ManifoldConnect() {
  useManifoldRefresh('connect', MANIFOLD_CLIENT_ID, WALLETCONNECT_PROJECT_ID);

  return (
    <div className="manifold-connect-host" aria-hidden="true">
      <div
        data-widget="m-connect"
        data-app-name={MANIFOLD_APP_NAME}
        data-client-id={MANIFOLD_CLIENT_ID}
        data-grant-type="signature"
        data-network="1"
        data-multi="true"
        {...(WALLETCONNECT_PROJECT_ID
          ? { 'data-wallet-connect-project-id': WALLETCONNECT_PROJECT_ID }
          : {})}
      />
    </div>
  );
}