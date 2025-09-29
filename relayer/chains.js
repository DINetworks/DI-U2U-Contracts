const {
  mainnet,
  bsc,
  optimism,
  base,
  polygon,
  arbitrum,
  avalanche,
} = require("viem/chains");

// U2U Solaris Mainnet
const u2uMainnet = {
  id: 39,
  name: "U2U Solaris Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "U2U",
    symbol: "U2U",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-mainnet.u2u.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "U2U Scan",
      url: "https://u2uscan.xyz",
    },
  },
  testnet: true,
};

bsc.rpcUrls.default.http = 'https://binance.llamarpc.com'


const CHAINS = {
    bsc,
    polygon,
    base,
    "u2u-solaris-mainnet": u2uMainnet
}

module.exports = CHAINS