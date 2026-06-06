import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '../wagmi';
 
const client = new QueryClient();
 
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#06060a" />
        {/*
          Manifold widget CSS — loaded once here so it's available globally.
          Pin to a specific version for stability (1.16.1 is current stable).
          ✏️  To update: check https://docs.manifold.xyz and bump the version number.
        */}
        <link
          rel="stylesheet"
          href="https://claims.manifoldxyz.dev/1.16.1/claimComplete.css"
        />
        <link
          rel="stylesheet"
          href="https://connect.manifoldxyz.dev/2.2.4/connect.css"
        />
      </Head>
 
      {/*
        Manifold widget JS — `async` is required by Next.js (no-sync-scripts rule).
        The connect widget must load before the claim widget.
      */}
      <Script
        src="https://connect.manifoldxyz.dev/2.2.4/connect.umd.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://claims.manifoldxyz.dev/1.16.1/claimComplete.umd.min.js"
        strategy="afterInteractive"
      />
 
      <WagmiProvider config={config}>
        <QueryClientProvider client={client}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#7a1424',
              accentColorForeground: '#e6ddd0',
              borderRadius: 'medium',
            })}
            modalSize="compact"
          >
            <Component {...pageProps} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}