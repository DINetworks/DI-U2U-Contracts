const {
  mainnet,
  bsc,
  optimism,
  base,
  polygon,
  arbitrum,
  avalanche,
} = require("viem/chains");

// U2U Nebulas Testnet
const u2uTestnet = {
  id: 2484,
  name: "U2U Nebulas Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "U2U",
    symbol: "U2U",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-nebulas-testnet.uniultra.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "U2U Scan",
      url: "https://testnet.u2uscan.xyz",
    },
  },
  testnet: true,
};

bsc.rpcUrls.default.http = 'https://binance.llamarpc.com'


const CHAINS = {
    bsc,
    polygon,
    base,
    "u2u-nebulas-testnet": u2uTestnet
}

module.exports = CHAINS