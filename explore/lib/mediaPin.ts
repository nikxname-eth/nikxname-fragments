/**
 * Studio pin list: Arweave is the chain master; R2 is the hot backup
 * if a gateway is slow. Grow this list as new works mint.
 * Refresh-all in the catalogue asks Alchemy/OpenSea to recrawl;
 * R2 copies are written with wrangler when a new master lands.
 */
export const MEDIA_PINS = [
  {
    seriesId: 'life-impressions',
    tokenId: 56,
    letters: 'A–E',
    arweave:
      'https://3hrhxzqo3kafkdnfdo4ebfm7a4qhif3c6knm4t4ogk7ycvu5e2va.arweave.net/2eJ75g7agFUNpRu4QJWfByB0F2Lyms5PjjK_gVadJqo',
    r2: 'https://assets.nikxart.xyz/explore/media/life-impressions/56.jpg',
  },
  {
    seriesId: 'a-familiar-burn',
    tokenId: 808,
    label: 'Will It.. Panel 3',
    r2: 'https://assets.nikxart.xyz/would-it/canvas-c-full.jpg',
  },
] as const;
