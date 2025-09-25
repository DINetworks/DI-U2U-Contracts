# IU2U GMP Protocol - Frontend Integration Guide

## Overview

IU2U (Interoperable U2U) is a cross-chain protocol that enables seamless token transfers and contract calls across multiple EVM-compatible blockchains. The protocol uses a decentralized relayer network to facilitate secure cross-chain communication.

## Architecture

### Core Contracts

- **IU2U Token**: ERC20 token backed 1:1 by native U2U tokens
- **IU2U Gateway**: Handles cross-chain operations and message passing

### Key Features

- **Cross-Chain Token Transfers**: Send IU2U tokens between supported chains
- **Cross-Chain Contract Calls**: Execute smart contracts on remote chains
- **Decentralized Relayers**: Secure message passing via whitelisted relayers
- **1:1 Token Backing**: Every IU2U is backed by locked U2U on the native chain

## Contract Addresses

### U2U Nebulas Testnet (Chain ID: 2484)

| Contract | Address |
|----------|---------|
| IU2U Token | `0x2551f9E86a20bf4627332A053BEE14DA623d1007` |
| IU2U Gateway | `0x7Ccba78c7224577DDDEa5B3302b81db7915e5377` |

### Polygon Mainnet (Chain ID: 1)

| Contract | Address |
|----------|---------|
| IU2U Token | `0x9649a304bD0cd3c4dbe72116199990df06d87329` |
| IU2U Gateway | `0xe5DE1F17974B1758703C4bF9a8885F7e24983bb7` |

### BSC Mainnet (Chain ID: 56)

| Contract | Address |
|----------|---------|
| IU2U Token | `0x365235b4ea2F5439f27b10f746C52B0B47c33761` |
| IU2U Gateway | `0xe4A31447871c39eD854279acCEAeB023e79dDCC5` |

### Base Mainnet (Chain ID: 56)

| Contract | Address |
|----------|---------|
| IU2U Token | `0xF69C5FB9359a4641469cd457412C7086fd32041D` |
| IU2U Gateway | `0x9649a304bD0cd3c4dbe72116199990df06d87329` |

*Note: Update addresses after deployment*

## Frontend Integration

### Installation

```bash
npm install ethers
```

### Setup

```javascript
import { ethers } from 'ethers';
import { IU2U_ABI, IU2U_GATEWAY_ABI } from './abi';

// Connect to wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Contract instances
const iu2uToken = new ethers.Contract(IU2U_TOKEN_ADDRESS, IU2U_ABI, signer);
const iu2uGateway = new ethers.Contract(IU2U_GATEWAY_ADDRESS, IU2U_GATEWAY_ABI, signer);
```

## User Functions

### IU2U Token Functions

#### Deposit U2U for IU2U

Convert native U2U to IU2U tokens (only on U2U chain).

```javascript
// Deposit 1 U2U to get 1 IU2U
const tx = await iu2uToken.deposit({ value: ethers.parseEther("1.0") });
await tx.wait();

console.log("IU2U balance:", await iu2uToken.balanceOf(userAddress));
```

#### Withdraw IU2U for U2U

Convert IU2U back to native U2U (only on U2U chain).

```javascript
// Withdraw 1 IU2U to get 1 U2U
const tx = await iu2uToken.withdraw(ethers.parseEther("1.0"));
await tx.wait();
```

#### Check Balance

```javascript
const balance = await iu2uToken.balanceOf(userAddress);
console.log("IU2U Balance:", ethers.formatEther(balance));
```

#### Transfer IU2U

```javascript
const tx = await iu2uToken.transfer(recipientAddress, ethers.parseEther("1.0"));
await tx.wait();
```

#### Approve Spending

```javascript
const tx = await iu2uToken.approve(spenderAddress, ethers.parseEther("100.0"));
await tx.wait();
```

### IU2U Gateway Functions

#### Send Tokens Cross-Chain

Send IU2U tokens to another chain.

```javascript
const tx = await iu2uGateway.sendToken(
    "bsc",                          // destination chain
    recipientAddress,               // recipient on destination
    "IU2U",                         // token symbol
    ethers.parseEther("1.0")        // amount
);
await tx.wait();
```

#### Call Contract Cross-Chain

Execute a contract on another chain.

```javascript
// Encode function call
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "uint256"],
    ["Hello from U2U!", 42]
);

const tx = await iu2uGateway.callContract(
    "bsc",                          // destination chain
    contractAddress,                // contract to call
    payload                         // encoded function data
);
await tx.wait();
```

#### Call Contract with Token Transfer

Execute a contract on another chain while sending IU2U tokens.

```javascript
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [userAddress, ethers.parseEther("1.0")]
);

const tx = await iu2uGateway.callContractWithToken(
    "bsc",                          // destination chain
    stakingContractAddress,         // contract to call
    payload,                        // encoded function data
    "IU2U",                         // token symbol
    ethers.parseEther("1.0")        // amount to send
);
await tx.wait();
```

## Events to Monitor

### IU2U Token Events

```javascript
// Listen for deposits
iu2uToken.on("Deposited", (user, amount) => {
    console.log(`${user} deposited ${ethers.formatEther(amount)} U2U`);
});

// Listen for withdrawals
iu2uToken.on("Withdrawn", (user, amount) => {
    console.log(`${user} withdrew ${ethers.formatEther(amount)} U2U`);
});
```

### IU2U Gateway Events

```javascript
// Listen for token sends
iu2uGateway.on("TokenSent", (sender, destinationChain, recipient, symbol, amount) => {
    console.log(`${sender} sent ${ethers.formatEther(amount)} ${symbol} to ${destinationChain}:${recipient}`);
});

// Listen for contract calls
iu2uGateway.on("ContractCall", (sender, destinationChain, contractAddress, payloadHash, payload) => {
    console.log(`${sender} called contract on ${destinationChain}`);
});

// Listen for contract calls with tokens
iu2uGateway.on("ContractCallWithToken", (sender, destinationChain, contractAddress, payloadHash, payload, symbol, amount) => {
    console.log(`${sender} called contract with ${ethers.formatEther(amount)} ${symbol} on ${destinationChain}`);
});
```

## Error Handling

```javascript
try {
    const tx = await iu2uGateway.sendToken("bsc", recipient, "IU2U", amount);
    await tx.wait();
    console.log("Cross-chain transfer initiated");
} catch (error) {
    if (error.code === 4001) {
        console.log("User rejected transaction");
    } else if (error.message.includes("Unsupported destination chain")) {
        console.log("Invalid destination chain");
    } else {
        console.log("Transaction failed:", error.message);
    }
}
```

## Chain Information

### Get Supported Chains

```javascript
const chainId = await iu2uGateway.getChainId("bsc");
console.log("BSC Chain ID:", chainId);

const chainName = await iu2uGateway.getChainName(56);
console.log("Chain ID 56 Name:", chainName);
```

### Check Command Status

```javascript
const isExecuted = await iu2uGateway.isCommandExecuted(commandId);
console.log("Command executed:", isExecuted);
```

## Security Considerations

1. **Always verify contract addresses** before interaction
2. **Check token balances** before transfers
3. **Handle transaction failures** gracefully
4. **Monitor events** for transaction confirmation
5. **Use appropriate gas limits** for cross-chain operations

## Testing

Test on U2U Nebulas Testnet before mainnet deployment:

```bash
npx hardhat run scripts/deploy-gmp.js --network u2u-nebulas-testnet
```

## Support

For integration questions or issues, refer to the contract ABIs and test files in the repository.