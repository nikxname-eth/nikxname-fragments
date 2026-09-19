export const SEAPORT_1_6 = '0x0000000000000068F116a894984e2DB1123eB395' as const;
export const OPENSEA_CONDUIT = '0x1E0049783F008A0085193E00003D00cd54003c71' as const;
export const OPENSEA_CONDUIT_KEY =
  '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000' as const;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
export const WETH = {
  ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  base: '0x4200000000000000000000000000000000000006',
} as const;

export const ITEM_NATIVE = 0;
export const ITEM_ERC20 = 1;
export const ITEM_ERC721 = 2;
export const ITEM_ERC1155 = 3;
export const ORDER_FULL_OPEN = 0;

export const RPC = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  base: 'https://mainnet.base.org',
} as const;

export const CANCEL_ACK_PREFIX = 'nikxart market cancel-ack';
