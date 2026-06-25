import { getPieceNumberForInstanceId, PIECE_NAMES } from '../config/artist';

export function checkoutSucceeded(): boolean {
  return Boolean(
    document.querySelector('.checkout-modal.success') ||
      document.querySelector('.checkout-success-actions') ||
      document.querySelector('.checkout-post-mint-message') ||
      document.querySelector('.checkout-post-mint-title'),
  );
}

export function resolveMintedPiece(): number {
  const widgets = document.querySelectorAll('[data-widget="m-claim-buy-only"][data-id]');
  for (const widget of widgets) {
    const piece = getPieceNumberForInstanceId(widget.getAttribute('data-id'));
    if (piece > 0) return piece;
  }
  return 0;
}

/** Prefer Manifold checkout title; fall back to site piece naming. */
export function resolveCheckoutPieceName(pieceNumber: number): string {
  const titleEl = document.querySelector('.checkout-post-mint-title');
  const fromCheckout = titleEl?.textContent?.replace(/\s+/g, ' ').trim();
  if (fromCheckout) return fromCheckout;

  if (pieceNumber > 0) {
    return (
      PIECE_NAMES[pieceNumber] ?? `Fragment ${String(pieceNumber).padStart(2, '0')}`
    );
  }

  return 'a fragment';
}