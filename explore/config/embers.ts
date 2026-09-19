/** Private Flutter Into The Embers offering — not listed in Explore nav. */

export type EmberButterfly = {
  id: string;
  name: string;
  thumb: string;
  close: string;
};

export const EMBERS: EmberButterfly[] = [
  { id: 'after-black', name: 'After Black' },
  { id: 'coal-pink', name: 'Coal Pink' },
  { id: 'cloaked-burgandy', name: 'Cloaked Burgandy' },
  { id: 'corten', name: 'Corten' },
  { id: 'oxide', name: 'Oxide' },
  { id: 'garnet', name: 'Garnet' },
  { id: 'cardinal', name: 'Cardinal' },
  { id: 'signal', name: 'Signal' },
  { id: 'vermillion', name: 'Vermillion' },
  { id: 'burnt-tangerine', name: 'Burnt Tangerine' },
  { id: 'napalm', name: 'Napalm' },
  { id: 'afterburn', name: 'Afterburn' },
  { id: 'spicy-apricot', name: 'Spicy Apricot' },
  { id: 'peach-ember', name: 'Peach Ember' },
  { id: 'rosedust', name: 'Rosedust' },
  { id: 'coral-veil', name: 'Coral Veil' },
  { id: 'watermelon', name: 'Watermelon' },
  { id: 'dusted-pink', name: 'Dusted Pink' },
  { id: 'shell', name: 'Shell' },
  { id: 'x-ray', name: 'X-ray' },
  { id: 'porcelain', name: 'Porcelain' },
].map((b) => ({
  ...b,
  thumb: `/embers/thumbs/${b.id}.webp`,
  close: `/embers/close/${b.id}.webp`,
}));

export function emberById(id: string | undefined | null): EmberButterfly | undefined {
  if (!id) return undefined;
  const key = id.trim().toLowerCase();
  return EMBERS.find((b) => b.id === key);
}
