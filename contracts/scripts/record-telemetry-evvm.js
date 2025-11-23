const hre = require("hardhat");
const { ethers } = hre;

/**
 * Helper function to create EIP-712 signature for recordTelemetry
 */
async function createSignature(
  signer,
  contractAddress,
  domainSeparator,
  shipmentKey,
  merkleRoot,
  cid,
  temperature,
  humidity,
  rfidTag,
  nonce,
  isAsync
) {
  // EIP-712 type hash (must match contract)
  const RECORD_TELEMETRY_TYPEHASH = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(
      "RecordTelemetry(bytes32 shipmentKey,bytes32 merkleRoot,string cid,int256 temperature,uint256 humidity,string rfidTag,uint256 nonce,bool isAsync)"
    )
  );

  // Create struct hash
  const structHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "bytes32", "int256", "uint256", "bytes32", "uint256", "bool"],
      [
        RECORD_TELEMETRY_TYPEHASH,
        shipmentKey,
        merkleRoot,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(cid)),
        temperature,
        humidity,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(rfidTag)),
        nonce,
        isAsync
      ]
    )
  );

  // Use _signTypedData for proper EIP-712 signing
  // This matches the contract's EIP-712 domain and type structure
  const network = await signer.provider.getNetwork();
  const signature = await signer._signTypedData(
    {
      name: "ShipmentRegistryEVVM",
      version: "1",
      chainId: network.chainId,
      verifyingContract: contractAddress
    },
    {
      RecordTelemetry: [
        { name: "shipmentKey", type: "bytes32" },
        { name: "merkleRoot", type: "bytes32" },
        { name: "cid", type: "string" },
        { name: "temperature", type: "int256" },
        { name: "humidity", type: "uint256" },
        { name: "rfidTag", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "isAsync", type: "bool" }
      ]
    },
    {
      shipmentKey,
      merkleRoot,
      cid,
      temperature,
      humidity,
      rfidTag,
      nonce,
      isAsync
    }
  );
  const sig = ethers.utils.splitSignature(signature);

  return {
    v: sig.v,
    r: sig.r,
    s: sig.s
  };
}

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const gateway = signers[1] || signers[0]; // Use deployer as gateway if only one signer

  // === CONFIG: paste addresses printed by deploy-evvm
  const REGISTRY_EVVM = process.env.REGISTRY_EVVM;

  if (!REGISTRY_EVVM) {
    console.error("Set REGISTRY_EVVM env var to the deployed ShipmentRegistryEVVM address.");
    process.exit(1);
  }

  const registry = await ethers.getContractAt("ShipmentRegistryEVVM", REGISTRY_EVVM);

  // Get domain separator
  const domainSeparator = await registry.getDomainSeparator();

  // Sample identifiers (strings)
  const shipmentId = "SHIPMENT-EVVM-001";
  const batchId = "BATCH-0001";

  // Compute shipmentKey = keccak256(abi.encodePacked(shipmentId, batchId))
  const shipmentKey = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["string", "string"], [shipmentId, batchId])
  );

  // For demo: a pseudo merkle root
  const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-merkle-root"));

  // Sample CID pointing to IPFS/Filecoin payload
  const cid = "bafybeievvmbackupcidexample000000000000000000000";

  // IoT device data
  const temperature = 2550; // 25.50°C
  const humidity = 7025; // 70.25%
  const rfidTag = "RFID-EVVM-001-ABC123";

  // Get current nonce (using sync nonce for this example)
  const isAsync = false;
  const nonce = await registry.getSyncNonce(gateway.address);
  console.log("Using nonce:", nonce.toString());

  console.log("Creating signature with:");
  console.log("  shipmentKey:", shipmentKey);
  console.log("  merkleRoot:", merkleRoot);
  console.log("  cid:", cid);
  console.log("  temperature:", temperature, "(25.50°C)");
  console.log("  humidity:", humidity, "(70.25%)");
  console.log("  rfidTag:", rfidTag);
  console.log("  nonce:", nonce.toString());
  console.log("  isAsync:", isAsync);

  // Create signature
  const sig = await createSignature(
    gateway,
    REGISTRY_EVVM,
    domainSeparator,
    shipmentKey,
    merkleRoot,
    cid,
    temperature,
    humidity,
    rfidTag,
    nonce,
    isAsync
  );

  console.log("\nSignature created:");
  console.log("  v:", sig.v);
  console.log("  r:", sig.r);
  console.log("  s:", sig.s);

  // Call recordTelemetryWithSignature (can be called by anyone, e.g., a fisher in EVVM)
  console.log("\nRecording telemetry with signature...");
  const tx = await registry.recordTelemetryWithSignature(
    shipmentKey,
    merkleRoot,
    cid,
    temperature,
    humidity,
    rfidTag,
    nonce,
    isAsync,
    sig.v,
    sig.r,
    sig.s
  );
  const receipt = await tx.wait();

  console.log("Telemetry recorded. TxHash:", receipt.transactionHash);

  // Verify the record
  const rec = await registry.records(shipmentKey);
  console.log("\nRecorded data:");
  console.log("  Gateway:", rec.gateway);
  console.log("  Temperature:", rec.temperature.toString());
  console.log("  Humidity:", rec.humidity.toString());
  console.log("  RFID Tag:", rec.rfidTag);
  console.log("  Timestamp:", rec.timestamp.toString());

  // Check updated nonce
  const newNonce = await registry.getSyncNonce(gateway.address);
  console.log("  New sync nonce:", newNonce.toString());
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

