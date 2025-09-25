# Configuration

Learn how to configure IU2U Protocol's integrated **Gasless Meta Transactions** and **IU2U Cross-Chain Protocol** systems for different environments and use cases.

## Environment Configuration

### Network Configurations

IU2U supports multiple networks with configurations for both gasless transactions and cross-chain operations:

```javascript
const networkConfigs = {
  testnet: {
    'u2u-nebulas-testnet': {
      chainId: 2484,
      rpcUrl: 'https://rpc-nebulas-testnet.uniultra.xyz/',
      nativeCurrency: { name: 'U2U', symbol: 'U2U', decimals: 18 },

      // Gasless Meta Transaction contracts
      metaTxGateway: '0x...',
      gasCreditVault: '0x...',

      // IU2U Cross-Chain contracts
      iu2uGateway: '0x...',
      iu2uToken: '0x...',
      crossChainAggregator: '0x...'
    },
    ethereum: {
      chainId: 1,
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },

      // Gasless Meta Transaction contracts
      metaTxGateway: '0x...',
      gasCreditVault: '0x...',

      // IU2U Cross-Chain contracts
      iu2uGateway: '0x...',
      iu2uToken: '0x...',
      crossChainAggregator: '0x...'
    },
    bsc: {
      chainId: 56,
      rpcUrl: 'https://bsc-dataseed1.binance.org/',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },

      // Gasless Meta Transaction contracts
      metaTxGateway: '0x...',
      gasCreditVault: '0x...',

      // IU2U Cross-Chain contracts
      iu2uGateway: '0x...',
      iu2uToken: '0x...',
      crossChainAggregator: '0x...'
    }
  }
};
```

### SDK Configuration

#### Basic Configuration

```javascript
import {
  IU2UProvider,
  GasCreditVault,
  MetaTxGateway,
  CrossChainAggregator
} from '@iu2u/sdk';

const iu2u = new IU2UProvider({
  network: 'testnet', // Use testnet for development
  provider: window.ethereum,
  signer: signer,

  // Gasless Meta Transaction settings
  gasless: {
    enabled: true,
    relayerUrl: 'https://relayer.iu2u.com',
    gasCreditVault: '0x...', // GasCreditVault contract address
    metaTxGateway: '0x...', // MetaTxGateway contract address
    supportedTokens: ['USDC', 'USDT', 'IU2U'], // Tokens for gas credits
    minimumConsume: ethers.utils.parseEther('0.05') // $0.05 minimum
  },

  // IU2U Cross-Chain settings
  crossChain: {
    enabled: true,
    iu2uGateway: '0x...', // IU2UGateway contract address
    iu2uToken: '0x...', // IU2U token address
    aggregator: '0x...', // CrossChainAggregator address
    supportedChains: ['ethereum', 'bsc', 'polygon', 'u2u-nebulas-testnet']
  },

  // Optional configurations
  defaultSlippage: 50, // 0.5%
  defaultDeadline: 1800, // 30 minutes
  gasPrice: 'fast', // 'slow', 'standard', 'fast'

  // Logging
  debug: false,
  logLevel: 'info' // 'error', 'warn', 'info', 'debug'
});

// Initialize individual components
const gasVault = new GasCreditVault({
  provider, signer,
  contractAddress: iu2u.config.gasless.gasCreditVault
});

const metaTxGateway = new MetaTxGateway({
  provider, signer,
  contractAddress: iu2u.config.gasless.metaTxGateway
});

const aggregator = new CrossChainAggregator({
  provider, signer,
  contractAddress: iu2u.config.crossChain.aggregator
});
```

#### Advanced Configuration

```javascript
const iu2u = new IU2UProvider({
  network: 'mainnet',
  provider: provider,
  signer: signer,
  
  // Custom network configurations
  customNetworks: {
    myCustomChain: {
      chainId: 12345,
      rpcUrl: 'https://my-custom-rpc.com',
      iu2uGateway: '0x...',
      aggregator: '0x...',
      supportedTokens: ['0x...', '0x...']
    }
  },
  
  // DEX routing preferences
  routing: {
    maxHops: 3,
    minLiquidity: ethers.utils.parseEther('1000'),
    maxPriceImpact: 300, // 3%
    
    // Router-specific settings
    uniswapV3: {
      fees: [500, 3000, 10000], // Preferred fee tiers
      maxTickBias: 1000
    },
    
    curve: {
      maxSlippage: 100, // 1% for stablecoins
      preferStablePools: true
    }
  },
  
  // Cross-chain settings
  crossChain: {
    confirmationBlocks: {
      ethereum: 12,
      bsc: 15,
      polygon: 20
    },
    
    bridgeFees: {
      ethereum: ethers.utils.parseEther('0.01'),
      bsc: ethers.utils.parseEther('0.005')
    },
    
    timeout: 600 // 10 minutes
  },
  
  // Gas optimization
  gas: {
    priorityFee: 'auto', // or specific value in gwei
    maxFeePerGas: 'auto',
    gasLimitMultiplier: 1.2,
    
    // Gas estimation override
    estimateGas: async (transaction) => {
      // Custom gas estimation logic
      return ethers.utils.parseUnits('100000', 'wei');
    }
  }
});
```

## Contract Configuration

### Smart Contract Settings

When deploying or interacting with IU2U contracts:

```solidity
// Deployment configuration
contract IU2UConfig {
    struct NetworkConfig {
        uint256 chainId;
        address gateway;
        address aggregator;
        address[] supportedTokens;
        uint256 minGasPrice;
        uint256 maxGasPrice;
    }
    
    mapping(uint256 => NetworkConfig) public networkConfigs;
    
    constructor() {
        // Ethereum mainnet
        networkConfigs[1] = NetworkConfig({
            chainId: 1,
            gateway: 0x...,
            aggregator: 0x...,
            supportedTokens: [0x..., 0x...],
            minGasPrice: 1 gwei,
            maxGasPrice: 100 gwei
        });
        
        // BSC mainnet
        networkConfigs[56] = NetworkConfig({
            chainId: 56,
            gateway: 0x...,
            aggregator: 0x...,
            supportedTokens: [0x..., 0x...],
            minGasPrice: 5 gwei,
            maxGasPrice: 20 gwei
        });
    }
}
```

### Router Configuration

Configure supported DEX routers:

```javascript
const routerConfigs = {
  // Uniswap V2
  0: {
    name: 'Uniswap V2',
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    fee: 30, // 0.3%
    networks: [1, 137, 42161, 10] // Ethereum, Polygon, Arbitrum, Optimism
  },
  
  // Uniswap V3
  10: {
    name: 'Uniswap V3',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    fees: [100, 500, 3000, 10000],
    networks: [1, 137, 42161, 10, 8453]
  },
  
  // Custom DEX
  37: {
    name: 'Custom DEX',
    router: '0x...',
    networks: [1],
    custom: true,
    quoteFunction: 'getAmountsOut',
    swapFunction: 'swapExactTokensForTokens'
  }
};
```

## Environment Variables

### Required Variables

```bash
# Network RPC URLs
U2U_TESTNET_RPC_URL=https://rpc-nebulas-testnet.uniultra.xyz/
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID

# Private Keys (for deployment and relaying)
DEPLOYER_PRIVATE_KEY=0x...
RELAYER_PRIVATE_KEY=0x...
USER_PRIVATE_KEY=0x...

# Gasless Meta Transaction Contracts
METATX_GATEWAY_U2U_TESTNET=0x...
METATX_GATEWAY_ETHEREUM=0x...
GAS_CREDIT_VAULT_U2U_TESTNET=0x...
GAS_CREDIT_VAULT_ETHEREUM=0x...

# IU2U Cross-Chain Contracts
IU2U_GATEWAY_U2U_TESTNET=0x...
IU2U_GATEWAY_ETHEREUM=0x...
IU2U_TOKEN_U2U_TESTNET=0x...
IU2U_TOKEN_ETHEREUM=0x...
CROSSCHAIN_AGGREGATOR_U2U_TESTNET=0x...
CROSSCHAIN_AGGREGATOR_ETHEREUM=0x...

# API Keys
U2U_TESTNET_EXPLORER_API_KEY=...
ETHERSCAN_API_KEY=ABC123...
BSCSCAN_API_KEY=DEF456...
COINGECKO_API_KEY=GHI789...

# Relayer Configuration (for both systems)
RELAYER_URL=https://relayer.iu2u.com
RELAYER_API_KEY=secret_key
RELAYER_FEE_PERCENTAGE=10
```

### Optional Variables

```bash
# Gas Configuration
DEFAULT_GAS_PRICE=20
MAX_GAS_PRICE=100
GAS_LIMIT_MULTIPLIER=1.2

# Slippage and Timing
DEFAULT_SLIPPAGE=50
DEFAULT_DEADLINE=1800
CROSS_CHAIN_TIMEOUT=600

# Logging
LOG_LEVEL=info
DEBUG_MODE=false
SENTRY_DSN=https://...

# DEX Preferences
PREFERRED_DEXES=uniswap-v3,sushiswap-v2
EXCLUDED_DEXES=deprecated-dex
MAX_PRICE_IMPACT=300

# Security
ENABLE_WHITELIST=true
SECURITY_DELAY=3600
EMERGENCY_PAUSE=false
```

## Frontend Configuration

### React Configuration

```javascript
// config/iu2u.js
export const iu2uConfig = {
  networks: {
    1: {
      name: 'Ethereum',
      currency: 'ETH',
      explorerUrl: 'https://etherscan.io',
      rpcUrl: process.env.REACT_APP_ETHEREUM_RPC
    },
    56: {
      name: 'BSC',
      currency: 'BNB',
      explorerUrl: 'https://bscscan.com',
      rpcUrl: process.env.REACT_APP_BSC_RPC
    }
  },
  
  tokens: {
    1: { // Ethereum
      USDC: '0xA0b86a33E6441e1a02c4e4670dd96EA0f25A632',
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      IU2U: '0x...'
    },
    56: { // BSC
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      IU2U: '0x...'
    }
  },
  
  settings: {
    defaultSlippage: 0.5,
    defaultDeadline: 20,
    refreshInterval: 10000,
    maxRetries: 3
  }
};

// Provider setup
import { IU2UProvider } from '@iu2u/sdk';
import { iu2uConfig } from './config/iu2u';

export const iu2uProvider = new IU2UProvider({
  ...iu2uConfig,
  provider: window.ethereum
});
```

### Vue.js Configuration

```javascript
// plugins/iu2u.js
import { IU2UProvider } from '@iu2u/sdk';

export default {
  install(app, options) {
    const iu2u = new IU2UProvider(options);
    
    app.config.globalProperties.$iu2u = iu2u;
    app.provide('iu2u', iu2u);
  }
};

// main.js
import { createApp } from 'vue';
import IU2UPlugin from './plugins/iu2u';

const app = createApp(App);

app.use(IU2UPlugin, {
  network: 'mainnet',
  provider: window.ethereum,
  debug: process.env.NODE_ENV === 'development'
});
```

## Testing Configuration

### Test Environment

```javascript
// test/config.js
export const testConfig = {
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: process.env.ETHEREUM_RPC_URL,
        blockNumber: 18000000
      }
    }
  },
  
  accounts: {
    deployer: '0x...',
    user1: '0x...',
    user2: '0x...',
    relayer: '0x...'
  },
  
  tokens: {
    usdc: '0xA0b86a33E6441e1a02c4e4670dd96EA0f25A632',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  },
  
  amounts: {
    small: ethers.utils.parseEther('1'),
    medium: ethers.utils.parseEther('100'),
    large: ethers.utils.parseEther('10000')
  }
};
```

### Hardhat Configuration

```javascript
// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');

module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETHEREUM_RPC_URL,
        enabled: process.env.FORKING === 'true'
      },
      accounts: {
        count: 20,
        accountsBalance: '10000000000000000000000'
      }
    },
    
    localhost: {
      url: 'http://127.0.0.1:8545',
      timeout: 60000
    }
  },
  
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      }
    ]
  },
  
  mocha: {
    timeout: 60000
  }
};
```

## Production Configuration

### Security Settings

```javascript
const productionConfig = {
  security: {
    enableWhitelist: true,
    requireSignatures: true,
    maxTransactionValue: ethers.utils.parseEther('1000'),
    
    // Rate limiting
    rateLimits: {
      swapPerMinute: 10,
      swapPerHour: 100,
      swapPerDay: 1000
    },
    
    // Emergency controls
    emergencyPause: false,
    securityDelay: 3600, // 1 hour
    
    // Monitoring
    alerts: {
      largeTransactions: ethers.utils.parseEther('10000'),
      suspiciousActivity: true,
      failureThreshold: 5
    }
  },
  
  // Performance optimization
  performance: {
    caching: {
      enabled: true,
      ttl: 60, // seconds
      maxSize: 1000
    },
    
    batching: {
      enabled: true,
      maxBatchSize: 10,
      batchTimeout: 1000 // ms
    }
  }
};
```

### Monitoring Configuration

```javascript
const monitoringConfig = {
  logging: {
    level: 'info',
    format: 'json',
    destinations: ['console', 'file', 'sentry']
  },
  
  metrics: {
    enabled: true,
    endpoint: '/metrics',
    interval: 30000 // 30 seconds
  },
  
  health: {
    endpoint: '/health',
    checks: [
      'database',
      'blockchain-connection',
      'relayer-status'
    ]
  },
  
  alerts: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK,
      channel: '#iu2u-alerts'
    },
    
    email: {
      smtp: process.env.SMTP_URL,
      recipients: ['admin@iu2u.com']
    }
  }
};
```

## Next Steps

With your configuration complete for both Gasless Meta Transactions and IU2U Cross-Chain Protocol:

1. **[Deploy MetaTx Contracts](../metatx/deployment.md)** - Deploy gasless transaction infrastructure
2. **[Deploy IU2U Contracts](../guides/deployment.md)** - Deploy cross-chain bridge contracts
3. **[Set Up Gas Credits](../metatx/gascreditvault.md)** - Configure token deposits for gas payments
4. **[Test Gasless Transactions](../metatx/overview.md)** - Validate meta-transaction functionality
5. **[Test Cross-Chain Bridge](../cross-chain/token-transfers.md)** - Validate IU2U transfers
6. **[Monitor Both Systems](../guides/monitoring.md)** - Set up comprehensive monitoring
7. **[Integrate in dApp](../examples/combined-integration.md)** - Build complete user flows

For troubleshooting configuration issues, see the [Troubleshooting Guide](../resources/troubleshooting.md).

## Quick Integration Checklist

### Gasless Meta Transactions Setup
- [ ] Deploy MetaTxGateway and GasCreditVault contracts
- [ ] Configure supported tokens (USDC, USDT, IU2U)
- [ ] Set up relayer infrastructure
- [ ] Test gas credit deposits and consumption
- [ ] Verify EIP-712 signature validation

### IU2U Cross-Chain Setup
- [ ] Deploy IU2U token and gateway contracts
- [ ] Configure supported chains and DEX aggregators
- [ ] Set up cross-chain relayers
- [ ] Test IU2U deposits/withdrawals
- [ ] Verify cross-chain transfers and contract calls

### Combined System Integration
- [ ] Implement gasless cross-chain operations
- [ ] Set up monitoring for both systems
- [ ] Configure emergency controls
- [ ] Test end-to-end user flows
- [ ] Deploy to production networks
