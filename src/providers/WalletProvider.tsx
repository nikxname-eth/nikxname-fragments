import { createContext, useContext, type ReactNode } from 'react';
import { useManifoldWallet } from '../hooks/useManifoldWallet';

type WalletValue = ReturnType<typeof useManifoldWallet>;

const WalletContext = createContext<WalletValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useManifoldWallet();
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return value;
}