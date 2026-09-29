import { useCallback, useEffect, useRef, useState } from 'react';
import { readManifoldSession, refreshManifoldWidgets } from '../lib/manifoldConnect';
import {
  FINALE_SESSION_KEY,
  FINALE_SESSION_LOCAL_KEY,
  normalizeWalletAddress,
  readFinaleSession,
} from '../config/finale';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function seedFromFinaleSession(): `0x${string}` | undefined {
  if (typeof window === 'undefined') return undefined;
  return normalizeWalletAddress(readFinaleSession()?.address);
}

async function readInjectedAddress(): Promise<`0x${string}` | undefined> {
  try {
    const accounts = (await window.ManifoldEthereumProvider?.request?.({
      method: 'eth_accounts',
    })) as string[] | undefined;
    if (accounts?.[0]?.startsWith('0x')) {
      return accounts[0] as `0x${string}`;
    }
  } catch {
    /* provider not ready */
  }

  try {
    const eth = (window as unknown as { ethereum?: { request?: (a: { method: string }) => Promise<unknown> } })
      .ethereum;
    const accounts = (await eth?.request?.({ method: 'eth_accounts' })) as string[] | undefined;
    if (accounts?.[0]?.startsWith('0x')) {
      return accounts[0] as `0x${string}`;
    }
  } catch {
    /* no injected ethereum */
  }
  return undefined;
}

/**
 * Read-only sync with Manifold session — connect/collect UI lives in claim widgets.
 * Sticky: once we know an address (session / provider / finale portal), do not flash
 * it away on brief provider blips — collectors are usually already logged in.
 */
export function useManifoldWallet() {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const stickyRef = useRef<`0x${string}` | undefined>(undefined);
  const emptyStreakRef = useRef(0);

  const applyAddress = useCallback((next: `0x${string}` | undefined, authed: boolean) => {
    if (next) {
      emptyStreakRef.current = 0;
      stickyRef.current = next;
      setAddress(next);
      setIsAuthenticated(authed);
      return;
    }

    // Soft empty: keep sticky for a few polls so Connect does not flash
    emptyStreakRef.current += 1;
    if (emptyStreakRef.current < 4 && stickyRef.current) {
      setAddress(stickyRef.current);
      return;
    }

    stickyRef.current = undefined;
    setAddress(undefined);
    setIsAuthenticated(false);
  }, []);

  const sync = useCallback(async () => {
    const session = readManifoldSession();
    if (session.address) {
      applyAddress(session.address, !!session.isAuthenticated);
      return;
    }

    const injected = await readInjectedAddress();
    if (injected) {
      applyAddress(injected, false);
      return;
    }

    // Finale portal already verified this wallet — use until Manifold hydrates
    if (!stickyRef.current) {
      const seeded = seedFromFinaleSession();
      if (seeded) {
        applyAddress(seeded, false);
        return;
      }
    }

    applyAddress(undefined, false);
  }, [applyAddress]);

  useEffect(() => {
    // Immediate seed so first paint is not "Connect"
    const seeded = seedFromFinaleSession();
    if (seeded) {
      stickyRef.current = seeded;
      setAddress(seeded);
    }

    void sync();
    refreshManifoldWidgets();
    // Catch Manifold late-init after open from portal tab
    const boot = [100, 400, 1_000, 2_500].map((ms) =>
      window.setTimeout(() => {
        void sync();
        refreshManifoldWidgets();
      }, ms),
    );

    const onWallet = () => {
      void sync();
      refreshManifoldWidgets();
    };

    const onUnauth = () => {
      emptyStreakRef.current = 99;
      stickyRef.current = undefined;
      setAddress(undefined);
      setIsAuthenticated(false);
      void sync();
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void sync();
      refreshManifoldWidgets();
    };

    window.addEventListener('m-authenticated', onWallet);
    window.addEventListener('m-unauthenticated', onUnauth);
    window.addEventListener('m-refresh-widgets', onWallet);
    window.addEventListener('m-reauthenticate', onWallet);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('focus', onVisible);

    const poll = window.setInterval(sync, 2_500);

    return () => {
      boot.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('m-authenticated', onWallet);
      window.removeEventListener('m-unauthenticated', onUnauth);
      window.removeEventListener('m-refresh-widgets', onWallet);
      window.removeEventListener('m-reauthenticate', onWallet);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(poll);
    };
  }, [sync]);

  /** Force-clear sticky session so Connect shows; pair with Manifold disconnect UI. */
  const disconnect = useCallback(async () => {
    emptyStreakRef.current = 99;
    stickyRef.current = undefined;
    setAddress(undefined);
    setIsAuthenticated(false);

    // Drop portal wallet seed so a new account can bind cleanly
    try {
      const raw =
        localStorage.getItem(FINALE_SESSION_LOCAL_KEY) ||
        sessionStorage.getItem(FINALE_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { sets?: number; at?: number; address?: string };
        const next = JSON.stringify({
          sets: typeof parsed.sets === 'number' ? parsed.sets : 0,
          at: Date.now(),
          // keep sets hint, clear address so codes re-bind to new wallet
        });
        sessionStorage.setItem(FINALE_SESSION_KEY, next);
        localStorage.setItem(FINALE_SESSION_LOCAL_KEY, next);
      }
    } catch {
      /* ignore */
    }

    window.dispatchEvent(new Event('m-unauthenticated'));
    refreshManifoldWidgets();
  }, []);

  return {
    address,
    isAuthenticated,
    isConnected: !!address,
    shortAddress: address ? shortenAddress(address) : undefined,
    sync,
    disconnect,
  };
}
