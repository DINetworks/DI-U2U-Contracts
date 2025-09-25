const { keccak256, encodePacked } = require('viem');
const { MINT_TOKEN } = require('./abi/CommandTypes');

/**
 * Compensation utilities for IU2U Relayer
 * Handles compensation for failed cross-chain transactions
 */
class CompensationHandler {
    constructor(publicClients, storage) {
        this.publicClients = publicClients;
        this.storage = storage;
    }

    async queueCompensation(failedTx) {
        console.log(`💰 Queuing compensation for failed transaction: ${failedTx.commandId}`);

        if (!failedTx.sourceEvent) {
            console.log(`⚠️  No source event data for compensation: ${failedTx.commandId}`);
            return;
        }

        const { sourceChain, event } = failedTx.sourceEvent;

        try {
            // Create compensation transaction based on the original event type
            if (failedTx.sourceEvent.type === 'TokenSent' || failedTx.sourceEvent.type === 'ContractCallWithToken') {
                await this.createTokenCompensation(sourceChain, event);
            }
            // Note: ContractCall without tokens doesn't need token compensation
            // but you might want to emit a failure event or notify the user

        } catch (error) {
            console.error(`❌ Failed to create compensation:`, error.message);
        }
    }

    async createTokenCompensation(sourceChain, originalEvent) {
        console.log(`🔄 Creating token compensation on ${sourceChain}`);

        try {

            // Create a compensation mint command
            const compensationId = keccak256(encodePacked(['string'], [`compensation-${Date.now()}-${Math.random()}`]));
            const commands = [{
                commandType: MINT_TOKEN.type,
                data: this.encodeMintTokenData(
                    originalEvent.sender, // Refund to original sender
                    originalEvent.amount,
                    originalEvent.symbol
                )
            }];

            const result = await this.executeCommands(sourceChain, compensationId, commands, { type: 'Compensation', event: originalEvent });

            if (result.success) {
                console.log(`✅ Compensation transaction successful: ${result.txHash}`);
            } else {
                console.log(`❌ Compensation transaction failed: ${result.error}`);
            }

        } catch (error) {
            console.error(`❌ Failed to execute compensation:`, error.message);
        }
    }

    // Manual compensation trigger (can be called via API)
    async triggerManualCompensation(commandId) {
        const transactionKey = [...this.storage.getFailedTransactions().keys()].find(key => key.includes(commandId));

        if (!transactionKey) {
            throw new Error(`Failed transaction not found: ${commandId}`);
        }

        const failedTx = this.storage.getFailedTransaction(transactionKey);
        await this.queueCompensation(failedTx);

        return { success: true, message: 'Compensation triggered' };
    }

    encodeMintTokenData(to, amount, symbol) {
        const { encodeAbiParameters } = require('viem');
        return encodeAbiParameters(
            MINT_TOKEN.paramType,
            [to, amount, symbol]
        );
    }

    // This will be implemented in the main relayer
    async executeCommands(destinationChain, commandId, commands, sourceEvent = null) {
        throw new Error('executeCommands must be implemented in main relayer');
    }
}

module.exports = CompensationHandler;