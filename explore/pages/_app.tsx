import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/explore.css';

const META = {
  title: 'Explore · Nikxname - Art Theatre',
  description:
    'A luxurious art theatre for Nikxname - enter the world, explore collections, and open works with care. Telling human stories through brushstrokes.',
  url: 'https://explore.nikxart.xyz',
  ogImage: 'https://explore.nikxart.xyz/voices-of-time/share.jpg?v=panels',
  ogWidth: '2400',
  ogHeight: '1257',
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
        <meta property="og:image:width" content={META.ogWidth} key="og-image-w" />
        <meta property="og:image:height" content={META.ogHeight} key="og-image-h" />
        <meta property="og:image:type" content="image/jpeg" key="og-image-type" />
        <meta property="og:image:alt" content="Voices Of Time — a 1 of 1 triptych on the block" key="og-image-alt" />
        <meta name="twitter:card" content="summary_large_image" key="twitter-card" />
        <meta name="twitter:title" content={META.title} key="twitter-title" />
        <meta name="twitter:description" content={META.description} key="twitter-desc" />
        <meta name="twitter:image" content={META.ogImage} key="twitter-image" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
