import type { AppProps } from 'next/app';
import '../styles/explore.css';

export default function ExploreApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
