const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer, gateway] = await ethers.getSigners();

  // === CONFIG: paste addresses printed by deploy-local
  const REGISTRY = process.env.REGISTRY; // set env var or replace below

  if(!REGISTRY) {
    console.error("Set REGISTRY env var to the deployed ShipmentRegistry address.");
    process.exit(1);
  }

  const registry = await ethers.getContractAt("ShipmentRegistry", REGISTRY);

  // sample identifiers (strings)
  const shipmentId = "SHIPMENT-001";
  const batchId = "BATCH-0001";

  // compute shipmentKey = keccak256(abi.encodePacked(shipmentId, batchId))
  const shipmentKey = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["string","string"], [shipmentId, batchId])
  );

  // For demo: a pseudo merkle root (in real life you compute merkle root of sample leaves)
  const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sample-merkle-root"));

  // Sample CID pointing to IPFS/Filecoin payload (for now a fake CID)
  const cid = "bafybeibackupcidexample000000000000000000000000";

  // IoT device data
  // Temperature: 25.00°C (scaled by 100 = 2500)
  const temperature = 2500;
  // Humidity: 65.00% (scaled by 100 = 6500)
  const humidity = 6500;
  // RFID tag identifier
  const rfidTag = "RFID-001-ABC123";

  console.log("Using shipmentKey:", shipmentKey);
  console.log("merkleRoot:", merkleRoot);
  console.log("cid:", cid);
  console.log("temperature:", temperature, "(25.00°C)");
  console.log("humidity:", humidity, "(65.00%)");
  console.log("rfidTag:", rfidTag);

  // Connect as gateway signer (second signer)
  const regAsGateway = registry.connect(gateway);

  // call recordTelemetry with IoT data
  const tx = await regAsGateway.recordTelemetry(
    shipmentKey,
    merkleRoot,
    cid,
    temperature,
    humidity,
    rfidTag
  );
  const receipt = await tx.wait();

  console.log("Telemetry recorded. TxHash:", receipt.transactionHash);

  // Print events
  for (const ev of receipt.events) {
    try {
      console.log("Event:", ev.event, ev.args);
    } catch (e) {}
  }
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});


