const dotenv = require('dotenv');
const { ethers, upgrades } = require("hardhat");
const rlp = require("rlp");
const keccak256 = require("keccak256");

dotenv.config()

// Use Hardhat's network config for provider and accounts
// ethers.provider and ethers.getSigners() are automatically set by Hardhat
const RELAYER = '0xE70C7b350F81D5aF747697f5553EF8a5726f7344';
const TOKENS = {
  IU2U: "0x2551f9E86a20bf4627332A053BEE14DA623d1007",
  // USDT: "0x55d398326f99059ff775485246999027b3197955",
  // USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
};

// owner = 0x075Fee80E95ff922Ec067AEd2657b11359990479
// relayer = 0xE70C7b350F81D5aF747697f5553EF8a5726f7344

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'


async function main() {

  // MetaTxGateway Deployment
  
  const [deployer] = await ethers.getSigners();

  const nonce = await ethers.provider.getTransactionCount(deployer.address);

  console.log("Deployer:", deployer.address);
  console.log("Current Nonce:", nonce);

  // Precompute next deployment address
  const encoded = rlp.encode([deployer.address, nonce]);
  const hash = keccak256(encoded);
  const predictedAddress = "0x" + hash.slice(12).toString("hex");

  console.log("Predicted next contract address:", predictedAddress);

  const GatewayFactory = await ethers.getContractFactory("MetaTxGateway", deployer);
  const gatewayContract = await upgrades.deployProxy(GatewayFactory, [], {
    initializer: "initialize",
    kind: "uups"
  })
  await gatewayContract.waitForDeployment();
  console.log('MetaTxGateway(Proxy)', gatewayContract.target);

  const relayerTx2 = await gatewayContract.setRelayerAuthorization(RELAYER, true);
  await relayerTx2.wait()

  // GasCreditVault Deployment
  const CreditVault = await ethers.getContractFactory("GasCreditVault", deployer);
  const creditVault = await upgrades.deployProxy(CreditVault, [], {
    initializer: "initialize",
    kind: "uups"
  })
  await creditVault.waitForDeployment();
  console.log('GasCreditVault(Proxy)', creditVault.target)
  
  // Setup vault
  // const creditVault = await ethers.getContractAt("GasCreditVault", '0x0f796dC6bD0fa676BF5CE02658Dab86E1Dc95EFc', deployer);
  const whitelistTx0 = await creditVault.whitelistToken(TOKENS.IU2U, ZERO_ADDRESS, true);
  await whitelistTx0.wait()

  const whitelistTx1 = await creditVault.whitelistToken(TOKENS.USDT, ZERO_ADDRESS, true);
  await whitelistTx1.wait()

  const whitelistTx2 = await creditVault.whitelistToken(TOKENS.USDC, ZERO_ADDRESS, true);
  await whitelistTx2.wait()

  
  const relayerTx = await creditVault.addWhitelistedRelayer(RELAYER);
  await relayerTx.wait()
  

  console.log("MetaTx Contracts deployment completed.");
}

main()
.then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });