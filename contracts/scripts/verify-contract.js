const hre = require("hardhat");
const { ethers } = hre;

/**
 * Script to verify a deployed contract is live and functioning
 */
async function main() {
  const REGISTRY_EVVM = process.env.REGISTRY_EVVM;
  const NETWORK = hre.network.name;

  if (!REGISTRY_EVVM) {
    console.error("Error: Set REGISTRY_EVVM environment variable");
    console.error("Example: export REGISTRY_EVVM=0x1234...");
    process.exit(1);
  }

  console.log(`\n=== Verifying Contract on ${NETWORK} ===\n`);
  console.log("Contract Address:", REGISTRY_EVVM);

  try {
    // Get contract instance
    const Registry = await ethers.getContractFactory("ShipmentRegistryEVVM");
    const registry = Registry.attach(REGISTRY_EVVM);

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Chain ID:", network.chainId.toString());

    // Check 1: Contract exists and is deployed
    console.log("\n[1/6] Checking contract deployment...");
    const code = await ethers.provider.getCode(REGISTRY_EVVM);
    if (code === "0x") {
      console.error("❌ Contract not found at this address!");
      process.exit(1);
    }
    console.log("✅ Contract code exists");

    // Check 2: Admin address
    console.log("\n[2/6] Checking admin...");
    const admin = await registry.admin();
    console.log("✅ Admin:", admin);

    // Check 3: Domain separator
    console.log("\n[3/6] Checking domain separator...");
    const domainSeparator = await registry.getDomainSeparator();
    console.log("✅ Domain Separator:", domainSeparator);

    // Check 4: Read a public variable
    console.log("\n[4/6] Testing contract read...");
    const [deployer] = await ethers.getSigners();
    const deployerNonce = await registry.getSyncNonce(deployer.address);
    console.log("✅ Can read contract state (deployer sync nonce:", deployerNonce.toString() + ")");

    // Check 5: Block explorer link
    console.log("\n[5/6] Block Explorer Link:");
    const chainId = network.chainId.toString();
    let explorerUrl = "";
    
    if (chainId === "421614") {
      explorerUrl = `https://sepolia.arbiscan.io/address/${REGISTRY_EVVM}`;
    } else if (chainId === "11155111") {
      explorerUrl = `https://sepolia.etherscan.io/address/${REGISTRY_EVVM}`;
    } else {
      explorerUrl = `Chain ID ${chainId} - check your network's block explorer`;
    }
    
    console.log("   " + explorerUrl);

    // Check 6: Recent transactions
    console.log("\n[6/6] Checking recent activity...");
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("✅ Current block:", blockNumber);
    console.log("   View transactions on block explorer above");

    console.log("\n=== ✅ Contract Verification Complete ===");
    console.log("\nContract is LIVE and functioning!");
    console.log("\nNext steps:");
    console.log("1. Verify source code on block explorer");
    console.log("2. Authorize gateway addresses");
    console.log("3. Test recording telemetry");
    console.log("4. Update your application configuration\n");

  } catch (error) {
    console.error("\n❌ Error verifying contract:");
    console.error(error.message);
    
    if (error.message.includes("network")) {
      console.error("\nTip: Make sure you're connected to the correct network");
      console.error("Current network:", NETWORK);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

