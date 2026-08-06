import { Html, Head, Main, NextScript } from 'next/document';

const META = {
  title: 'Explore · Nikxname',
  description:
    'The body of work — Together It Blooms, Life Impressions, and more. An elevated art experience for Nikxname.',
  url: 'https://explore.nikxart.xyz',
  ogImage: 'https://assets.nikxart.xyz/sharepreview.jpg',
};

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content={META.description} />
        <meta name="theme-color" content="#06060a" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={META.url} />
        <meta property="og:title" content={META.title} />
        <meta property="og:description" content={META.description} />
        <meta property="og:image" content={META.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={META.title} />
        <meta name="twitter:description" content={META.description} />
        <meta name="twitter:image" content={META.ogImage} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://assets.nikxart.xyz" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://assets.manifold.xyz" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
