import type { OwnedFragment } from '../hooks/useOwnedFragments';

type Props = {
  open: boolean;
  address?: `0x${string}`;
  owned: OwnedFragment[];
  balance: number;
  isLoading: boolean;
  walletOwnsAny: boolean;
};

export function CollectionDrawer({
  open,
  address,
  owned,
  balance,
  isLoading,
  walletOwnsAny,
}: Props) {
  return (
    <div className={`collection-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="collection-drawer-inner">
        <div className="collection-header">
          <span className="collection-title">Your Collection</span>
          {walletOwnsAny && (
            <span className="collection-count">
              {balance} fragment{balance !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!address && (
          <p className="collection-state">Collect a piece to connect your wallet and view what you own.</p>
        )}
        {address && isLoading && (
          <p className="collection-state">Reading your collection...</p>
        )}
        {address && !isLoading && !walletOwnsAny && (
          <p className="collection-state">No fragments in this wallet yet.</p>
        )}
        {walletOwnsAny && (
          <div className="collection-grid">
            {owned.map((fragment) => (
              <div key={fragment.pieceNumber} className="collection-piece">
                <span className="collection-piece-num">
                  {String(fragment.pieceNumber).padStart(2, '0')}
                </span>
                <span className="collection-piece-name">{fragment.title}</span>
                {fragment.quantity > 1 && (
                  <span className="collection-qty">x{fragment.quantity}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}