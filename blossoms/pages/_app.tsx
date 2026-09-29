import type { AppProps } from 'next/app';
import '../styles/blossoms.css';

export default function BlossomsApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
