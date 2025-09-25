const { 
	createPublicClient, 
	createWalletClient, 
	formatEther, 
	parseGwei, 
	formatGwei, 
	keccak256, 
	encodeAbiParameters, 
	decodeAbiParameters, 
	encodePacked, 
    http,
	getAddress, 
    parseUnits,
    encodeFunctionData,
    hexToBytes
} = require('viem');

const CHAINS = require('./chains');
const RelayerStorage = require('./storage');
const EventProcessor = require('./eventProcessor');
const GasPriceFetcher = require('./gasPriceFetcher');
const CompensationHandler = require('./compensation');
const Diagnostics = require('./diagnostics');
const HealthMonitor = require('./healthMonitor');

const IU2UGatewayArtifacts = require('./abi/IU2UGateway.json');
const { APPROVE_CONTRACT_CALL, APPROVE_CONTRACT_CALL_WITH_MINT, MINT_TOKEN, SIGN_HASH } = require('./abi/CommandTypes');
const { privateKeyToAccount } = require('viem/accounts');

/**
 * IU2U GMP Relayer - Core Smart Contract Interaction Layer
 * Monitors events on source chains and executes commands on destination chains
 */
class IU2URelayer {
    constructor(config) {
        this.config = config;
        this.publicClients = {};
        this.walletClients = {};
        this.account = null;
        this.isRunning = false;

        this.setupAccounts();

        // Initialize modular components
        this.storage = new RelayerStorage();
        this.storage.loadProcessedEvents();
        this.storage.loadFailedTransactions();
        this.storage.loadPendingCommands();
        this.gasPriceFetcher = new GasPriceFetcher(config);
        this.diagnostics = new Diagnostics(this.publicClients, this.account.address);
        this.healthMonitor = new HealthMonitor(this.publicClients, this.account.address, this.storage);

        // Initialize event processor and compensation handler after setup
        this.setupClients();
        
        // Initialize components that depend on providers/contracts/signers
        this.eventProcessor = new EventProcessor(this.publicClients, this.config.maxBlockRange);
        this.compensationHandler = new CompensationHandler(this.publicClients, this.storage);

        // Bind event handlers to event processor
        this.eventProcessor.handleContractCall = this.handleContractCall.bind(this);
        this.eventProcessor.handleContractCallWithToken = this.handleContractCallWithToken.bind(this);
        this.eventProcessor.handleTokenSent = this.handleTokenSent.bind(this);

        // Bind executeCommands to compensation handler
        this.compensationHandler.executeCommands = this.executeCommands.bind(this);
    }

    setupAccounts() {   
        this.account = privateKeyToAccount(this.config.relayerPrivateKey)
        console.log('🔑 Account loaded:', this.account.address);
        if (!this.account.address) {
            throw 'Invalid Account'
        }
    }

    setupClients() {
        console.log('🔌 Setting up clients...');
        for (const chainName of Object.keys(CHAINS)) {
            const chainConfig = CHAINS[chainName];

            // Handle different RPC URL formats
            let rpcUrl;
            if (chainConfig.rpcUrls?.default?.http) {
                rpcUrl = Array.isArray(chainConfig.rpcUrls.default.http)
                    ? chainConfig.rpcUrls.default.http[0]
                    : chainConfig.rpcUrls.default.http;
            } else if (typeof chainConfig.rpcUrls?.default === 'string') {
                rpcUrl = chainConfig.rpcUrls.default;
            } else {
                console.error(`❌ No valid RPC URL found for chain ${chainName}`);
                continue;
            }

            try {
                this.publicClients[chainName] = createPublicClient({
                    chain: chainConfig,
                    transport: http(rpcUrl)
                });
                this.walletClients[chainName] = createWalletClient({
                    account: this.account,
                    chain: chainConfig,
                    transport: http(rpcUrl)
                });
                console.log(`✅ Client for ${chainName}: ${rpcUrl}`);
            } catch (error) {
                console.error(`❌ Failed to create client for ${chainName}:`, error.message);
            }
        }
    }

    async start() {
        console.log('🚀 Starting IU2U Relayer...');
        this.isRunning = true;

        // Verify relayer is whitelisted on all chains
        await this.verifyRelayerStatus();

        // Start monitoring all chains
        const monitoringPromises = Object.keys(CHAINS).map(chainName => 
            this.monitorChain(chainName)
        );

        // Start periodic cleanup
        this.startPeriodicCleanup();

        // Start retry/compensation processor
        this.startRetryProcessor();

        await Promise.all(monitoringPromises);
    }

    async verifyRelayerStatus() {
        console.log('🔍 Verifying relayer status on all chains...');
        
        for (const chainName of Object.keys(CHAINS)) {
            try {
                const isWhitelisted = await this.publicClients[chainName].readContract({
                    address: this.config.iu2uGatewayAddress[chainName],
                    abi: IU2UGatewayArtifacts.abi,
                    functionName: 'isWhitelistedRelayer',
                    args: [this.walletClients[chainName].account.address]
                })
                
                if (!isWhitelisted) {
                    console.log(`❌ Relayer NOT whitelisted on ${chainName}`);
                    throw new Error(`Relayer not whitelisted on ${chainName}`);
                }
            } catch (error) {
                console.error(`❌ Failed to verify relayer status on ${chainName}:`, error.message);
                throw error;
            }
        }
    }

    async monitorChain(chainName) {
        console.log(`👀 Starting to monitor ${chainName}...`);

        const client = this.publicClients[chainName];

        // Get the latest block number
        let lastProcessedBlock = await client.getBlockNumber() - BigInt(this.config.blockConfirmation); // Start 10 blocks back for safety

        while (this.isRunning) {
            try {
                const currentBlock = await client.getBlockNumber();

                if (currentBlock > lastProcessedBlock) {
                    await this.eventProcessor.processBlocks(chainName, lastProcessedBlock + 1n, currentBlock);
                    lastProcessedBlock = currentBlock;
                }

                // Wait before next check
                await this.sleep(this.config.pollingInterval || 5000);

            } catch (error) {
                console.error(`❌ Error monitoring ${chainName}:`, error.message);
                await this.sleep(10000); // Wait longer on error
            }
        }
    }

    async handleContractCall(sourceChain, event) {
        const eventId = `${event.transactionHash}-${event.logIndex}`;

        if (this.storage.getProcessedEvents().has(eventId)) {
            return; // Already processed
        }

        console.log(`📞 Processing ContractCall from ${sourceChain}`);
        console.log(`   Sender: ${event.args.sender}`);
        console.log(`   Destination: ${event.args.destinationChain}`);
        console.log(`   Contract: ${event.args.destinationContractAddress}`);
        console.log(`   EventId: ${eventId}`)

        try {
            const destinationChain = event.args.destinationChain;

            if (!CHAINS[destinationChain]) {
                console.log(`⚠️  Destination chain ${destinationChain} not supported, skipping`);
                return;
            }

            // Create command to approve contract call
            const commandId = keccak256(encodePacked(['string'], [`${event.transactionHash}-${event.logIndex}`]));
            const commands = [{
                commandType: APPROVE_CONTRACT_CALL.type,
                data: encodeAbiParameters(
                    APPROVE_CONTRACT_CALL.paramType,
                    [
                        sourceChain,
                        event.args.sender,
                        event.args.destinationContractAddress,
                        event.args.payloadHash,
                        event.transactionHash,
                        event.logIndex,
                        event.args.payload // Include the actual payload
                    ]
                )
            }];

            // Store as pending command
            this.storage.addPendingCommand(commandId, {
                commandId,
                type: 'ContractCall',
                sourceChain,
                destinationChain,
                event: event.args,
                commands,
                timestamp: Date.now(),
                status: 'pending'
            });

            const result = await this.executeCommands(destinationChain, commandId, commands, {
                type: 'ContractCall',
                sourceChain,
                event: event.args
            });

            // Update status to executed with tx hash
            this.storage.updatePendingCommand(commandId, {
                status: 'executed',
                txHash: result?.txHash || null,
                gasUsed: result?.gasUsed || null
            });

            this.storage.addProcessedEvent(eventId);
            this.storage.saveProcessedEvents();

        } catch (error) {
            console.error(`❌ Failed to handle ContractCall:`, error.message);
            // Update status to failed
            this.storage.updatePendingCommand(commandId, { status: 'failed', error: error.message });
        }
    }

    async handleContractCallWithToken(sourceChain, event) {
        const eventId = `${event.transactionHash}-${event.logIndex}`;

        if (this.storage.getProcessedEvents().has(eventId)) {
            return; // Already processed
        }

        console.log(`💰 Processing ContractCallWithToken from ${sourceChain}`);
        console.log(`   Sender: ${event.args.sender}`);
        console.log(`   Destination: ${event.args.destinationChain}`);
        console.log(`   Contract: ${event.args.destinationContractAddress}`);
        console.log(`   Amount: ${formatEther(event.args.amount)} ${event.args.symbol}`);

        try {
            const destinationChain = event.args.destinationChain;
            
            if (!CHAINS[destinationChain]) {
                console.log(`⚠️  Destination chain ${destinationChain} not supported, skipping`);
                return;
            }

            // Create command to approve contract call with mint
            const commandId = keccak256(encodePacked(['string'], [`${event.transactionHash}-${event.logIndex}`]));
            const commands = [{
                commandType: APPROVE_CONTRACT_CALL_WITH_MINT.type, // COMMAND_APPROVE_CONTRACT_CALL_WITH_MINT
                data: encodeAbiParameters(
                    APPROVE_CONTRACT_CALL_WITH_MINT.paramType,
                    [
                        sourceChain,
                        event.args.sender,
                        event.args.destinationContractAddress,
                        event.args.payloadHash,
                        event.args.symbol,
                        event.args.amount,
                        event.transactionHash,
                        event.logIndex,
                        event.args.payload // Include the actual payload
                    ]
                )
            }];

            // Store as pending command
            this.storage.addPendingCommand(commandId, {
                commandId,
                type: 'ContractCallWithToken',
                sourceChain,
                destinationChain,
                event: event.args,
                commands,
                timestamp: Date.now(),
                status: 'pending'
            });

            const result = await this.executeCommands(destinationChain, commandId, commands, {
                type: 'ContractCallWithToken',
                sourceChain,
                event: event.args
            });

            // Update status to executed with tx hash
            this.storage.updatePendingCommand(commandId, {
                status: 'executed',
                txHash: result?.txHash || null,
                gasUsed: result?.gasUsed || null
            });

            this.storage.addProcessedEvent(eventId);
            this.storage.saveProcessedEvents();

        } catch (error) {
            console.error(`❌ Failed to handle ContractCallWithToken:`, error.message);
            // Update status to failed
            this.storage.updatePendingCommand(commandId, { status: 'failed', error: error.message });
        }
    }

    async handleTokenSent(sourceChain, event) {
        const eventId = `${event.transactionHash}-${event.logIndex}`;

        if (this.storage.getProcessedEvents().has(eventId)) {
            return; // Already processed
        }

        console.log(`💸 Processing TokenSent from ${sourceChain}`);
        console.log(`   Sender: ${event.args.sender}`);
        console.log(`   Destination: ${event.args.destinationChain}`);
        console.log(`   To: ${event.args.destinationAddress}`);
        console.log(`   Amount: ${formatEther(event.args.amount)} ${event.args.symbol}`);

        try {
            const destinationChain = event.args.destinationChain;
            
            if (!CHAINS[destinationChain]) {
                console.log(`⚠️  Destination chain ${destinationChain} not supported, skipping`);
                return;
            }

            // Create command to mint tokens
            const commandId = keccak256(encodePacked(['string'], [`${event.transactionHash}-${event.logIndex}`]));
            const commands = [{
                commandType: MINT_TOKEN.type, // COMMAND_MINT_TOKEN
                data: encodeAbiParameters(
                    MINT_TOKEN.paramType,
                    [
                        event.args.destinationAddress,
                        event.args.amount,
                        event.args.symbol
                    ]
                )
            }];

            // Store as pending command
            this.storage.addPendingCommand(commandId, {
                commandId,
                type: 'TokenSent',
                sourceChain,
                destinationChain,
                event: event.args,
                commands,
                timestamp: Date.now(),
                status: 'pending'
            });

            const result = await this.executeCommands(destinationChain, commandId, commands, {
                type: 'TokenSent',
                sourceChain,
                event: event.args
            });

            // Update status to executed with tx hash
            this.storage.updatePendingCommand(commandId, {
                status: 'executed',
                txHash: result?.txHash || null,
                gasUsed: result?.gasUsed || null
            });

            this.storage.addProcessedEvent(eventId);
            this.storage.saveProcessedEvents();

        } catch (error) {
            console.error(`❌ Failed to handle TokenSent:`, error.message);
            // Update status to failed
            this.storage.updatePendingCommand(commandId, { status: 'failed', error: error.message });
        }
    }

    async executeCommands(destinationChain, commandId, commands, sourceEvent = null) {
        console.log(`⚡ Executing commands on ${destinationChain}`);
        console.log(`   Command ID: ${commandId}`);
        console.log(`   Commands: ${commands.length}`);

        const transactionKey = `${commandId}-${destinationChain}`;

        try {
            const publicClient = this.publicClients[destinationChain];
            const walletClient = this.walletClients[destinationChain];

            const symbol = CHAINS[destinationChain].nativeCurrency?.symbol || 'ETH'

            // Pre-execution checks
            console.log(`   Contract address: ${this.config.iu2uGatewayAddress[destinationChain]}`);
            console.log(`   Signer address: ${this.account.address}`);

            const balance = await publicClient.getBalance({ address: this.account.address });
            console.log(`   Signer balance: ${formatEther(balance)} ${symbol}`);

            // Create signature - match contract's keccak256(abi.encode(commandId, commands))
            const messageHash = keccak256(
                encodeAbiParameters(
                    SIGN_HASH,
                    [commandId, commands]
                )
            );
            console.log('messageHash', messageHash)

            const signature = await walletClient.signMessage({ message: {raw: messageHash}});
            console.log('signature', signature)

            // Check if command already executed
            const isExecuted = await publicClient.readContract({
                address: this.config.iu2uGatewayAddress[destinationChain],
                abi: IU2UGatewayArtifacts.abi,
                functionName: 'isCommandExecuted',
                args: [commandId]
            });
            console.log('executed', isExecuted)

            if (isExecuted) {
                console.log(`⚠️  Command ${commandId} already executed on ${destinationChain}`);
                return { success: true, alreadyExecuted: true };
            }

            // Prepare transaction options with dynamic gas estimation
            const txOptions = {};

            // Estimate gas usage for accurate gas limit
            console.log(`   Estimating gas usage...`);
            const estimatedGas = await publicClient.estimateGas({
                account: this.account,
                to: this.config.iu2uGatewayAddress[destinationChain],
                data: encodeFunctionData({
                    abi: IU2UGatewayArtifacts.abi,
                    functionName: 'execute',
                    args: [commandId, commands, signature]
                })
            });

            const gasLimitWithBuffer = estimatedGas * 110n / 100n; // Add 10% buffer
            console.log(`   Estimated gas: ${estimatedGas}, with buffer: ${gasLimitWithBuffer}`);

            // Update txOptions with estimated gas
            txOptions.gasLimit = gasLimitWithBuffer;

            const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
            // Get optimal gas price
            if (latestBlock.baseFeePerGas) {
                // EIP-1559 chain
                const baseFee = latestBlock.baseFeePerGas;
                const maxPriorityFeePerGas = await publicClient.estimateMaxPriorityFeePerGas();
                txOptions.maxFeePerGas = baseFee * 110n / 100n + maxPriorityFeePerGas; // 10% buffer on base fee + tip
                txOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
            } else {
                // Legacy chain
                const gasPrice = await publicClient.getGasPrice();
                txOptions.gasPrice = gasPrice * 110n / 100n; // 10% buffer
            }

            console.log(`   Final tx options:`, {
                gasLimit: txOptions.gasLimit.toString(),
                maxFeePerGas: txOptions.maxFeePerGas ? formatGwei(txOptions.maxFeePerGas) : undefined,
                maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas ? formatGwei(txOptions.maxPriorityFeePerGas) : undefined,
                gasPrice: txOptions.gasPrice ? formatGwei(txOptions.gasPrice) : undefined
            });

            // Execute transaction using viem
            const hash = await walletClient.writeContract({
                address: this.config.iu2uGatewayAddress[destinationChain],
                abi: IU2UGatewayArtifacts.abi,
                functionName: 'execute',
                args: [commandId, commands, signature],
                ...txOptions
            });

            console.log(`📝 Transaction sent: ${hash}`);

            // Wait for confirmation using viem
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log(`✅ Commands executed successfully on ${destinationChain} (Gas used: ${receipt.gasUsed})`);

            // Remove from failed transactions if it was retried successfully
            if (this.storage.getFailedTransactions().has(transactionKey)) {
                this.storage.removeFailedTransaction(transactionKey);
                this.storage.saveFailedTransactions();
                console.log(`🔄 Successfully retried failed transaction: ${transactionKey}`);
            }

            return { success: true, txHash: hash, gasUsed: receipt.gasUsed };
            
        } catch (error) {
            console.error(`❌ Failed to execute commands on ${destinationChain}:`, error.message);

            // Enhanced error diagnostics
            const diagnostics = await this.diagnostics.diagnoseTransactionError(destinationChain, error);
            console.error(`🔍 Transaction diagnostics for ${destinationChain}:`);
            console.error(`   Balance: ${diagnostics.balance} ETH (${diagnostics.hasFunds ? '✅ Sufficient' : '❌ Insufficient'})`);
            console.error(`   Nonce: ${diagnostics.currentNonce} (latest: ${diagnostics.latestNonce}) ${diagnostics.nonceIssue ? '⚠️ Issue detected' : '✅ OK'}`);
            console.error(`   Whitelisted: ${diagnostics.isWhitelisted ? '✅ Yes' : '❌ No'}`);
            console.error(`   Gas Price: ${diagnostics.gasPrice.gasPrice || 'Auto'} gwei`);
            console.error(`   Possible Causes: ${diagnostics.possibleCauses.join(', ')}`);

            // Store failed transaction for retry/compensation
            const failedTx = {
                commandId,
                destinationChain,
                commands,
                sourceEvent,
                error: error.message,
                diagnostics,
                timestamp: Date.now(),
                retryCount: (this.storage.getFailedTransactions().get(transactionKey)?.retryCount || 0) + 1,
                maxRetries: this.config.maxRetries || 3
            };

            this.storage.addFailedTransaction(transactionKey, failedTx);
            this.storage.saveFailedTransactions();

            // If max retries exceeded, queue for compensation
            if (failedTx.retryCount >= failedTx.maxRetries) {
                console.log(`🚨 Max retries exceeded for ${transactionKey}, queuing compensation`);
                await this.compensationHandler.queueCompensation(failedTx);
            }

            return { success: false, error: error.message, diagnostics, retryCount: failedTx.retryCount };
        }
    }

    startPeriodicCleanup() {
        // Clean up old processed events every hour
        setInterval(() => {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            const processedEvents = this.storage.getProcessedEvents();
            // Keep events for 24 hours
            if (processedEvents.size > 10000) {
                console.log('🧹 Cleaning up old processed events...');
                // In a real implementation, you'd want to track timestamps
                // For now, just keep the most recent 5000 events
                const eventsArray = [...processedEvents];
                this.storage.setProcessedEvents(new Set(eventsArray.slice(-5000)));
                this.storage.saveProcessedEvents();
            }
        }, 60 * 60 * 1000); // Every hour
    }

    startRetryProcessor() {
        // Process failed transactions for retry every 30 seconds
        setInterval(async () => {
            await this.processFailedTransactions();
        }, 30 * 1000);
    }

    async processFailedTransactions() {
        const failedTransactions = this.storage.getFailedTransactions();
        if (failedTransactions.size === 0) return;

        console.log(`🔄 Processing ${failedTransactions.size} failed transactions...`);

        for (const [key, failedTx] of failedTransactions) {
            try {
                // Skip if max retries exceeded
                if (failedTx.retryCount >= failedTx.maxRetries) {
                    continue;
                }

                // Wait between retries (exponential backoff)
                const timeSinceLastTry = Date.now() - failedTx.timestamp;
                const retryDelay = Math.min(60000 * Math.pow(2, failedTx.retryCount), 600000); // Max 10 minutes

                if (timeSinceLastTry < retryDelay) {
                    continue; // Not time to retry yet
                }

                console.log(`🔄 Retrying failed transaction: ${key} (attempt ${failedTx.retryCount + 1})`);

                // Update timestamp before retry
                failedTx.timestamp = Date.now();

                const result = await this.executeCommands(
                    failedTx.destinationChain,
                    failedTx.commandId,
                    failedTx.commands,
                    failedTx.sourceEvent
                );

                if (result.success) {
                    console.log(`✅ Successfully retried transaction: ${key}`);
                }

            } catch (error) {
                console.error(`❌ Error during retry of ${key}:`, error.message);
            }
        }
    }

    // Manual compensation trigger (can be called via API)
    async triggerManualCompensation(commandId) {
        return await this.compensationHandler.triggerManualCompensation(commandId);
    }

    // Get failed transactions (for monitoring/admin)
    getFailedTransactions() {
        return [...this.storage.getFailedTransactions().entries()].map(([key, value]) => ({
            key,
            ...value
        }));
    }

    async stop() {
        console.log('🛑 Stopping IU2U Relayer...');
        this.isRunning = false;
        this.storage.saveProcessedEvents();
        this.storage.saveFailedTransactions();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Health check endpoint
    async getHealth() {
        return await this.healthMonitor.getHealth();
    }
}

module.exports = IU2URelayer;
