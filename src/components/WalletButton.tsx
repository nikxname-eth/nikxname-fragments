import { useEffect, useRef, useState } from 'react';
import {
  clickManifoldConnectButton,
  disconnectManifoldWallet,
} from '../lib/openManifoldConnect';
import { useWallet } from '../providers/WalletProvider';

type Props = {
  address?: `0x${string}`;
  shortAddress?: string;
};

/**
 * Connected wallet control — open Manifold account or disconnect in one place.
 */
export function WalletButton({ address, shortAddress }: Props) {
  const { disconnect, sync } = useWallet();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!address || !shortAddress) return null;

  const onManage = async () => {
    setBusy(true);
    try {
      await clickManifoldConnectButton();
      await sync();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const onDisconnect = async () => {
    setBusy(true);
    try {
      await disconnect();
      await disconnectManifoldWallet();
      await sync();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className="wallet-menu" ref={rootRef}>
      <button
        type="button"
        className="wallet-btn wallet-btn--connected nav-connect-btn nav-connect-btn--linked"
        title={address}
        aria-label={`Wallet ${shortAddress}. Open menu to manage or disconnect.`}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="wallet-menu-addr">{shortAddress}</span>
        <span className="wallet-menu-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="wallet-menu-panel" role="menu">
          <p className="wallet-menu-full" title={address}>
            {address.slice(0, 10)}…{address.slice(-8)}
          </p>
          <button
            type="button"
            role="menuitem"
            className="wallet-menu-item"
            disabled={busy}
            onClick={() => void onManage()}
          >
            Manage wallet
          </button>
          <button
            type="button"
            role="menuitem"
            className="wallet-menu-item wallet-menu-item--danger"
            disabled={busy}
            onClick={() => void onDisconnect()}
          >
            {busy ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      )}
    </div>
  );
}
