require('dotenv').config();
const hre = require("hardhat");

async function main() {
    console.log("Deploying IU2U GMP Protocol...");

    // Get the deployer account from hardhat signers (uses PRIVATE_KEY from .env)
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy IU2U token contract
    console.log("\n1. Deploying IU2U Token...");
    const IU2UToken = await ethers.getContractFactory("IU2U");
    const iu2uToken = await IU2UToken.deploy(deployer.address);
    await iu2uToken.waitForDeployment();
    const iu2uTokenAddress = await iu2uToken.getAddress();
    console.log("IU2U Token deployed to:", iu2uTokenAddress);

    // const iu2uTokenAddress = "0xA3A350214b699578bF9df1Eeb743ab7C139119d6"
    
    // Deploy IU2U Gateway contract
    console.log("\n2. Deploying IU2U Gateway...");
    const IU2UGateway = await ethers.getContractFactory("IU2UGateway");
    const iu2uGateway = await IU2UGateway.deploy(deployer.address, iu2uTokenAddress);
    await iu2uGateway.waitForDeployment();
    const iu2uGatewayAddress = await iu2uGateway.getAddress();
    console.log("IU2U Gateway deployed to:", iu2uGatewayAddress);

    // Set gateway address in IU2U token
    console.log("\n3. Setting gateway address in IU2U token...");
    // const iu2uToken = await ethers.getContractAt("IU2U", iu2uTokenAddress);
    await iu2uToken.setGateway(iu2uGatewayAddress);
    console.log("✅ Gateway address set in IU2U token");

    // Initial setup
    console.log("\n4. Initial setup...");

    // Add some initial relayers (in production, these would be real relayer addresses)
    const relayerAddresses = [
        // "0x1234567890123456789012345678901234567890", // Replace with real addresses
        // "0x2345678901234567890123456789012345678901"
    ];

    
    for (const relayerAddr of relayerAddresses) {
        try {
            console.log(`Adding relayer: ${relayerAddr}`);
            await iu2uGateway.addWhitelistedRelayer(relayerAddr);
            console.log(`✅ Relayer ${relayerAddr} added successfully`);
        } catch (error) {
            console.log(`❌ Failed to add relayer ${relayerAddr}:`, error.message);
        }
    }

    // Add additional chains (beyond the defaults)
    const additionalChains = [
        // { name: "fantom", id: 250 },
    ];

    for (const chain of additionalChains) {
        try {
            console.log(`Adding chain: ${chain.name} (ID: ${chain.id})`);
            await iu2uGateway.addChain(chain.name, chain.id);
            console.log(`✅ Chain ${chain.name} added successfully`);
        } catch (error) {
            console.log(`❌ Failed to add chain ${chain.name}:`, error.message);
        }
    }

    console.log("\n5. Deployment Summary:");
    console.log("========================");
    console.log(`IU2U Token: ${iu2uTokenAddress}`);
    console.log(`IU2U Gateway: ${iu2uGatewayAddress}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
    console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);

    console.log("\n6. Verification Commands:");
    console.log("========================");
    console.log(`npx hardhat verify --network u2u-solaris-mainnet ${iu2uTokenAddress} "${deployer.address}"`);
    console.log(`npx hardhat verify --network u2u-solaris-mainnet ${iu2uGatewayAddress} "${deployer.address}" "${iu2uTokenAddress}"`);

    console.log("\n7. Next Steps:");
    console.log("========================");
    console.log("1. Add real relayer addresses using iu2uGateway.addWhitelistedRelayer()");
    console.log("2. Set up relayer infrastructure to monitor IU2UGateway events");
    console.log("3. Deploy IU2U contracts on other chains");
    console.log("4. Test cross-chain functionality");
    console.log("5. Configure chain mappings on all deployed instances");

    // Optional: Test basic functionality
    console.log("\n8. Testing basic functionality...");

    // Check if we're on U2U chain for deposit testing
    const currentChainId = (await ethers.provider.getNetwork()).chainId;
    const u2uChainId = 2484; // U2U Nebulas Testnet

    if (currentChainId === u2uChainId) {
        try {
            console.log("Testing IU2U deposit on U2U chain...");
            const depositTx = await iu2uToken.deposit({ value: ethers.parseEther("1.0") });
            await depositTx.wait();
            const balance = await iu2uToken.balanceOf(deployer.address);
            console.log(`✅ IU2U balance after deposit: ${ethers.formatEther(balance)} IU2U`);

            // Test backing ratio
            const u2uBalance = await iu2uToken.getU2UBalance();
            const isFullyBacked = await iu2uToken.isFullyBacked();
            console.log(`✅ U2U locked in contract: ${ethers.formatEther(u2uBalance)} U2U`);
            console.log(`✅ Is fully backed: ${isFullyBacked}`);
        } catch (error) {
            console.log("❌ Deposit test failed:", error.message);
        }
    } else {
        console.log(`ℹ️  Not on U2U chain (current: ${currentChainId}, U2U: ${u2uChainId}), skipping deposit test`);
    }

    // Test getting chain info from gateway
    try {
        const chainId = await iu2uGateway.getChainId("ethereum");
        console.log(`✅ Ethereum chain ID: ${chainId}`);

        const chainName = await iu2uGateway.getChainName(1);
        console.log(`✅ Chain ID 1 name: ${chainName}`);

        // Test relayer functions
        const relayerCount = await iu2uGateway.getRelayerCount();
        console.log(`✅ Number of relayers: ${relayerCount}`);

        const allRelayers = await iu2uGateway.getAllRelayers();
        console.log(`✅ All relayers: ${allRelayers.join(", ")}`);
    } catch (error) {
        console.log("❌ Chain info test failed:", error.message);
    }

    // Test GMP functionality example
    console.log("\n9. Testing GMP functionality...");
    try {
        // Test calling a contract on another chain (this will just emit events)
        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "uint256"],
            ["Hello from U2U!", 42]
        );

        const callTx = await iu2uGateway.callContract(
            "ethereum",
            "0x1234567890123456789012345678901234567890",
            payload
        );
        await callTx.wait();
        console.log("✅ Cross-chain contract call initiated");

    } catch (error) {
        console.log("❌ GMP test failed:", error.message);
    }

    console.log("\n🎉 IU2U GMP Protocol deployment completed!");
    console.log("\n📋 Contract Addresses Summary:");
    console.log("================================");
    console.log(`IU2U Token: ${iu2uTokenAddress}`);
    console.log(`IU2U Gateway: ${iu2uGatewayAddress}`);
    console.log(`Owner: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
    console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
