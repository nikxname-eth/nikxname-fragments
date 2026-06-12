const peakKey = (address: string) => `nikxart-holder-peak-${address.toLowerCase()}`;

/** Highest fragment level this wallet has minted / held (persists across reloads). */
export function readHolderPeak(address: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = sessionStorage.getItem(peakKey(address));
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function writeHolderPeak(address: string, pieceNumber: number): void {
  if (typeof window === 'undefined' || pieceNumber <= 0) return;
  try {
    const current = readHolderPeak(address);
    if (pieceNumber > current) {
      sessionStorage.setItem(peakKey(address), String(pieceNumber));
    }
  } catch {
    /* private mode */
  }
}