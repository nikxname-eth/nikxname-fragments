import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/explore.css';

const META = {
  title: 'Explore · Nikxname - Art Theatre',
  description:
    'A luxurious art theatre for Nikxname - enter the world, explore collections, and open works with care. Telling human stories through brushstrokes.',
  url: 'https://explore.nikxart.xyz',
  ogImage: 'https://assets.nikxart.xyz/og/life-impression-02.jpg',
};

export default function ExploreApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="description" content={META.description} key="description" />
        <meta property="og:type" content="website" key="og-type" />
        <meta property="og:url" content={META.url} key="og-url" />
        <meta property="og:title" content={META.title} key="og-title" />
        <meta property="og:description" content={META.description} key="og-desc" />
        <meta property="og:image" content={META.ogImage} key="og-image" />
        <meta name="twitter:card" content="summary_large_image" key="twitter-card" />
        <meta name="twitter:title" content={META.title} key="twitter-title" />
        <meta name="twitter:description" content={META.description} key="twitter-desc" />
        <meta name="twitter:image" content={META.ogImage} key="twitter-image" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
