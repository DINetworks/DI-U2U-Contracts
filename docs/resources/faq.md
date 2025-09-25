# Frequently Asked Questions

## General Questions

### What is IU2U Protocol?

IU2U is a cross-chain infrastructure protocol that enables seamless token transfers, DEX aggregation, and gasless transactions across multiple blockchain networks. It uses a 1:1 XFI-backed token system and supports 37+ DEX protocols across 7 chains.

### How does IU2U differ from other cross-chain protocols?

**Key Differentiators:**
- ✅ **DEX Aggregation**: Built-in support for 37+ DEX protocols
- ✅ **Gasless Transactions**: IU2U-based gas credit system
- ✅ **1:1 Backing**: Fully collateralized by native XFI tokens
- ✅ **Unified Interface**: Single SDK for all supported chains
- ✅ **MEV Protection**: Advanced routing algorithms

### Which networks does IU2U support?

**Currently Supported:**
- Ethereum (Chain ID: 1)
- BSC (Chain ID: 56)
- Polygon (Chain ID: 137)
- Avalanche (Chain ID: 43114)
- Arbitrum (Chain ID: 42161)
- Optimism (Chain ID: 10)
- Base (Chain ID: 8453)

**Coming Soon:**
- Solana
- Cosmos ecosystem
- Additional EVM chains

### Is IU2U safe to use?

**Security Measures:**
- ✅ Multiple security audits
- ✅ Formal verification for critical functions
- ✅ Bug bounty program
- ✅ Gradual deployment strategy
- ✅ Emergency pause mechanisms
- ✅ Decentralized relayer network

---

## Technical Questions

### How does the 1:1 XFI backing work?

IU2U tokens are minted when users deposit native XFI on the CrossFi chain and burned when they withdraw. This ensures:

- **Full Collateralization**: Every IU2U token is backed by 1 XFI
- **Transparency**: All reserves are verifiable on-chain
- **Stability**: No inflation or arbitrary token creation
- **Redemption**: Always redeemable for underlying XFI

```mermaid
flowchart LR
    A[User deposits 100 XFI] --> B[Contract mints 100 IU2U]
    B --> C[User bridges IU2U to other chains]
    C --> D[User returns 100 IU2U]
    D --> E[Contract burns 100 IU2U]
    E --> F[User withdraws 100 XFI]
```

### What DEX protocols are supported?

**V2 AMM Protocols (Traditional):**
- Uniswap V2, SushiSwap V2, PancakeSwap V2, QuickSwap, TraderJoe V1

**V3 Concentrated Liquidity:**
- Uniswap V3, SushiSwap V3, PancakeSwap V3, Algebra

**Solidly Forks (ve(3,3)):**
- Velodrome (Optimism), Aerodrome (Base), Thena (BSC), Ramses (Arbitrum)

**Stableswap Protocols:**
- Curve Finance, Ellipsis Finance, Belt Finance

**Specialized DEXes:**
- Balancer V2, 1inch, DODO, WooFi, Platypus

*See [Supported DEXes](../dex-aggregation/supported-dexes.md) for complete list.*

### How does cross-chain routing work?

Cross-chain swaps follow this pattern:

1. **Source Chain**: Token A → IU2U (using best DEX)
2. **Bridge**: IU2U transferred via relayer network
3. **Destination Chain**: IU2U → Token B (using best DEX)

{% mermaid %}
sequenceDiagram
    participant User
    participant Aggregator_A as Source Chain
    participant Relayer
    participant Aggregator_B as Destination Chain
    
    User->>Aggregator_A: Swap USDC → BNB (cross-chain)
    Aggregator_A->>Aggregator_A: USDC → IU2U (Uniswap)
    Aggregator_A->>Relayer: Bridge IU2U
    Relayer->>Aggregator_B: Deliver IU2U
    Aggregator_B->>Aggregator_B: IU2U → BNB (PancakeSwap)
    Aggregator_B->>User: Deliver BNB
{% endmermaid %}

### How are gas fees handled?

**Regular Transactions:**
- Users pay gas in native tokens (ETH, BNB, MATIC, etc.)
- Gas optimization through batch operations

**Gasless Transactions:**
- Users pre-deposit IU2U tokens as gas credits
- Relayers pay gas and deduct from credits
- Dynamic pricing based on network conditions

### What about MEV protection?

**Protection Mechanisms:**
- Private mempool submission through relayers
- Sandwich attack detection and prevention
- Price impact monitoring and circuit breakers
- Optimal routing to minimize extractable value

---

## Usage Questions

### How do I get started with IU2U?

1. **Install the SDK**: `npm install @iu2u/sdk`
2. **Initialize Provider**: Connect to your Web3 wallet
3. **Configure Networks**: Set up supported chains
4. **Start Trading**: Use aggregated swaps

See our [Quick Start Guide](../getting-started/quick-start.md) for detailed steps.

### How do I perform a token swap?

**Basic Swap (Same Chain):**
```javascript
const quote = await aggregator.getOptimalQuote(tokenIn, tokenOut, amountIn);
const tx = await aggregator.executeSwap({
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut: quote.bestAmount * 0.995, // 0.5% slippage
  routerType: quote.bestRouter
});
```

**Cross-Chain Swap:**
```javascript
const tx = await iu2u.crossChainSwap({
  sourceChain: 'ethereum',
  destinationChain: 'bsc',
  tokenIn: USDC_ADDRESS,
  tokenOut: BNB_ADDRESS,
  amountIn: ethers.utils.parseUnits('100', 6),
  slippage: 50 // 0.5%
});
```

### How do I enable gasless transactions?

1. **Deposit Gas Credits:**
```javascript
await iu2u.depositGasCredits(ethers.utils.parseEther('10')); // 10 IU2U
```

2. **Check Balance:**
```javascript
const balance = await iu2u.getGasCredits();
console.log(`Credits: $${balance.balance}`);
```

3. **Execute Gasless Transaction:**
```javascript
await iu2u.executeGaslessTransaction({
  to: contractAddress,
  data: encodedFunctionCall,
  value: '0'
});
```

### How long do cross-chain operations take?

**Typical Times:**
- **Ethereum ↔ BSC**: 2-3 minutes
- **Ethereum ↔ Polygon**: 3-5 minutes
- **BSC ↔ Polygon**: 2-4 minutes
- **L2 networks**: 1-2 minutes

**Factors Affecting Speed:**
- Network congestion
- Number of block confirmations required
- Relayer response time
- Destination chain gas prices

### What are the fees?

**Cross-Chain Operations:**
- Bridge fee: 0.1% of transferred amount
- Relayer fee: Dynamic based on gas costs
- Protocol fee: 0.05% to treasury

**DEX Aggregation:**
- Routing fee: 0.05% on optimal path
- Gas savings typically offset fees
- No fee for quote comparisons

**Meta-Transactions:**
- Gas cost + 10% relayer premium
- Paid in IU2U tokens
- Dynamic pricing based on congestion

---

## Troubleshooting

### My transaction failed. What happened?

**Common Causes:**
1. **Slippage Exceeded**: Price moved unfavorably
2. **Expired Deadline**: Transaction took too long
3. **Insufficient Balance**: Not enough tokens/gas
4. **Network Congestion**: High gas prices
5. **Router Issues**: DEX protocol temporarily unavailable

**Solutions:**
- Increase slippage tolerance
- Use longer deadlines
- Check token balances
- Retry during lower congestion
- Try different DEX protocols

### Why is my cross-chain swap taking so long?

**Potential Issues:**
- Network congestion on source/destination chains
- Relayer temporarily offline
- Insufficient confirmations
- High gas prices causing delays

**Check Status:**
```javascript
const status = await iu2u.getCrossChainStatus(txHash);
console.log(`Status: ${status.stage}`); // 'pending', 'bridging', 'completing', 'completed'
```

### Gasless transactions aren't working?

**Checklist:**
1. ✅ Sufficient gas credits deposited
2. ✅ Valid signature format (EIP-712)
3. ✅ Relayer service operational
4. ✅ Transaction within gas limits
5. ✅ Correct nonce usage

### I'm getting "Router call failed" errors?

**Debugging Steps:**
1. Verify token approvals
2. Check router contract addresses
3. Validate swap parameters
4. Test with smaller amounts
5. Try alternative router types

---

## Development Questions

### How do I integrate IU2U into my DApp?

**Frontend Integration:**
```javascript
import { IU2UProvider, CrossChainAggregator } from '@iu2u/sdk';

const iu2u = new IU2UProvider({
  network: 'mainnet',
  provider: window.ethereum
});
```

**Smart Contract Integration:**
```solidity
import "./IU2UExecutable.sol";

contract MyDApp is IU2UExecutable {
  constructor(address gateway) IU2UExecutable(gateway) {}
  
  function _execute(string calldata sourceChain, string calldata sourceAddress, bytes calldata payload) internal override {
    // Handle cross-chain messages
  }
}
```

### Are there testnet deployments?

**Testnet Addresses:**
- Sepolia: `0x...`
- BSC Testnet: `0x...`
- Mumbai (Polygon): `0x...`
- Fuji (Avalanche): `0x...`

*See [Configuration Guide](../getting-started/configuration.md) for complete addresses.*

### How do I run local tests?

```bash
# Clone repository
git clone https://github.com/DINetworks/IU2U-Contracts.git

# Install dependencies
npm install

# Run tests
npx hardhat test

# Run with forking
FORKING=true npx hardhat test
```

### Can I add support for new DEX protocols?

Yes! IU2U is designed to be extensible:

1. **Implement Quote Function** in QuoteLibrary
2. **Add Router Configuration** in deployment scripts
3. **Test Integration** thoroughly
4. **Submit Pull Request** with documentation

See [Contributing Guide](contributing.md) for details.

---

## Economics & Governance

### How is IU2U governed?

**Current Phase**: Foundation governance with community input
**Future Phase**: Token-based DAO governance

**Governance Scope:**
- Protocol parameter updates
- New chain integrations
- Emergency responses
- Treasury management

### What's the business model?

**Revenue Sources:**
- Cross-chain bridge fees (0.1%)
- DEX aggregation fees (0.05%)
- Meta-transaction premiums (10%)
- Protocol-owned liquidity returns

**Value Accrual:**
- Fee sharing with token holders (future)
- Treasury diversification
- Ecosystem development funding

### Is there a token distribution/airdrop?

IU2U tokens are only created through XFI deposits - there is no pre-mining, ICO, or traditional token distribution. Tokens are earned by:

- Providing liquidity to XFI/IU2U pools
- Participating in governance (future)
- Using the protocol (potential rewards)
- Contributing to development

---

## Getting Help

### Where can I get support?

**Community:**
- 💬 [Discord](https://discord.gg/iu2u) - Real-time chat
- 🐦 [Twitter](https://twitter.com/IU2UProtocol) - Updates and announcements
- 📖 [Documentation](/) - Comprehensive guides

**Technical:**
- 🐛 [GitHub Issues](https://github.com/DINetworks/IU2U-Contracts/issues) - Bug reports
- 📧 [Email Support](mailto:support@iu2u.com) - Direct assistance
- 💻 [Developer Portal](https://developers.iu2u.com) - Technical resources

### How do I report bugs or suggest features?

1. **Check Existing Issues** on GitHub
2. **Use Templates** for bug reports or feature requests
3. **Provide Details**: Network, transaction hashes, error messages
4. **Include Screenshots** if relevant

### Can I contribute to the project?

Absolutely! We welcome contributions:

- **Code**: Smart contracts, SDK improvements, bug fixes
- **Documentation**: Guides, examples, translations
- **Testing**: QA, security reviews, integration testing
- **Community**: Support, content creation, evangelism

See [Contributing Guide](contributing.md) for how to get started.

---

*Don't see your question? Join our [Discord](https://discord.gg/iu2u) or [create an issue](https://github.com/DINetworks/IU2U-Contracts/issues) on GitHub!*
