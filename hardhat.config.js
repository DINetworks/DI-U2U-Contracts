require('dotenv').config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("hardhat-contract-sizer");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
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
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  networks: {
    "u2u-nebulas-testnet": {
      chainId: 2484,
      url: process.env.RPC_TESTNET_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    "u2u-solaris-mainnet": {
      chainId: 39,
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
      timeout: 300000, // 5 minutes for mainnet
      confirmations: 3
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
    },
    base: {
      url: process.env.BASE_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
      timeout: 120000, // 2 minutes
      confirmations: 2
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
      timeout: 120000, // 2 minutes
      confirmations: 2
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
      timeout: 120000, // 2 minutes timeout
      confirmations: 2, // Wait for 2 confirmations
      gasPrice: "auto"
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
      timeout: 120000, // 2 minutes
      confirmations: 2
    },    
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
      timeout: 180000, // 3 minutes for Polygon
      confirmations: 3
    },
    bsc: {
      url: process.env.BSC_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY],
      timeout: 120000, // 2 minutes
      confirmations: 2
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "u2u-solaris-mainnet",
        chainId: 39,
        urls: {
          apiURL: "https://u2uscan.xyz/api",     // block explorer API
          browserURL: "https://u2uscan.xyz",     // explorer base URL
        },
      },
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan",
          browserURL: "https://avalanche.routescan.io"
        }
      }
    ]
  },
  // Add paths if needed
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};