export const seaportAbi = [
  {
    type: 'function',
    name: 'getCounter',
    stateMutability: 'view',
    inputs: [{ name: 'offerer', type: 'address' }],
    outputs: [{ name: 'counter', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getOrderStatus',
    stateMutability: 'view',
    inputs: [{ name: 'orderHash', type: 'bytes32' }],
    outputs: [
      { name: 'isValidated', type: 'bool' },
      { name: 'isCancelled', type: 'bool' },
      { name: 'totalFilled', type: 'uint256' },
      { name: 'totalSize', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getOrderHash',
    stateMutability: 'view',
    inputs: [
      {
        name: 'order',
        type: 'tuple',
        components: [
          { name: 'offerer', type: 'address' },
          { name: 'zone', type: 'address' },
          {
            name: 'offer',
            type: 'tuple[]',
            components: [
              { name: 'itemType', type: 'uint8' },
              { name: 'token', type: 'address' },
              { name: 'identifierOrCriteria', type: 'uint256' },
              { name: 'startAmount', type: 'uint256' },
              { name: 'endAmount', type: 'uint256' },
            ],
          },
          {
            name: 'consideration',
            type: 'tuple[]',
            components: [
              { name: 'itemType', type: 'uint8' },
              { name: 'token', type: 'address' },
              { name: 'identifierOrCriteria', type: 'uint256' },
              { name: 'startAmount', type: 'uint256' },
              { name: 'endAmount', type: 'uint256' },
              { name: 'recipient', type: 'address' },
            ],
          },
          { name: 'orderType', type: 'uint8' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'zoneHash', type: 'bytes32' },
          { name: 'salt', type: 'uint256' },
          { name: 'conduitKey', type: 'bytes32' },
          { name: 'counter', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'orderHash', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'fulfillOrder',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'order',
        type: 'tuple',
        components: [
          {
            name: 'parameters',
            type: 'tuple',
            components: [
              { name: 'offerer', type: 'address' },
              { name: 'zone', type: 'address' },
              {
                name: 'offer',
                type: 'tuple[]',
                components: [
                  { name: 'itemType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'identifierOrCriteria', type: 'uint256' },
                  { name: 'startAmount', type: 'uint256' },
                  { name: 'endAmount', type: 'uint256' },
                ],
              },
              {
                name: 'consideration',
                type: 'tuple[]',
                components: [
                  { name: 'itemType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'identifierOrCriteria', type: 'uint256' },
                  { name: 'startAmount', type: 'uint256' },
                  { name: 'endAmount', type: 'uint256' },
                  { name: 'recipient', type: 'address' },
                ],
              },
              { name: 'orderType', type: 'uint8' },
              { name: 'startTime', type: 'uint256' },
              { name: 'endTime', type: 'uint256' },
              { name: 'zoneHash', type: 'bytes32' },
              { name: 'salt', type: 'uint256' },
              { name: 'conduitKey', type: 'bytes32' },
              { name: 'totalOriginalConsiderationItems', type: 'uint256' },
            ],
          },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: 'fulfillerConduitKey', type: 'bytes32' },
    ],
    outputs: [{ name: 'fulfilled', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'cancel',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'orders',
        type: 'tuple[]',
        components: [
          { name: 'offerer', type: 'address' },
          { name: 'zone', type: 'address' },
          {
            name: 'offer',
            type: 'tuple[]',
            components: [
              { name: 'itemType', type: 'uint8' },
              { name: 'token', type: 'address' },
              { name: 'identifierOrCriteria', type: 'uint256' },
              { name: 'startAmount', type: 'uint256' },
              { name: 'endAmount', type: 'uint256' },
            ],
          },
          {
            name: 'consideration',
            type: 'tuple[]',
            components: [
              { name: 'itemType', type: 'uint8' },
              { name: 'token', type: 'address' },
              { name: 'identifierOrCriteria', type: 'uint256' },
              { name: 'startAmount', type: 'uint256' },
              { name: 'endAmount', type: 'uint256' },
              { name: 'recipient', type: 'address' },
            ],
          },
          { name: 'orderType', type: 'uint8' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'zoneHash', type: 'bytes32' },
          { name: 'salt', type: 'uint256' },
          { name: 'conduitKey', type: 'bytes32' },
          { name: 'counter', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'cancelled', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'incrementCounter',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'newCounter', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'OrderFulfilled',
    inputs: [
      { name: 'orderHash', type: 'bytes32', indexed: false },
      { name: 'offerer', type: 'address', indexed: true },
      { name: 'zone', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: false },
      { name: 'offer', type: 'tuple[]', indexed: false, components: [] },
      { name: 'consideration', type: 'tuple[]', indexed: false, components: [] },
    ],
  },
  {
    type: 'event',
    name: 'OrderCancelled',
    inputs: [
      { name: 'orderHash', type: 'bytes32', indexed: false },
      { name: 'offerer', type: 'address', indexed: true },
      { name: 'zone', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'CounterIncremented',
    inputs: [
      { name: 'newCounter', type: 'uint256', indexed: false },
      { name: 'offerer', type: 'address', indexed: true },
    ],
  },
] as const;

export const erc721Abi = [
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
  },
] as const;

export const erc1155Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
  },
] as const;

export const wethAbi = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;
