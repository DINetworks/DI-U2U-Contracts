const TokenSent = {
    name: 'TokenSent',
    inputs: [
        { indexed: true, name: 'sender', type: 'address' },
        { indexed: false, name: 'destinationChain', type: 'string' },
        { indexed: false, name: 'destinationAddress', type: 'address' },
        { indexed: false, name: 'symbol', type: 'string' },
        { indexed: false, name: 'amount', type: 'uint256' }
    ]
}

const ContractCall = {
    name: 'ContractCall',
    inputs: [
        { indexed: true, name: 'sender', type: 'address' },
        { indexed: false, name: 'destinationChain', type: 'string' },
        { indexed: false, name: 'destinationContractAddress', type: 'string' },
        { indexed: true, name: 'payloadHash', type: 'bytes32' },
        { indexed: false, name: 'payload', type: 'bytes' }
    ]
}

const ContractCallWithToken = {
    name: 'ContractCallWithToken',
    inputs: [
        { indexed: true, name: 'sender', type: 'address' },
        { indexed: false, name: 'destinationChain', type: 'string' },
        { indexed: false, name: 'destinationContractAddress', type: 'string' },
        { indexed: true, name: 'payloadHash', type: 'bytes32' },
        { indexed: false, name: 'symbol', type: 'string' },
        { indexed: false, name: 'amount', type: 'uint256' },
        { indexed: false, name: 'payload', type: 'bytes' }
    ]
}
    

module.exports = {
    TokenSent,
    ContractCall,
    ContractCallWithToken
}