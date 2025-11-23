const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const signers = await hre.ethers.getSigners();
  
  if (signers.length === 0) {
    console.error("\n❌ Error: No signers found!");
    console.error("\nPlease create a .env file with your PRIVATE_KEY:");
    console.error("  PRIVATE_KEY=your_private_key_here");
    console.error("\nOr set it as an environment variable:");
    console.error("  export PRIVATE_KEY=your_private_key_here");
    process.exit(1);
  }
  
  if (signers.length < 2) {
    console.error("\n⚠️  Warning: Only one signer found. Using it for both deployer and gateway.");
  }
  
  const deployer = signers[0];
  const gateway = signers[1] || signers[0]; // Use deployer as gateway if only one signer

  console.log("Deployer:", deployer.address);
  console.log("Gateway (sample):", gateway.address);

  // Deploy ShipmentRegistryEVVM
  const Reg = await hre.ethers.getContractFactory("ShipmentRegistryEVVM");
  const reg = await Reg.deploy();
  await reg.deployed();

  console.log("ShipmentRegistryEVVM:", reg.address);

  // Get domain separator
  const domainSeparator = await reg.getDomainSeparator();
  console.log("Domain Separator:", domainSeparator);

  // Authorize the sample gateway address as an authorized gateway
  const tx = await reg.setGateway(gateway.address, true);
  await tx.wait();

  console.log("Authorized gateway:", gateway.address);

  // Get initial nonces
  const syncNonce = await reg.getSyncNonce(gateway.address);
  const asyncNonce = await reg.getAsyncNonce(gateway.address);
  console.log("Gateway sync nonce:", syncNonce.toString());
  console.log("Gateway async nonce:", asyncNonce.toString());

  console.log("\n=== EVVM Integration Ready ===");
  console.log("REGISTRY_EVVM=", reg.address);
  console.log("DOMAIN_SEPARATOR=", domainSeparator);
  console.log("\nUse recordTelemetryWithSignature for gasless transactions via EVVM");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

