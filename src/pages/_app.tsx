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
        {/* Manifold CSS — must be in <head> before body renders */}
        <link rel="stylesheet" href="https://connect.manifoldxyz.dev/latest/connect.css" />
        <link rel="stylesheet" href="https://claims.manifoldxyz.dev/latest/claimComplete.css" />
      </Head>

      {/* Connect widget MUST load before claim widget per Manifold docs */}
      <Script
        src="https://connect.manifoldxyz.dev/latest/connect.umd.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://claims.manifoldxyz.dev/latest/claimComplete.umd.min.js"
        strategy="beforeInteractive"
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