<a href="https://u2u.network">
    <img alt="logo" src="https://github.com/DINetworks/DI-U2U-Protocol/blob/main/IU2U-Banner.png" style="width: 100%;">
</a>

## IU2U Protocol - Complete Cross-Chain & Gasless Solution

IU2U Protocol is a revolutionary blockchain infrastructure that combines **Gasless Meta Transactions** and **IU2U Cross-Chain Protocol** into a unified system, enabling seamless interoperability and frictionless user experiences across multiple EVM-compatible blockchains.

## 🔥 What Makes IU2U Unique

IU2U Protocol delivers two breakthrough capabilities in one integrated system:

### 🚀 Gasless Meta Transactions
- **Zero Gas Fees**: Users interact with dApps without holding native tokens
- **Multi-Token Credits**: Pay gas with USDC, USDT, IU2U, or other ERC20 tokens
- **EIP-712 Signatures**: Cryptographically secure transaction authorization
- **Batch Processing**: Execute multiple operations in single transactions
- **Enterprise Security**: Comprehensive validation and replay protection

### 🌉 IU2U Cross-Chain Protocol
- **Universal Bridge**: Send IU2U tokens across 7+ major blockchain networks
- **1:1 U2U Backing**: Every IU2U token backed by locked U2U on U2U Nebulas Testnet
- **DEX Aggregation**: Access 37+ DEX protocols for optimal cross-chain swaps
- **Contract Calls**: Execute smart contracts across different chains
- **Decentralized Relayers**: Secure message passing via whitelisted validator network

## 📚 Documentation

**Complete documentation is available in GitBook format:**

### 🚀 Quick Access
- **[📖 Full Documentation](./docs/)** - Complete GitBook-style documentation
- **[⚡ Quick Start Guide](./docs/getting-started/quick-start.md)** - Get started in 5 minutes
- **[🔧 API Reference](./docs/api-reference/)** - Complete contract APIs
- **[💡 Examples](./docs/examples/)** - Integration patterns and code samples

### 📖 Build Documentation Locally

```bash
# Navigate to docs directory
cd docs

# Install dependencies
npm install

# Serve documentation locally
npm run docs:serve

# Or build static files
npm run docs:build

# Generate PDF
npm run docs:pdf
```

### 📋 Documentation Structure

```
docs/
├── getting-started/     # Installation, setup, and basic usage
├── core-concepts/       # Protocol architecture and concepts
├── metatx/             # Gasless meta-transaction system
│   ├── overview.md      # MetaTx system overview
│   ├── metatxgateway.md # Gateway contract details
│   └── gascreditvault.md # Credit vault documentation
├── cross-chain/         # IU2U bridge operations
│   ├── message-passing.md
│   ├── token-transfers.md
│   └── contract-calls.md
├── dex-aggregation/     # 37+ DEX protocol integration
├── api-reference/       # Complete API documentation
├── guides/             # Integration and deployment guides
├── examples/           # Real-world integration patterns
└── resources/          # FAQ, troubleshooting, glossary
```

## Features

### 🔥 Gasless Meta Transactions
- **Zero Friction UX**: Users interact with dApps without holding native tokens
- **Flexible Payment**: Accept stablecoins, project tokens, or any ERC20 for gas
- **Batch Operations**: Execute multiple transactions atomically
- **Signature Security**: EIP-712 typed data signing with replay protection
- **Relayer Network**: Decentralized execution with configurable fees

### 🌉 IU2U Cross-Chain Infrastructure
- **Universal Bridge**: Send IU2U tokens across 7+ major blockchain networks
- **1:1 U2U Backing**: Every IU2U token backed by locked U2U on U2U Nebulas Testnet
- **Contract Calls**: Execute smart contracts across different chains
- **Message Passing**: Send arbitrary data between chains
- **Decentralized Relayers**: Secure validation via whitelisted validator network

### 🔄 Advanced DEX Aggregation
- **37+ DEX Protocols**: Support for V2 AMM, V3 concentrated liquidity, Solidly forks, stableswap
- **Optimal Routing**: Intelligent multi-DEX routing for best execution prices
- **Cross-Chain Swaps**: A→IU2U→B token swaps across different networks
- **V3 Integration**: Uniswap V3, SushiSwap V3, PancakeSwap V3 concentrated liquidity support

## IU2U Protocol - Integrated Architecture

IU2U Protocol is a revolutionary dual-system architecture that seamlessly combines **Gasless Meta Transactions** and **IU2U Cross-Chain Protocol**:

### 🔥 Gasless Meta Transaction System
- **MetaTxGateway**: Executes signed transactions with native token validation and automatic refunds
- **GasCreditVault**: Multi-token credit system with Chainlink price feeds and UUPS upgradeability
- **EIP-712 Signatures**: Cryptographically secure transaction authorization with replay protection
- **Batch Processing**: Execute multiple operations in single transactions for optimal gas efficiency

### 🌉 IU2U Cross-Chain Protocol
- **IU2U Gateway**: Central hub for cross-chain operations with 1:1 U2U backing
- **Cross-Chain Aggregator**: DEX aggregation across 37+ protocols for optimal routing
- **Relayer Network**: Decentralized validators processing cross-chain messages
- **Message Passing**: Secure GMP (General Message Passing) between EVM-compatible chains

### 🔄 Unified User Experience
Users can now:
1. **Deposit tokens** (USDC, USDT, IU2U) to earn gas credits
2. **Execute gasless transactions** across any supported chain
3. **Perform cross-chain operations** using IU2U tokens
4. **Combine both systems** for seamless multi-chain interactions

This integrated approach eliminates traditional blockchain friction while enabling true cross-chain interoperability.

## Tech Stack

- **Solidity** (v0.8.24) - Smart contract development
- **Hardhat** (v2.22.19) - Development framework and testing
- **OpenZeppelin Contracts** (v5.2.0) - Security-audited contract libraries
- **Chainlink Oracles** - Real-time price feeds for gas credit calculation
- **Node.js** - Relayer infrastructure and event monitoring
- **Ethers.js** - Blockchain interaction and cryptography

## Development & Test on Local Environment

Clone and install npm modules

```sh
git clone https://github.com/U2U-Network/U2U-Contracts.git
cd U2U-Contracts
npm install
```

Create .env file and setup env variables

```
RPC_URL=https://rpc-nebulas-testnet.uniultra.xyz/
PRIVATE_KEY=<YOUR_WALLET_PRIVATE_KEY>
```

Run tests to verify the installation:

```sh
npx hardhat test
```

## Core Architecture

### IU2U Gateway Contract (`IU2U.sol`)

The central hub for all cross-chain operations, providing:

**Cross-Chain Communication:**
- `callContract()` - Execute contracts on remote chains
- `callContractWithToken()` - Execute contracts and transfer tokens
- `sendToken()` - Simple cross-chain token transfers

**U2U Backing System:**
- `deposit()` - Convert U2U to IU2U (1:1 ratio)
- `withdraw()` - Convert IU2U back to U2U
- Automatic backing verification for all operations

**Command Execution:**
- `execute()` - Process cross-chain commands via relayers
- Support for multiple command types (contract calls, token operations)
- Cryptographic validation and replay protection

### Relayer Infrastructure (`relayer/`)

Decentralized event monitoring and command execution system:

**Event Processing:**
- Monitors `ContractCall`, `ContractCallWithToken`, and `TokenSent` events
- Automatic payload verification and command generation
- Cross-chain message delivery with built-in retry mechanisms

**Health Monitoring:**
- RESTful health and metrics endpoints
- Real-time processing statistics
- Configurable monitoring and alerting

### Deployment Scripts (`scripts/`)

Production-ready deployment automation:
- `deploy-gmp.js` - Complete GMP protocol deployment
- `whitelist-relayer.js` - Relayer permission management
- Multi-chain deployment support with verification

### Meta Transaction System (`MetaTxGasCreditVault.sol` & `MetaTxGateway.sol`)

Gasless transaction infrastructure that enables users to execute transactions without paying gas fees:

**Gas Credit Vault:**
- `deposit()` - Deposit tokens (USDC, USDT, IU2U, etc.) to earn gas credits
- `withdraw()` - Withdraw deposited tokens and deduct corresponding credits
- Real-time token price conversion using Chainlink oracles
- Support for stablecoins with 1:1 credit conversion

**Meta Transaction Gateway:**
- `executeMetaTransaction()` - Execute user transactions with relayer paying gas
- `recoverSigner()` - Cryptographic signature verification
- Nonce-based replay protection
- Integration with gas credit system for automatic fee deduction

**Key Features:**
- **Multi-Token Support**: Accept various tokens for gas payment (USDC, USDT, IU2U)
- **Oracle Integration**: Real-time price feeds for accurate credit calculation
- **Flexible Credits**: Credits can be used across all supported operations
- **Signature Verification**: EIP-712 standard for secure meta transactions

## Quick Start Guide

### 1. Deploy IU2U Protocol

```sh
# Deploy on U2U testnet
npx hardhat run scripts/deploy-gmp.js --network u2u-nebulas-testnet

# Deploy on additional chains (Ethereum, Polygon, BSC, etc.)
npx hardhat run scripts/deploy-gmp.js --network ethereum
```

### 2. Set Up Relayer

```sh
cd relayer
npm install

# Configure relayer settings
cp config.example.json config.json
# Edit config.json with your RPC endpoints and private key

# Start relayer service
node index.js
```

### 3. Cross-Chain Usage Examples

**Simple Token Transfer:**
```solidity
// Send 100 IU2U from U2U to Ethereum
iu2u.sendToken("ethereum", recipientAddress, "IU2U", 100 * 10**18);
```

**Cross-Chain Contract Call:**
```solidity
// Call a DeFi contract on Polygon from any chain
bytes memory payload = abi.encode("swap", tokenIn, tokenOut, amount);
iu2u.callContract("polygon", dexContract, payload);
```

**Contract Call with Token Transfer:**
```solidity
// Send tokens and execute a contract in one transaction
iu2u.callContractWithToken(
    "bsc",
    stakingContract,
    abi.encode("stake", duration),
    "IU2U",
    stakeAmount
);
```

### 4. Gasless Meta Transaction Setup

**Deploy Meta Transaction Infrastructure:**
```sh
# Deploy gas credit vault and gateway
npx hardhat run scripts/deploy-meta-tx.js --network crossfi
```

**Set Up Gas Credits:**
```solidity
// Deposit USDC to get gas credits
vault.deposit(usdcToken, 100 * 10**6); // 100 USDC

// Check available credits
uint256 credits = vault.credits(userAddress);
```

## Supported DEX Protocols & Networks

### 🌐 Supported Networks
- **Ethereum Mainnet** (Chain ID: 1)
- **BNB Smart Chain** (Chain ID: 56) 
- **Polygon** (Chain ID: 137)
- **Avalanche** (Chain ID: 43114)
- **Arbitrum One** (Chain ID: 42161)
- **Optimism** (Chain ID: 10)
- **Base** (Chain ID: 8453)

### 🔄 Supported DEX Protocols (37 Total)

**AMM Protocols (Uniswap V2 Style):**
- Uniswap V2, SushiSwap V2, PancakeSwap V2
- QuickSwap, TraderJoe, SpookySwap, SpiritSwap
- ApeSwap, Biswap, MDEX, Camelot, ZyberSwap

**Concentrated Liquidity (Uniswap V3 Style):**
- Uniswap V3, SushiSwap V3, PancakeSwap V3
- Ramses, Algebra

**Solidly Fork Protocols:**
- Velodrome (Optimism), Aerodrome (Base)
- Solidly, Thena (BSC), Chronos

**Stableswap Protocols:**
- Curve Finance, Platypus (Avalanche), Wombat

**Specialized Protocols:**
- Balancer (Weighted pools), Beethoven X (Fantom/Optimism)
- GMX (Perpetuals), Maverick (Concentrated liquidity)
- 1inch, ParaSwap, 0x Protocol, Kyber Network, DODO, Bancor

### 📊 Cross-Chain Aggregation Features

**Smart Router Selection:**
- Automatic optimal DEX selection across 37+ protocols
- Real-time price comparison and slippage optimization
- Multi-hop routing for best execution prices
- Gas cost optimization in route selection

**V2 vs V3 Protocol Support:**
- Traditional AMM (constant product) pools
- Concentrated liquidity with custom fee tiers
- Dynamic fee adjustment based on volatility
- Capital efficiency optimization

## Architecture Overview

### Core Components

**CrossChainAggregator.sol** - Main aggregation contract
- Cross-chain swap execution and coordination
- Integration with Axelar Network for message passing
- Token bridging and destination chain execution

**SwapCalldataGenerator.sol** - DEX interaction layer  
- Calldata generation for 37+ DEX protocols
- Optimal router selection using MulticallLibraryV2
- Quote aggregation and price discovery

**MulticallLibraryV2.sol** - Batch operations library
- Efficient multi-DEX quote batching using Multicall3
- Router configuration and management  
- Support for all 37 router types with proper categorization

**Libraries Architecture:**
- **QuoteLibrary.sol** - Quote calculation for all DEX types
- **CalldataLibrary.sol** - Calldata generation utilities
- **MulticallLibraryV2.sol** - Batch quote operations

### Usage Examples

**Basic Cross-Chain Swap:**
```solidity
// Swap 100 USDC on Ethereum → USDT on BSC
SwapData memory swapData = SwapData({
    sourceToken: "0xA0b86a33E6441c45C74d7F7f5234f3628B8b5C22", // USDC
    sourceAmount: 100 * 10**6,
    destinationChain: "bsc", 
    destinationToken: "0x55d398326f99059fF775485246999027B3197955", // USDT
    minDestinationAmount: 99 * 10**18,
    recipient: userAddress,
    deadline: block.timestamp + 3600,
    routerCalldata: calldataGenerator.generateOptimalCalldata(...)
});

aggregator.crossChainSwap(swapData, { value: gasFee });
```

**Multi-DEX Quote Comparison:**
```solidity
// Get quotes from all active DEXes on Ethereum
(address bestRouter, uint256 bestOutput) = calldataGenerator.getOptimalRouter(
    1, // Ethereum
    tokenIn,
    tokenOut, 
    amountIn
);
```

**Execute Gasless Transactions:**
```javascript
// User signs transaction off-chain
const signature = await user.signTypedData(domain, types, message);

// Relayer executes with gas payment
await gateway.executeMetaTransaction(
    userAddress,
    functionCall,
    nonce,
    signature
);
```

## Key Features

### 🔥 Gasless Meta Transactions
- **Zero Friction UX**: Users interact with dApps without holding native tokens
- **Multi-Token Credits**: Pay gas with USDC, USDT, IU2U, or other ERC20 tokens
- **EIP-712 Signatures**: Cryptographically secure transaction authorization
- **Batch Processing**: Execute multiple operations in single transactions
- **Enterprise Security**: Comprehensive validation and replay protection

### 🌉 IU2U Cross-Chain Interoperability
- **Universal Bridge**: Send IU2U tokens across 7+ major blockchain networks
- **1:1 U2U Backing**: Every IU2U token backed by locked U2U on U2U Nebulas Testnet
- **Contract Calls**: Execute smart contracts across different chains
- **Message Passing**: Send arbitrary data between chains
- **DEX Aggregation**: Access 37+ DEX protocols for optimal cross-chain swaps

### 💰 Integrated Tokenomics
- **Dual Utility**: IU2U serves both as gas payment and cross-chain bridge token
- **1:1 Backing**: Fully collateralized on U2U Nebulas Testnet (Chain ID: 2484)
- **Deposit/Withdraw**: Seamless conversion between U2U and IU2U
- **Transparent Reserves**: On-chain verification of backing ratio

### 🔄 Decentralized Infrastructure
- **Dual Relayer Networks**: Separate networks for gasless tx and cross-chain operations
- **Event-Driven**: Automatic processing of both meta-tx and cross-chain events
- **Health Monitoring**: Built-in metrics and health check endpoints
- **Fault Tolerant**: Retry mechanisms and error handling

### 🔒 Enterprise-Grade Security
- **Multi-layered Validation**: Input validation, signature verification, and business logic checks
- **Cryptographic Proofs**: All messages cryptographically verified
- **Replay Protection**: Command IDs and nonces prevent duplicate execution
- **Access Controls**: Role-based permissions for relayers and administrators

## Testing

Run the comprehensive test suite:

```sh
# Run all tests
npx hardhat test

# Run specific GMP protocol tests  
npx hardhat test test/test-gmp.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## Documentation

- **[USAGE.md](./USAGE.md)** - Complete usage guide and API reference
- **[GMP_README.md](./GMP_README.md)** - Technical specification for GMP protocol
- **[relayer/README.md](./relayer/README.md)** - Relayer setup and configuration guide

## Deployed Contracts

### U2U Nebulas Testnet (Chain ID: 2484)
| Contract | Address | Description |
|----------|---------|-------------|
| IU2U Gateway | `0xcf60D335E3aAd5a58c924d43Ce9F65e5557c7716` | Main GMP gateway contract |
| IU2U Token | `0x2551f9E86a20bf4627332A053BEE14DA623d1007` | ERC20 IU2U token with 1:1 U2U backing |
| MetaTxGasCreditVault | `0xa4c3df3e4Fe52ab2598604F0b5fC360FccFb1944` | Gas credit management system |
| MetaTxGateway | `0x5d450252FD77D6A52513E08f7e604625AD84496f` | Gasless transaction execution |
| CrossChainAggregator | `0x...` | DEX aggregation for cross-chain swaps |

### Deployment Status
- ✅ U2U Nebulas Testnet - Active (IU2U Cross-Chain Protocol)
- ✅ U2U Nebulas Testnet - Active (Gasless Meta Transaction System)
- 🔄 Ethereum Sepolia - Pending deployment
- 🔄 Polygon Mumbai - Pending deployment
- 🔄 BSC Testnet - Pending deployment

### Testnet Configuration
```javascript
const testnetConfig = {
  chainId: 2484,
  rpcUrl: 'https://rpc-nebulas-testnet.uniultra.xyz/',
  nativeCurrency: { name: 'U2U', symbol: 'U2U', decimals: 18 },
  explorerUrl: 'https://testnet.u2uscan.xyz'
};
```

## Community & Support

- **GitHub**: [U2U-Network/U2U-Contracts](https://github.com/U2U-Network/U2U-Contracts)
- **Website**: [u2u.network](https://u2u.network)
- **Documentation**: Comprehensive guides in `/docs`
- **Issues**: Report bugs and feature requests on GitHub

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.





