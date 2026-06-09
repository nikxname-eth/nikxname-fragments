import '../styles/globals.css';
import '../styles/site.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '../wagmi';

const CONNECT_VERSION = '3.3.0';
const CLAIM_VERSION = '1.16.1';
const client = new QueryClient();

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        src={`https://connect.manifoldxyz.dev/${CONNECT_VERSION}/connect.umd.min.js`}
        strategy="beforeInteractive"
      />
      <Script
        src={`https://claims.manifoldxyz.dev/${CLAIM_VERSION}/claimComplete.umd.min.js`}
        strategy="beforeInteractive"
      />

      <WagmiProvider config={config}>
        <QueryClientProvider client={client}>
          <Component {...pageProps} />
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}