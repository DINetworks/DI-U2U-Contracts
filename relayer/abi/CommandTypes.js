const APPROVE_CONTRACT_CALL = {
    type: 0,
    paramType: [
        { type: 'string' }, 
        { type: 'string' }, 
        { type: 'address' }, 
        { type: 'bytes32' }, 
        { type: 'bytes32' }, 
        { type: 'uint256' }, 
        { type: 'bytes' }
    ]
}

const APPROVE_CONTRACT_CALL_WITH_MINT = {
    type: 1,
    paramType: [
        { type: 'string' }, 
        { type: 'string' }, 
        { type: 'address' }, 
        { type: 'bytes32' }, 
        { type: 'string' }, 
        { type: 'uint256' }, 
        { type: 'bytes32' }, 
        { type: 'uint256' }, 
        { type: 'bytes' }
    ]
}

const MINT_TOKEN = {
    type: 4,
    paramType:      [
        { type: 'address'}, 
        { type: 'uint256'}, 
        { type: 'string'}
    ]
}

const SIGN_HASH = [
  { type: "bytes32", name: "commandId" },
  {
    type: "tuple[]",
    name: "commands",
    components: [
      { type: "uint256", name: "commandType" }, // adjust to uint256 if that's your contract
      { type: "bytes", name: "data" }
    ]
  }
];

module.exports = {
    APPROVE_CONTRACT_CALL,
    APPROVE_CONTRACT_CALL_WITH_MINT,
    MINT_TOKEN,
    SIGN_HASH
}