/** Pure auction math for Voices Of Time. Safe to import from Pages Functions. */

export function minNextWei(currentWei: bigint, reserveWei: bigint, bps = 500): bigint {
  if (currentWei <= 0n) return reserveWei;
  let step = (currentWei * BigInt(bps)) / 10000n;
  if (step === 0n) step = 1n;
  return currentWei + step;
}

export function formatEth(wei: bigint): string {
  if (wei <= 0n) return '0';
  const base = 10n ** 18n;
  const whole = wei / base;
  const frac = (wei % base).toString().padStart(18, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function parseEth(input: string): bigint | null {
  const text = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(text)) return null;
  const [whole, frac = ''] = text.split('.');
  try {
    return BigInt(whole) * 10n ** 18n + BigInt(frac.padEnd(18, '0'));
  } catch {
    return null;
  }
}

export function hexToWei(hex: string | null | undefined): bigint {
  if (!hex || hex === '0x' || hex === '0x00') return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}
