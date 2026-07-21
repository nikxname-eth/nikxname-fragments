import { Html, Head, Main, NextScript } from 'next/document';
import { CLAIM_SDK_VERSION, CONNECT_SDK_VERSION } from '../lib/manifoldConnect';

const META = {
  title: 'Together It Blooms — Nikxname',
  description: 'An on-chain art discovery experience. 27 fragments revealed over time. Collection I — A Familiar Burn.',
  url: 'https://nikxart.xyz',
  ogImage: 'https://assets.nikxart.xyz/sharepreview.jpg',
  twitterHandle: '@nikxname',
};

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content={META.description} />
        <meta name="theme-color" content="#06060a" />
        <meta name="color-scheme" content="dark light" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={META.url} />
        <meta property="og:title" content={META.title} />
        <meta property="og:description" content={META.description} />
        <meta property="og:image" content={META.ogImage} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1920" />
        <meta property="og:image:height" content="972" />
        <meta property="og:image:alt" content="Together It Blooms — Nikxname" />
        <meta property="og:site_name" content="Nikxname" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={META.twitterHandle} />
        <meta name="twitter:creator" content={META.twitterHandle} />
        <meta name="twitter:title" content={META.title} />
        <meta name="twitter:description" content={META.description} />
        <meta name="twitter:image" content={META.ogImage} />
        <meta name="twitter:image:alt" content="Together It Blooms — Nikxname" />

        {/* Favicon — served statically from the export (public/favicon.svg) */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* PNG fallbacks (apple-touch-icon.png etc.) can be added to public/ later if desired */}

        {/* CDN + fonts */}
        <link rel="preconnect" href="https://assets.nikxart.xyz" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://assets.nikxart.xyz" />
        <link rel="preconnect" href="https://connect.manifoldxyz.dev" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://claims.manifoldxyz.dev" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://relay.walletconnect.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://relay.walletconnect.org" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href={`https://connect.manifoldxyz.dev/${CONNECT_SDK_VERSION}/connect.css`}
        />
        <link
          rel="stylesheet"
          href={`https://claims.manifoldxyz.dev/${CLAIM_SDK_VERSION}/claimComplete.css`}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
