import '../styles/globals.css';
import '../styles/site.css';
import type { ReactNode } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { CLAIM_SDK_VERSION, CONNECT_SDK_VERSION } from '../lib/manifoldConnect';
import { useContractMintWatcher } from '../hooks/useContractMintWatcher';
import { useManifoldMobileRecovery } from '../hooks/useManifoldMobileRecovery';
import { usePostMintRefresh } from '../hooks/usePostMintRefresh';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SiteAudioProvider } from '../providers/SiteAudioProvider';
import { WalletProvider, useWallet } from '../providers/WalletProvider';

function ManifoldShell({ children }: { children: ReactNode }) {
  const { address } = useWallet();
  useManifoldMobileRecovery();
  useContractMintWatcher(address);
  usePostMintRefresh();
  return <>{children}</>;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
      </Head>

      <Script
        id="manifold-connect-js"
        src={`https://connect.manifoldxyz.dev/${CONNECT_SDK_VERSION}/connect.umd.min.js`}
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event('m-refresh-widgets'));
        }}
      />
      <Script
        id="manifold-claims-js"
        src={`https://claims.manifoldxyz.dev/${CLAIM_SDK_VERSION}/claimComplete.umd.min.js`}
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event('m-refresh-widgets'));
        }}
      />

      <WalletProvider>
        <SiteAudioProvider>
          <ManifoldShell>
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
          </ManifoldShell>
        </SiteAudioProvider>
      </WalletProvider>
    </>
  );
}