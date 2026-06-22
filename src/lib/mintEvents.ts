export type MintCompleteDetail = {
  pieceNumber?: number;
  address?: `0x${string}`;
};

/** Fired when Manifold checkout reports a successful mint. */
export const MINT_COMPLETE_EVENT = 'nikxart:mint-complete';

export function dispatchMintComplete(detail: MintCompleteDetail = {}): void {
  window.dispatchEvent(new CustomEvent<MintCompleteDetail>(MINT_COMPLETE_EVENT, { detail }));
}