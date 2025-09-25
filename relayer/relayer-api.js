const express = require('express');
const cors = require('cors');
const IU2URelayer = require('./IU2URelayer');
const config = require('./config.json');
const IU2UGatewayAbi = require('./abi/IU2UGateway.json').abi;

/**
 * IU2U Relayer Monitoring API
 * Provides REST endpoints for monitoring and managing the relayer
 */
class RelayerAPI {
    constructor(relayer) {
        this.relayer = relayer;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Enable CORS for all origins
        this.app.use(cors({
            origin: true, // Allow all origins
        }));

        this.app.use(express.json());
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                const health = await this.relayer.getHealth();
                res.json(health);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get failed transactions
        this.app.get('/failed-transactions', (req, res) => {
            try {
                const failedTxs = this.relayer.storage.getFailedTransactions();
                res.json({
                    count: failedTxs.length,
                    transactions: failedTxs,
                    summary: this.getFailureSummary(failedTxs)
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Trigger manual compensation for a specific transaction
        this.app.post('/compensate/:commandId', async (req, res) => {
            try {
                const { commandId } = req.params;
                const result = await this.relayer.triggerManualCompensation(commandId);
                res.json(result);
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        // Get relayer status
        this.app.get('/status', (req, res) => {
            res.json({
                isRunning: this.relayer.isRunning,
                processedEvents: this.relayer.storage.getProcessedEvents().size,
                failedTransactions: this.relayer.storage.getFailedTransactions().size,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            });
        });

        // Emergency stop endpoint (for manual intervention)
        this.app.post('/emergency-stop', async (req, res) => {
            try {
                await this.relayer.stop();
                res.json({ message: 'Relayer stopped successfully' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get specific failed transaction details
        this.app.get('/failed-transactions/:commandId', (req, res) => {
            try {
                const { commandId } = req.params;
                const failedTxs = this.relayer.getFailedTransactions();
                const transaction = failedTxs.find(tx => tx.commandId === commandId);

                if (!transaction) {
                    return res.status(404).json({ error: 'Transaction not found' });
                }

                res.json(transaction);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Check if a command has been executed successfully
        this.app.get('/command/:commandId/:chain', async (req, res) => {
            try {
                const { commandId, chain } = req.params;

                // Validate chain parameter
                if (!this.relayer.publicClients[chain]) {
                    return res.status(400).json({ error: `Unsupported chain: ${chain}` });
                }

                // Check if command has been executed on the specified chain
                const client = this.relayer.publicClients[chain];

                const isExecuted = await client.readContract({
                    address: config.iu2uGatewayAddress[chain],
                    abi: IU2UGatewayAbi,
                    functionName: 'isCommandExecuted',
                    args: [commandId]
                });

                // Also check for pending commands
                const pendingCommand = this.relayer.storage.getPendingCommand(commandId);

                const response = {
                    commandId,
                    chain,
                    executed: isExecuted,
                    timestamp: new Date().toISOString()
                };

                // Add command status and transaction details
                if (pendingCommand) {
                    response.status = pendingCommand.status;
                    response.txHash = pendingCommand.txHash || null;
                    response.gasUsed = pendingCommand.gasUsed ? pendingCommand.gasUsed.toString() : null;

                    // Add additional details for pending/failed commands
                    if (pendingCommand.status === 'pending' || pendingCommand.status === 'failed') {
                        response.type = pendingCommand.type;
                        response.sourceChain = pendingCommand.sourceChain;
                        response.destinationChain = pendingCommand.destinationChain;
                        response.commandTimestamp = new Date(pendingCommand.timestamp).toISOString();
                        if (pendingCommand.error) {
                            response.error = pendingCommand.error;
                        }
                    }
                } else {
                    // No pending command found, command might be completed or never existed
                    response.status = isExecuted ? 'completed' : 'unknown';
                    response.txHash = null;
                    response.gasUsed = null;
                }

                res.json(response);
            } catch (error) {
                res.status(500).json({
                    error: error.message,
                    commandId: req.params.commandId,
                    chain: req.params.chain
                });
            }
        });
    }

    getFailureSummary(failedTxs) {
        const summary = {
            total: failedTxs.length,
            byChain: {},
            byErrorType: {},
            recentFailures: [],
            criticalIssues: []
        };

        failedTxs.forEach(tx => {
            // Count by chain
            const chain = tx.destinationChain;
            summary.byChain[chain] = (summary.byChain[chain] || 0) + 1;

            // Count by error type
            if (tx.diagnostics && tx.diagnostics.possibleCauses) {
                tx.diagnostics.possibleCauses.forEach(cause => {
                    summary.byErrorType[cause] = (summary.byErrorType[cause] || 0) + 1;
                });
            }

            // Check for critical issues
            if (tx.diagnostics) {
                if (!tx.diagnostics.hasFunds) {
                    summary.criticalIssues.push(`Insufficient funds on ${chain}`);
                }
                if (tx.diagnostics.nonceIssue) {
                    summary.criticalIssues.push(`Nonce issue on ${chain}`);
                }
                if (!tx.diagnostics.isWhitelisted) {
                    summary.criticalIssues.push(`Relayer not whitelisted on ${chain}`);
                }
            }

            // Recent failures (last 10)
            if (summary.recentFailures.length < 10) {
                summary.recentFailures.push({
                    commandId: tx.commandId,
                    chain: tx.destinationChain,
                    error: tx.error,
                    timestamp: tx.timestamp,
                    retryCount: tx.retryCount
                });
            }
        });

        // Remove duplicates from critical issues
        summary.criticalIssues = [...new Set(summary.criticalIssues)];

        return summary;
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`🌐 Relayer API server running on port ${port}`);
            console.log(`📊 Health check: http://localhost:${port}/health`);
            console.log(`❌ Failed transactions: http://localhost:${port}/failed-transactions`);
            console.log(`📈 Status: http://localhost:${port}/status`);
            console.log(`🔍 Command status: http://localhost:${port}/command/{commandId}/{chain}`);
        });
    }
}

// Start the relayer and API if this file is run directly
if (require.main === module) {
    async function main() {
        try {
            console.log('🚀 Starting IU2U Relayer with Failure Recovery...');
            
            const relayer = new IU2URelayer(config);
            const api = new RelayerAPI(relayer);
            
            // Start API server
            const port = config.healthCheckPort || 3000;
            api.start(port);
            
            // Start relayer
            await relayer.start();
            
        } catch (error) {
            console.error('❌ Failed to start relayer:', error);
            process.exit(1);
        }
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        process.exit(0);
    });

    main().catch(console.error);
}

module.exports = RelayerAPI;
