const APP_NAME = process.env.NEXT_PUBLIC_MANIFOLD_APP_NAME ?? 'Nikxart';
const CLIENT_ID = process.env.NEXT_PUBLIC_MANIFOLD_CLIENT_ID ?? '';

/** Hidden host — initializes Manifold provider for claim widgets. UI is WalletButton. */
export function ManifoldConnect() {
  return (
    <div className="manifold-connect-host" aria-hidden="true">
      <div
        data-widget="m-connect"
        data-app-name={APP_NAME}
        data-client-id={CLIENT_ID}
        data-grant-type="signature"
        data-network="1"
      />
    </div>
  );
}