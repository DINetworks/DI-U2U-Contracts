const CHAINS = require('./chains');
const config = require('./config.json');
const { formatEther } = require('viem');

/**
 * Health monitoring utilities for IU2U Relayer
 * Provides system health checks and monitoring
 */
class HealthMonitor {
    constructor(publicClients, relayerAddress, storage) {
        this.publicClients = publicClients;
        this.relayerAddress = relayerAddress;
        this.storage = storage;
    }

    async getHealth() {
        const health = {
            status: 'healthy',
            chains: {},
            processedEvents: this.storage.getProcessedEvents().size,
            failedTransactions: this.storage.getFailedTransactions().size,
            relayerAddress: this.relayerAddress
        };

        // Check if there are critical failures
        const criticalFailures = [...this.storage.getFailedTransactions().values()].filter(
            tx => tx.retryCount >= tx.maxRetries
        );

        if (criticalFailures.length > 0) {
            health.status = 'degraded';
            health.criticalFailures = criticalFailures.length;
        }

        for (const chainName of Object.keys(CHAINS)) {
            try {
                const client = this.publicClients[chainName];
                const blockNumber = await client.getBlockNumber();
                const balance = await client.getBalance({ address: this.relayerAddress });

                health.chains[chainName] = {
                    status: 'connected',
                    blockNumber: blockNumber.toString(),
                    balance: formatEther(balance),
                    iu2uAddress: config.iu2uGatewayAddress[chainName]
                };
            } catch (error) {
                health.chains[chainName] = {
                    status: 'error',
                    error: error.message
                };
                health.status = 'degraded';
            }
        }

        return health;
    }
}

module.exports = HealthMonitor;