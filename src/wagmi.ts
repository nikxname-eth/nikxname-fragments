import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';

/** Wagmi is used for on-chain reads (tokenURI, balanceOf). Wallet UI is Manifold Connect. */
export const config = getDefaultConfig({
  appName: 'Nikxart',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '00000000000000000000000000000000',
  chains: [mainnet],
  ssr: true,
});