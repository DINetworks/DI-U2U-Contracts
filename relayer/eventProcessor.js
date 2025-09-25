const config = require('./config.json');
const IU2UGatewayArtifacts = require('./abi/IU2UGateway.json');
const { TokenSent, ContractCall, ContractCallWithToken } = require('./events')

/**
 * Event processing utilities for IU2U Relayer
 * Handles blockchain event monitoring and processing
 */
class EventProcessor {
    constructor(publicClients, maxBlockRange = 100) {
        this.publicClients = publicClients;
        this.maxBlockRange = maxBlockRange;
    }

    async processBlocks(sourceChain, fromBlock, toBlock) {
        // console.log(`🔍 Processing blocks ${fromBlock}-${toBlock} on ${sourceChain}`);
        const client = this.publicClients[sourceChain];
        

        // Split large block ranges into smaller chunks
        const blockRanges = this.splitBlockRange(fromBlock, toBlock, BigInt(this.maxBlockRange));

        for (const range of blockRanges) {
            try {
                await this.processBlockRange(sourceChain, client, range.fromBlock, range.toBlock);
                // Add small delay between ranges to respect rate limits
                await this.sleep(1000);
            } catch (error) {
                if (this.isRateLimitError(error)) {
                    console.log(`⏳ Rate limit hit on ${sourceChain}, waiting before retry...`);
                    await this.sleep(5000); // Wait 5 seconds on rate limit
                    try {
                        await this.processBlockRange(sourceChain, client, range.fromBlock, range.toBlock);
                    } catch (retryError) {
                        console.error(`❌ Failed to process range ${range.fromBlock}-${range.toBlock} after retry:`, retryError.message);
                    }
                } else {
                    console.error(`❌ Error processing range ${range.fromBlock}-${range.toBlock} on ${sourceChain}:`, error.message);
                }
            }
        }
    }

    async processBlockRange(sourceChain, client, fromBlock, toBlock) {
        // Get ContractCall events
        const contractCallEvents = await this.queryFilterWithRetry(sourceChain, client, 'ContractCall', fromBlock, toBlock);

        // Get ContractCallWithToken events
        const contractCallWithTokenEvents = await this.queryFilterWithRetry(sourceChain, client, 'ContractCallWithToken', fromBlock, toBlock);

        // Get TokenSent events
        const tokenSentEvents = await this.queryFilterWithRetry(sourceChain, client, 'TokenSent', fromBlock, toBlock);

        // Process each event type
        for (const event of contractCallEvents) {
            await this.handleContractCall(sourceChain, event);
        }

        for (const event of contractCallWithTokenEvents) {
            await this.handleContractCallWithToken(sourceChain, event);
        }

        for (const event of tokenSentEvents) {
            await this.handleTokenSent(sourceChain, event);
        }
    }

    async queryFilter(sourceChain, client, eventName, fromBlock, toBlock) {
        // Load the ABI from the IU2UGateway artifact
        const IU2UGatewayAbi = IU2UGatewayArtifacts.abi;

        // Find the event in the ABI
        const eventAbi = IU2UGatewayAbi.find(item => item.type === 'event' && item.name === eventName);
        if (!eventAbi) {
            throw new Error(`Event ${eventName} not found in ABI`);
        }

        // Use viem's getLogs with the event from ABI
        const logs = await client.getLogs({
            address: config.iu2uGatewayAddress[sourceChain],
            event: eventAbi,
            fromBlock,
            toBlock,
        });

        // Convert viem logs to ethers-compatible format
        return logs.map(log => ({
            ...log,
            args: log.args, // viem already parses args
            transactionHash: log.transactionHash,
            logIndex: log.logIndex,
            blockNumber: log.blockNumber,
            getTransaction: () => client.getTransaction({ hash: log.transactionHash }),
            getTransactionReceipt: () => client.getTransactionReceipt({ hash: log.transactionHash }),
        }));
    }

    async queryFilterWithRetry(sourceChain, client, filter, fromBlock, toBlock) {
        try {
            return await this.queryFilter(sourceChain, client, filter, fromBlock, toBlock);
        } catch (error) {
            console.log(`⏳ Rate limit hit on ${sourceChain}, waiting before retry...`);
            await this.sleep(2000);
            return await this.queryFilter(sourceChain, client, filter, fromBlock, toBlock);
        }
    }

    splitBlockRange(fromBlock, toBlock, maxRange) {
        const ranges = [];
        let currentFrom = fromBlock;

        while (currentFrom <= toBlock) {
            const currentTo = currentFrom + maxRange - 1n < toBlock
                ? currentFrom + maxRange - 1n
                : toBlock;
            ranges.push({ fromBlock: currentFrom, toBlock: currentTo });
            currentFrom = currentTo + 1n;
        }

        return ranges;
    }

    isRateLimitError(error) {
        const errorMessage = error.message || '';
        return errorMessage.includes('rate limit') ||
               errorMessage.includes('Rate limit') ||
               errorMessage.includes('too many requests') ||
               errorMessage.includes('Too many requests') ||
               error.code === -32005; // Common rate limit error code
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Event handlers - these will be implemented in the main relayer
    async handleContractCall(sourceChain, event) {
        throw new Error('handleContractCall must be implemented in main relayer');
    }

    async handleContractCallWithToken(sourceChain, event) {
        throw new Error('handleContractCallWithToken must be implemented in main relayer');
    }

    async handleTokenSent(sourceChain, event) {
        throw new Error('handleTokenSent must be implemented in main relayer');
    }
}

module.exports = EventProcessor;
