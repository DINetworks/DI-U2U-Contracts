# Quick Start

Get up and running with IU2U Protocol in just a few minutes! This guide combines **Gasless Meta Transactions** and **IU2U Cross-Chain Protocol** for seamless blockchain interactions.

## Overview

IU2U Protocol is a unified system that enables:

- **🔥 Gasless Meta Transactions**: Execute any contract interaction without holding native gas tokens
- **🌉 IU2U Cross-Chain Protocol**: Seamless token transfers and DEX aggregation across 7+ blockchains

In this quick start, you'll learn how to:

1. Set up gas credits for gasless transactions
2. Execute gasless contract calls
3. Perform cross-chain IU2U transfers
4. Use DEX aggregation features
5. Integrate both systems in your dApp

## 1. Basic Setup

### Frontend Integration

Install and initialize the IU2U SDK with both gasless and cross-chain capabilities:

```javascript
import {
  IU2UProvider,
  CrossChainAggregator,
  GasCreditVault,
  MetaTxGateway
} from '@iu2u/sdk';
import { ethers } from 'ethers';

// Initialize Web3 provider
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Initialize IU2U Protocol (both systems)
const iu2u = new IU2UProvider({
  provider: provider,
  signer: signer,
  network: 'testnet' // Use testnet for development
});

// Initialize components
const aggregator = new CrossChainAggregator({ provider, signer });
const gasVault = new GasCreditVault({ provider, signer });
const metaTxGateway = new MetaTxGateway({ provider, signer });
```

### Smart Contract Integration

For direct smart contract integration with both systems:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IIU2UGateway.sol";
import "./IU2UExecutable.sol";
import "./interfaces/IGasCreditVault.sol";

contract MyDApp is IU2UExecutable {
    IGasCreditVault public gasVault;
    IIU2UGateway public iu2uGateway;

    constructor(
        address gateway_,
        address gasVault_,
        address iu2uGateway_
    ) IU2UExecutable(gateway_) {
        gasVault = IGasCreditVault(gasVault_);
        iu2uGateway = IIU2UGateway(iu2uGateway_);
    }

    // Gasless function call
    function gaslessTransfer(address token, address to, uint256 amount) external {
        // This function can be called gaslessly via MetaTxGateway
        IERC20(token).transfer(to, amount);
    }

    // Cross-chain IU2U transfer
    function crossChainTransfer(
        string memory destinationChain,
        address destinationAddress,
        uint256 amount
    ) external {
        iu2uGateway.sendToken(destinationChain, _addressToString(destinationAddress), "IU2U", amount);
    }
}
```

## 2. Gas Credits Setup

### Deposit Tokens for Gas Credits

First, set up gas credits to enable gasless transactions:

```javascript
async function setupGasCredits() {
  try {
    // Check supported tokens
    const supportedTokens = await gasVault.getWhitelistedTokens();
    console.log('Supported tokens:', supportedTokens);

    // Deposit USDC to get gas credits
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on testnet
    const depositAmount = ethers.utils.parseUnits('10', 6); // 10 USDC

    // Approve vault to spend tokens
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
    await usdc.approve(gasVault.address, depositAmount);

    // Deposit and get credits
    const tx = await gasVault.deposit(usdcAddress, depositAmount);
    await tx.wait();

    // Check credit balance
    const credits = await gasVault.credits(await signer.getAddress());
    console.log(`Gas credits: $${ethers.utils.formatEther(credits)}`);

  } catch (error) {
    console.error('Gas credit setup failed:', error);
  }
}
```

### Check Gas Credit Balance

```javascript
async function checkCredits() {
  const userAddress = await signer.getAddress();
  const creditBalance = await gasVault.credits(userAddress);
  const creditValue = ethers.utils.formatEther(creditBalance);

  console.log(`Available gas credits: $${creditValue}`);

  // Estimate if you have enough for a transaction
  const estimatedCost = ethers.utils.parseEther('0.50'); // $0.50
  const hasEnoughCredits = creditBalance.gte(estimatedCost);

  return { creditBalance, hasEnoughCredits };
}
```

## 3. Gasless Transactions

### Execute Gasless Contract Calls

Execute any contract function without holding native gas tokens:

```javascript
async function gaslessTransfer() {
  try {
    // Check gas credits first
    const { hasEnoughCredits } = await checkCredits();
    if (!hasEnoughCredits) {
      throw new Error('Insufficient gas credits. Please deposit more tokens.');
    }

    // Target contract and function
    const targetContract = '0x1234567890123456789012345678901234567890'; // Your contract
    const recipient = '0x742d35Cc6634C0532925a3b8D4048b05fb2fE98c';
    const amount = ethers.utils.parseEther('1');

    // Encode function call
    const iface = new ethers.utils.Interface(['function transfer(address,uint256)']);
    const data = iface.encodeFunctionData('transfer', [recipient, amount]);

    // Create meta-transaction
    const metaTx = {
      to: targetContract,
      value: 0, // No native token transfer
      data: data
    };

    // Get current nonce
    const userAddress = await signer.getAddress();
    const nonce = await metaTxGateway.getNonce(userAddress);

    // Set deadline (5 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 300;

    // Get digest for signing
    const digest = await metaTxGateway.getSigningDigest(
      userAddress,
      [metaTx], // Single transaction
      nonce,
      deadline
    );

    // Sign the transaction
    const signature = await signer.signMessage(ethers.utils.arrayify(digest));

    // Execute via relayer
    const tx = await metaTxGateway.executeMetaTransactions(
      userAddress,
      [metaTx],
      signature,
      nonce,
      deadline
    );

    console.log('Gasless transaction executed:', tx.hash);

  } catch (error) {
    console.error('Gasless transaction failed:', error);
  }
}
```

### Batch Gasless Transactions

Execute multiple operations in a single gasless transaction:

```javascript
async function batchGaslessOperations() {
  try {
    const userAddress = await signer.getAddress();
    const nonce = await metaTxGateway.getNonce(userAddress);
    const deadline = Math.floor(Date.now() / 1000) + 300;

    // Multiple operations in one batch
    const metaTxs = [
      {
        to: tokenContract,
        value: 0,
        data: encodeTransfer(recipient1, ethers.utils.parseEther('1'))
      },
      {
        to: stakingContract,
        value: 0,
        data: encodeStake(ethers.utils.parseEther('0.5'))
      },
      {
        to: votingContract,
        value: 0,
        data: encodeVote(proposalId, true)
      }
    ];

    // Sign and execute batch
    const digest = await metaTxGateway.getSigningDigest(userAddress, metaTxs, nonce, deadline);
    const signature = await signer.signMessage(ethers.utils.arrayify(digest));

    const tx = await metaTxGateway.executeMetaTransactions(
      userAddress, metaTxs, signature, nonce, deadline
    );

    console.log('Batch gasless transactions executed:', tx.hash);

  } catch (error) {
    console.error('Batch transaction failed:', error);
  }
}
```

## 4. IU2U Bridge Operations

### Cross-Chain IU2U Transfers

Send IU2U tokens across different blockchains:

```javascript
async function sendIU2UCrossChain() {
  try {
    // Get IU2U token address on current chain
    const iu2uToken = await iu2u.getIU2UTokenAddress();

    // Approve gateway to spend IU2U
    const iu2u = new ethers.Contract(iu2uToken, ERC20_ABI, signer);
    const amount = ethers.utils.parseEther('10');
    await iu2u.approve(iu2uGateway.address, amount);

    // Send IU2U to BSC
    const tx = await iu2uGateway.sendToken(
      'bsc', // destination chain
      '0x742d35Cc6634C0532925a3b8D4048b05fb2fE98c', // recipient address
      'IU2U',
      amount
    );

    console.log('IU2U cross-chain transfer initiated:', tx.hash);

    // Monitor transfer status
    const status = await iu2u.waitForTransferCompletion(tx.hash);
    console.log('Transfer completed:', status);

  } catch (error) {
    console.error('IU2U transfer failed:', error);
  }
}
```

### Cross-Chain Contract Calls

Execute contracts on other chains with IU2U transfers:

```javascript
async function crossChainContractCall() {
  try {
    // Target contract on destination chain
    const targetContract = '0x1234567890123456789012345678901234567890';
    const recipient = '0x742d35Cc6634C0532925a3b8D4048b05fb2fE98c';
    const amount = ethers.utils.parseEther('5');

    // Encode function call for destination
    const iface = new ethers.utils.Interface(['function deposit(address,uint256)']);
    const payload = iface.encodeFunctionData('deposit', [recipient, amount]);

    // Approve IU2U spending
    const iu2u = new ethers.Contract(await iu2u.getIU2UTokenAddress(), ERC20_ABI, signer);
    await iu2u.approve(iu2uGateway.address, amount);

    // Call contract with IU2U transfer
    const tx = await iu2uGateway.callContractWithToken(
      'polygon', // destination chain
      targetContract,
      payload,
      'IU2U',
      amount
    );

    console.log('Cross-chain contract call initiated:', tx.hash);

  } catch (error) {
    console.error('Cross-chain call failed:', error);
  }
}
```

## 6. Error Handling

Implement proper error handling for production applications:

```javascript
async function robustSwap() {
  try {
    // Attempt swap
    const tx = await aggregator.executeSwap(swapParams);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('Swap successful!');
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('Insufficient balance');
    } else if (error.code === 'USER_REJECTED') {
      console.error('User rejected transaction');
    } else if (error.message.includes('slippage')) {
      console.error('Slippage tolerance exceeded');
    } else {
      console.error('Unknown error:', error);
    }
  }
}
```

## 5. Integration Examples

### Combined Gasless + Cross-Chain dApp

Build a complete dApp that combines both systems:

```javascript
async function completeUserFlow() {
  try {
    // Step 1: Set up gas credits
    await setupGasCredits();

    // Step 2: Execute gasless staking
    await gaslessStake(ethers.utils.parseEther('1'));

    // Step 3: Cross-chain IU2U transfer to claim rewards elsewhere
    await sendIU2UCrossChain();

    console.log('Complete user flow executed successfully!');

  } catch (error) {
    console.error('User flow failed:', error);
  }
}

// Gasless staking function
async function gaslessStake(amount) {
  const stakingContract = '0x...'; // Your staking contract
  const iface = new ethers.utils.Interface(['function stake(uint256)']);
  const data = iface.encodeFunctionData('stake', [amount]);

  const metaTx = { to: stakingContract, value: 0, data };
  // ... execute via MetaTxGateway
}
```

## Next Steps

Now that you've completed the quick start:

1. **[Explore Core Concepts](../core-concepts/protocol-overview.md)** - Understand the integrated IU2U system
2. **[Learn Gasless Meta Transactions](../metatx/overview.md)** - Deep dive into gasless transactions
3. **[Study Cross-Chain Operations](../cross-chain/message-passing.md)** - Master IU2U bridge functionality
4. **[Read API Reference](../api-reference/iu2u-gateway.md)** - Complete function documentation
5. **[Check Configuration](../getting-started/configuration.md)** - Set up both systems properly

## Common Patterns

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { useIU2U } from '@iu2u/react-hooks';

function SwapComponent() {
  const { iu2u, aggregator } = useIU2U();
  const [quote, setQuote] = useState(null);
  
  useEffect(() => {
    async function getQuote() {
      const result = await aggregator.getOptimalQuote(
        tokenIn,
        tokenOut,
        amountIn
      );
      setQuote(result);
    }
    
    getQuote();
  }, [tokenIn, tokenOut, amountIn]);
  
  return (
    <div>
      {quote && (
        <p>Best rate: {quote.bestAmount} tokens</p>
      )}
    </div>
  );
}
```

### Vue.js Integration

```javascript
import { reactive, computed } from 'vue';
import { IU2UProvider } from '@iu2u/sdk';

export default {
  setup() {
    const state = reactive({
      provider: null,
      quote: null
    });
    
    const initIU2U = async () => {
      state.provider = new IU2UProvider({
        network: 'mainnet'
      });
    };
    
    return {
      state,
      initIU2U
    };
  }
};
```

## Support & Community

- 📖 **Documentation**: You're reading it!
- 💬 **Discord**: [Join our community](https://discord.gg/iu2u)
- 🐛 **Issues**: [GitHub Issues](https://github.com/DINetworks/IU2U-Contracts/issues)
- 📧 **Email**: support@iu2u.com
- 🐦 **Twitter**: [@IU2UProtocol](https://twitter.com/IU2UProtocol)

Ready to dive deeper? Continue with the [Core Concepts](../core-concepts/protocol-overview.md) section!
