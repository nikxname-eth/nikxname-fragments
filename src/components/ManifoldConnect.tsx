const APP_NAME = process.env.NEXT_PUBLIC_MANIFOLD_APP_NAME ?? 'Nikxart';
const CLIENT_ID = process.env.NEXT_PUBLIC_MANIFOLD_CLIENT_ID ?? '';

export function ManifoldConnect() {
  return (
    <div
      data-widget="m-connect"
      data-app-name={APP_NAME}
      data-client-id={CLIENT_ID}
      data-grant-type="signature"
      data-network="1"
    />
  );
}