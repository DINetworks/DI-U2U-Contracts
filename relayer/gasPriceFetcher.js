const https = require('https');
const { parseGwei } = require('viem');

/**
 * Gas price fetching utilities for IU2U Relayer
 * Fetches gas prices from third-party APIs for optimal transaction pricing
 */
class GasPriceFetcher {
    constructor(config) {
        this.config = config;
    }

    async fetchGasPriceFromAPI(chainName) {
        const chainConfig = this.config.chains[chainName];
        const chainId = chainConfig.chainId;

        // Try multiple APIs based on chain
        const apis = this.getGasPriceAPIs(chainId);

        for (const api of apis) {
            try {
                const gasPrice = await this.queryGasPriceAPI(api);
                if (gasPrice && gasPrice > 0) {
                    console.log(`   📊 Fetched gas price from ${api.name}: ${this.formatGwei(gasPrice)} gwei`);
                    return gasPrice;
                }
            } catch (error) {
                console.log(`   ⚠️ Failed to fetch from ${api.name}: ${error.message}`);
            }
        }

        return null; // All APIs failed
    }

    getGasPriceAPIs(chainId) {
        const apis = [];

        switch (chainId) {
            case 1: // Ethereum Mainnet
                apis.push(
                    { name: 'Etherscan', url: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=' },
                    { name: 'EthGasStation', url: 'https://ethgasstation.info/api/ethgasAPI.json' },
                    { name: 'Blocknative', url: 'https://api.blocknative.com/gasprices/blockprices' }
                );
                break;
            case 56: // BSC Mainnet
                apis.push(
                    { name: 'BscScan', url: 'https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=' },
                    { name: 'Moralis BSC', url: 'https://deep-index.moralis.io/api/v2.2/gas-tracker?chain=bsc' }
                );
                break;
            case 137: // Polygon
                apis.push(
                    { name: 'PolygonScan', url: 'https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=' },
                    { name: 'Moralis Polygon', url: 'https://deep-index.moralis.io/api/v2.2/gas-tracker?chain=polygon' }
                );
                break;
            case 43114: // Avalanche
                apis.push(
                    { name: 'SnowTrace', url: 'https://api.snowtrace.io/api?module=gastracker&action=gasoracle&apikey=' }
                );
                break;
            case 2484: // U2U Testnet
                apis.push(
                    { name: 'U2U Explorer', url: 'https://testnet.u2uscan.xyz/api/v1/gas-price' }
                );
                break;
            default:
                // Generic fallback
                apis.push(
                    { name: 'EthGasStation', url: 'https://ethgasstation.info/api/ethgasAPI.json' }
                );
        }

        return apis;
    }

    async queryGasPriceAPI(api) {
        return new Promise((resolve, reject) => {
            const url = new URL(api.url);

            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'IU2U-Relayer/1.0'
                }
            };

            // Add API key if available in config
            if (this.config.apiKeys && this.config.apiKeys[api.name.toLowerCase()]) {
                if (url.search.includes('apikey=')) {
                    // Replace placeholder
                    options.path = options.path.replace('apikey=', `apikey=${this.config.apiKeys[api.name.toLowerCase()]}`);
                }
            }

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);

                        // Parse gas price based on API format
                        let gasPrice = null;

                        if (api.name === 'Etherscan' || api.name === 'BscScan' || api.name === 'PolygonScan' || api.name === 'SnowTrace') {
                            if (jsonData.result && jsonData.result.ProposeGasPrice) {
                                gasPrice = parseGwei(jsonData.result.ProposeGasPrice);
                            }
                        } else if (api.name === 'EthGasStation') {
                            if (jsonData.average) {
                                // EthGasStation returns values in 10x gwei
                                gasPrice = parseGwei((jsonData.average / 10).toString());
                            }
                        } else if (api.name === 'Blocknative') {
                            if (jsonData.blockPrices && jsonData.blockPrices[0]) {
                                const baseFee = jsonData.blockPrices[0].baseFeePerGas;
                                gasPrice = parseGwei(baseFee.toString());
                            }
                        } else if (api.name.includes('Moralis')) {
                            if (jsonData.gasPrice) {
                                gasPrice = BigInt(jsonData.gasPrice);
                            }
                        }

                        resolve(gasPrice);
                    } catch (error) {
                        reject(new Error(`Failed to parse API response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('API request timeout'));
            });

            req.end();
        });
    }

    formatGwei(gasPrice) {
        // Convert BigInt to gwei string for display
        return (Number(gasPrice) / 1e9).toFixed(2);
    }
}

module.exports = GasPriceFetcher;