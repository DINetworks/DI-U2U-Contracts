const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("Adding relayer to whitelist...");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Get relayer address from command line or environment
    const relayerAddress = process.env.RELAYER_ADDRESS || process.argv[2];
    
    if (!relayerAddress) {
        console.error("❌ Please provide relayer address:");
        console.log("   npx hardhat run scripts/whitelist-relayer.js --network <network> <relayer_address>");
        console.log("   Or set RELAYER_ADDRESS environment variable");
        process.exit(1);
    }

    if (!ethers.isAddress(relayerAddress)) {
        console.error("❌ Invalid relayer address:", relayerAddress);
        process.exit(1);
    }

    // Get IU2U contract address (you may need to update this)
    const iu2uAddress = process.env.IU2U_ADDRESS;

    if (!iu2uAddress) {
        console.error("❌ Please set IU2U_ADDRESS environment variable or update the script");
        process.exit(1);
    }

    // Connect to IU2U contract
    const IU2U = await ethers.getContractFactory("IU2U");
    const iu2u = IU2U.attach(iu2uAddress);

    console.log("IU2U Contract:", iu2uAddress);
    console.log("Relayer Address:", relayerAddress);

    // Check if already whitelisted
    try {
        const isWhitelisted = await iu2u.isWhitelistedRelayer(relayerAddress);

        if (isWhitelisted) {
            console.log("✅ Relayer is already whitelisted");
            return;
        }

        // Add to whitelist
        console.log("Adding relayer to whitelist...");
        const tx = await iu2u.addWhitelistedRelayer(relayerAddress);
        console.log("Transaction hash:", tx.hash);

        const receipt = await tx.wait();
        console.log("✅ Relayer whitelisted successfully!");
        console.log("Gas used:", receipt.gasUsed.toString());

        // Verify
        const isNowWhitelisted = await iu2u.isWhitelistedRelayer(relayerAddress);
        console.log("Verification:", isNowWhitelisted ? "✅ SUCCESS" : "❌ FAILED");

    } catch (error) {
        console.error("❌ Failed to whitelist relayer:", error.message);
        
        if (error.message.includes("Already relayer")) {
            console.log("ℹ️  Relayer is already whitelisted");
        } else if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("❌ Only the contract owner can whitelist relayers");
        } else {
            throw error;
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
