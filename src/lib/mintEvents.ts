/** Fired when Manifold checkout reports a successful mint. */
export const MINT_COMPLETE_EVENT = 'nikxart:mint-complete';

export function dispatchMintComplete(): void {
  window.dispatchEvent(new Event(MINT_COMPLETE_EVENT));
}