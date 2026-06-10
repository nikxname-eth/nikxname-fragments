interface ManifoldWindow {
  isAuthenticated?: boolean;
  address?: `0x${string}`;
  oauthToken?: string;
}

interface ManifoldEthereumProvider {
  getOAuth?: (args: { appName: string; clientId: string }) => Promise<unknown>;
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface Window {
  manifold?: ManifoldWindow;
  ManifoldEthereumProvider?: ManifoldEthereumProvider;
}