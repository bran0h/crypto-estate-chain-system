export default [
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'contractAddress',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'price',
                type: 'uint256',
            },
        ],
        name: 'OfferCreated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'OfferRemoved',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'buyer',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'price',
                type: 'uint256',
            },
        ],
        name: 'OfferSold',
        type: 'event',
    },
    {
        inputs: [
            { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
        ],
        name: 'buyOffer',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
            {
                internalType: 'address',
                name: '_contractAddress',
                type: 'address',
            },
            { internalType: 'uint256', name: '_price', type: 'uint256' },
        ],
        name: 'createOffer',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'offers',
        outputs: [
            {
                internalType: 'address',
                name: 'contractAddress',
                type: 'address',
            },
            { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
            { internalType: 'uint256', name: 'price', type: 'uint256' },
            { internalType: 'bool', name: 'active', type: 'bool' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
        ],
        name: 'removeOffer',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const

export const REAL_ESTATE_MARKET_ADDRESS =
    '0x94A0E7a951D2F503763ff59F94aE61e3Ad5D561B'
