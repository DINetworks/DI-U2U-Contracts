const config = require('./config.json');
const IU2UGatewayArtifacts = require('./abi/IU2UGateway.json');
const { formatEther, parseEther } = require('viem');

/**
 * Diagnostics utilities for IU2U Relayer
 * Provides transaction error analysis and debugging
 */
class Diagnostics {
    constructor(publicClients, relayerAddress) {
        this.publicClients = publicClients;
        this.relayerAddress = relayerAddress;
    }

    async diagnoseTransactionError(chainName, error) {
        const diagnostics = {
            chain: chainName,
            errorCode: error.code,
            errorMessage: error.message,
            timestamp: new Date().toISOString()
        };

        try {
            const client = this.publicClients[chainName];

            // Check account balance
            const balance = await client.getBalance({ address: this.relayerAddress });

            // Check nonce
            const currentNonce = await client.getTransactionCount({ address: this.relayerAddress, blockTag: 'pending' });
            const latestNonce = await client.getTransactionCount({ address: this.relayerAddress, blockTag: 'latest' });

            diagnostics.balance = formatEther(balance);
            diagnostics.hasFunds = balance > parseEther("0.01"); // At least 0.01 ETH/BNB
            diagnostics.currentNonce = currentNonce;
            diagnostics.latestNonce = latestNonce;
            diagnostics.pendingTxs = currentNonce - latestNonce;
            diagnostics.nonceIssue = currentNonce !== latestNonce;

            // Check gas price
            const feeData = await client.getFeeData();
            diagnostics.gasPrice = {
                maxFeePerGas: feeData.maxFeePerGas ? formatEther(feeData.maxFeePerGas) : null,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? formatEther(feeData.maxPriorityFeePerGas) : null,
                gasPrice: feeData.gasPrice ? formatEther(feeData.gasPrice) : null
            };

            // Note: Whitelisted check removed - requires walletClients access
            diagnostics.isWhitelisted = null;

            // Analyze error message for common issues
            diagnostics.possibleCauses = this.analyzeErrorMessage(error.message);

        } catch (diagError) {
            diagnostics.diagnosticError = diagError.message;
        }

        return diagnostics;
    }

    analyzeErrorMessage(message) {
        const causes = [];

        if (message.includes('insufficient funds')) {
            causes.push('INSUFFICIENT_FUNDS');
        }
        if (message.includes('nonce too low') || message.includes('replacement transaction underpriced') || message.includes('nonce')) {
            causes.push('NONCE_ISSUE');
        }
        if (message.includes('gas required exceeds allowance') || message.includes('out of gas')) {
            causes.push('GAS_LIMIT_TOO_LOW');
        }
        if (message.includes('transaction underpriced')) {
            causes.push('GAS_PRICE_TOO_LOW');
        }
        if (message.includes('execution reverted')) {
            causes.push('CONTRACT_REVERTED');
        }
        if (message.includes('rate limit') || message.includes('too many requests')) {
            causes.push('RPC_RATE_LIMIT');
        }

        return causes.length > 0 ? causes : ['UNKNOWN_ERROR'];
    }
}

module.exports = Diagnostics;