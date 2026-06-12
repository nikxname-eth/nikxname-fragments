import '../styles/globals.css';
import '../styles/site.css';
import type { ReactNode } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { useManifoldMobileRecovery } from '../hooks/useManifoldMobileRecovery';
import { usePostMintRefresh } from '../hooks/usePostMintRefresh';

/** Connect 6.1.0 + Claims 1.16.1 buy-only; delay-auth defers sign-in until collect. */
const CONNECT_VERSION = '6.1.0';
const CLAIM_VERSION = '1.16.1';

function ManifoldShell({ children }: { children: ReactNode }) {
  useManifoldMobileRecovery();
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
        <meta name="theme-color" content="#06060a" />
        <link
          rel="stylesheet"
          href={`https://connect.manifoldxyz.dev/${CONNECT_VERSION}/connect.css`}
        />
        <link
          rel="stylesheet"
          href={`https://claims.manifoldxyz.dev/${CLAIM_VERSION}/claimComplete.css`}
        />
      </Head>

      <Script
        id="manifold-connect-js"
        src={`https://connect.manifoldxyz.dev/${CONNECT_VERSION}/connect.umd.min.js`}
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event('m-refresh-widgets'));
        }}
      />
      <Script
        id="manifold-claims-js"
        src={`https://claims.manifoldxyz.dev/${CLAIM_VERSION}/claimComplete.umd.min.js`}
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event('m-refresh-widgets'));
        }}
      />

      <ManifoldShell>
        <Component {...pageProps} />
      </ManifoldShell>
    </>
  );
}