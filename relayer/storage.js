const fs = require('fs');
const path = require('path');

/**
 * Storage utilities for IU2U Relayer
 * Handles persistence of processed events and failed transactions
 */
class RelayerStorage {
    constructor() {
        this.processedEvents = new Set();
        this.failedTransactions = new Map();
        this.pendingCommands = new Map();
    }

    loadProcessedEvents() {
        try {
            const filePath = path.join(__dirname, 'processed_events.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.processedEvents = new Set(data);
                console.log(`📁 Loaded ${this.processedEvents.size} processed events`);
            }
        } catch (error) {
            console.log('📁 No previous processed events found, starting fresh');
        }
    }

    loadFailedTransactions() {
        try {
            const filePath = path.join(__dirname, 'failed_transactions.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.failedTransactions = new Map();

                // Deserialize BigInt values
                for (const [key, value] of data) {
                    this.failedTransactions.set(key, this.deserializeFailedTransaction(value));
                }

                console.log(`📁 Loaded ${this.failedTransactions.size} failed transactions`);
            }
        } catch (error) {
            console.log('📁 No previous failed transactions found, starting fresh');
        }
    }

    deserializeFailedTransaction(tx) {
        // Deep clone and convert string BigInt values back to BigInt
        return this.deepCloneWithStringToBigInt(tx);
    }

    deepCloneWithStringToBigInt(obj) {
        if (obj === null || typeof obj !== 'object') {
            // Convert known BigInt fields back
            if (typeof obj === 'string') {
                // Check if it's a numeric string that should be BigInt
                if (/^\d+$/.test(obj) && obj.length > 10) { // Likely a BigInt if it's a long number
                    // Check field names that should be BigInt
                    return BigInt(obj);
                }
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepCloneWithStringToBigInt(item));
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Convert specific known BigInt fields
                if (key === 'amount' || key === 'timestamp') {
                    cloned[key] = typeof obj[key] === 'string' ? BigInt(obj[key]) : obj[key];
                } else if (key === 'retryCount' || key === 'maxRetries') {
                    cloned[key] = typeof obj[key] === 'string' ? parseInt(obj[key]) : obj[key];
                } else {
                    cloned[key] = this.deepCloneWithStringToBigInt(obj[key]);
                }
            }
        }
        return cloned;
    }

    saveFailedTransactions() {
        try {
            const filePath = path.join(__dirname, 'failed_transactions.json');

            // Convert Map to array and handle BigInt serialization
            const serializableData = [...this.failedTransactions].map(([key, value]) => {
                return [key, this.serializeFailedTransaction(value)];
            });

            fs.writeFileSync(filePath, JSON.stringify(serializableData, null, 2));
        } catch (error) {
            console.error('❌ Failed to save failed transactions:', error.message);
            // Try to save without serialization as fallback
            try {
                const fallbackData = [...this.failedTransactions].map(([key, value]) => {
                    // Create a safe copy without BigInt values
                    const safeValue = { ...value };
                    delete safeValue.amount;
                    delete safeValue.timestamp;
                    return [key, { ...safeValue, serializationError: 'BigInt values removed' }];
                });
                fs.writeFileSync(path.join(__dirname, 'failed_transactions.json'), JSON.stringify(fallbackData, null, 2));
                console.log('✅ Saved failed transactions with BigInt values removed');
            } catch (fallbackError) {
                console.error('❌ Fallback save also failed:', fallbackError.message);
            }
        }
    }

    serializeFailedTransaction(tx) {
        // Deep clone and convert all BigInt values to strings
        return this.deepCloneWithBigIntToString(tx);
    }

    deepCloneWithBigIntToString(obj) {
        if (obj === null || typeof obj !== 'object') {
            if (typeof obj === 'bigint') {
                return obj.toString();
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepCloneWithBigIntToString(item));
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepCloneWithBigIntToString(obj[key]);
            }
        }
        return cloned;
    }

    saveProcessedEvents() {
        try {
            const filePath = path.join(__dirname, 'processed_events.json');
            fs.writeFileSync(filePath, JSON.stringify([...this.processedEvents], null, 2));
        } catch (error) {
            console.error('❌ Failed to save processed events:', error.message);
        }
    }

    getProcessedEvents() {
        return this.processedEvents;
    }

    getFailedTransactions() {
        return this.failedTransactions;
    }

    addProcessedEvent(eventId) {
        this.processedEvents.add(eventId);
    }

    addFailedTransaction(key, transaction) {
        this.failedTransactions.set(key, transaction);
    }

    removeFailedTransaction(key) {
        return this.failedTransactions.delete(key);
    }

    hasProcessedEvent(eventId) {
        return this.processedEvents.has(eventId);
    }

    getFailedTransaction(key) {
        return this.failedTransactions.get(key);
    }

    // Pending commands management
    addPendingCommand(commandId, commandData) {
        this.pendingCommands.set(commandId, commandData);
        this.savePendingCommands();
    }

    updatePendingCommand(commandId, updates) {
        const existing = this.pendingCommands.get(commandId);
        if (existing) {
            this.pendingCommands.set(commandId, { ...existing, ...updates });
            this.savePendingCommands();
        }
    }

    getPendingCommand(commandId) {
        return this.pendingCommands.get(commandId);
    }

    getAllPendingCommands() {
        return Array.from(this.pendingCommands.values());
    }

    removePendingCommand(commandId) {
        const removed = this.pendingCommands.delete(commandId);
        if (removed) {
            this.savePendingCommands();
        }
        return removed;
    }

    loadPendingCommands() {
        try {
            const filePath = path.join(__dirname, 'pending_commands.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.pendingCommands = new Map();

                // Deserialize BigInt values
                for (const [key, value] of data) {
                    this.pendingCommands.set(key, this.deserializePendingCommand(value));
                }

                console.log(`📁 Loaded ${this.pendingCommands.size} pending commands`);
            }
        } catch (error) {
            console.log('📁 No previous pending commands found, starting fresh');
        }
    }

    serializePendingCommand(cmd) {
        // Deep clone and convert all BigInt values to strings
        return this.deepCloneWithBigIntToString(cmd);
    }

    deserializePendingCommand(cmd) {
        // Deep clone and convert string BigInt values back to BigInt
        return this.deepCloneWithStringToBigInt(cmd);
    }

    savePendingCommands() {
        try {
            const filePath = path.join(__dirname, 'pending_commands.json');

            // Convert Map to array and handle BigInt serialization
            const serializableData = [...this.pendingCommands].map(([key, value]) => {
                return [key, this.serializePendingCommand(value)];
            });

            fs.writeFileSync(filePath, JSON.stringify(serializableData, null, 2));
        } catch (error) {
            console.error('❌ Failed to save pending commands:', error.message);
            // Try to save without serialization as fallback
            try {
                const fallbackData = [...this.pendingCommands].map(([key, value]) => {
                    // Create a safe copy without BigInt values
                    const safeValue = { ...value };
                    delete safeValue.timestamp;
                    return [key, { ...safeValue, serializationError: 'BigInt values removed' }];
                });
                fs.writeFileSync(path.join(__dirname, 'pending_commands.json'), JSON.stringify(fallbackData, null, 2));
                console.log('✅ Saved pending commands with BigInt values removed');
            } catch (fallbackError) {
                console.error('❌ Fallback save also failed:', fallbackError.message);
            }
        }
    }
}

module.exports = RelayerStorage;