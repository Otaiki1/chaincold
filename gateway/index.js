const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const TelemetryBatcher = require('./batcher');
const { computeMerkleRoot } = require('./merkle');
const { uploadJSONToFilecoin, fetchFromFilecoin } = require('./filecoin');
const { createSignature, computeShipmentKey } = require('./signer');
const {
  getCurrentNonce,
  getDomainSeparator,
  submitTelemetryWithSignature,
  getRegistryContract,
} = require('./contract');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize provider
const RPC_URL = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Initialize signer (gateway private key)
const GATEWAY_PRIVATE_KEY = process.env.GATEWAY_PRIVATE_KEY;
if (!GATEWAY_PRIVATE_KEY) {
  console.error('ERROR: GATEWAY_PRIVATE_KEY not set in .env');
  process.exit(1);
}
const signer = new ethers.Wallet(GATEWAY_PRIVATE_KEY, provider);
const gatewayAddress = signer.address;

console.log(`Gateway initialized: ${gatewayAddress}`);

// Initialize batcher
const batcher = new TelemetryBatcher({
  batchSize: parseInt(process.env.BATCH_SIZE || '10'),
  batchTimeout: parseInt(process.env.BATCH_TIMEOUT || '30000'),
});

// Contract address
const CONTRACT_ADDRESS =
  process.env.REGISTRY_EVVM || '0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C';

/**
 * POST /telemetry
 * Accepts IoT sensor data
 */
app.post('/telemetry', async (req, res) => {
  try {
    const {
      shipmentId,
      batchId,
      temperature,
      humidity,
      rfidTag,
      metadata,
    } = req.body;

    // Validate input
    if (!shipmentId || !batchId) {
      return res.status(400).json({
        error: 'Missing required fields: shipmentId, batchId',
      });
    }

    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: temperature, humidity',
      });
    }

    // Compute shipment key
    const shipmentKey = computeShipmentKey(shipmentId, batchId);

    // Create sample
    const sample = {
      shipmentId,
      batchId,
      temperature: Math.round(temperature * 100), // Scale to match contract (2550 = 25.50°C)
      humidity: Math.round(humidity * 100), // Scale to match contract (7025 = 70.25%)
      rfidTag: rfidTag || '',
      metadata: metadata || {},
      timestamp: Date.now(),
    };

    // Add to batcher
    const batch = batcher.addSample(shipmentKey, sample);

    // If batch is ready, process it
    if (batch) {
      await processBatch(shipmentKey, batch, shipmentId, batchId);
    }

    res.json({
      success: true,
      message: 'Telemetry received',
      shipmentKey,
      batchSize: batcher.getBatch(shipmentKey).length,
    });
  } catch (error) {
    console.error('Telemetry error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Process a batch of telemetry samples
 */
async function processBatch(shipmentKey, batch, shipmentId, batchId) {
  try {
    console.log(`Processing batch for ${shipmentKey} (${batch.length} samples)`);

    // 1. Upload batch to Filecoin
    const cid = await uploadJSONToFilecoin(batch);
    console.log(`Uploaded to Filecoin: ${cid}`);

    // 2. Compute Merkle root from batch
    const merkleRoot = computeMerkleRoot(batch);
    console.log(`Computed Merkle root: ${merkleRoot}`);

    // 3. Get current nonce
    const isAsync = false; // Use sync nonce for immediate processing
    const nonce = await getCurrentNonce(provider, gatewayAddress, isAsync);
    const nonceNumber = Number(nonce);
    console.log(`Current nonce: ${nonceNumber}`);

    // 4. Get domain separator
    const domainSeparator = await getDomainSeparator(provider);

    // 5. Compute average temperature and humidity for this batch
    const avgTemp = Math.round(
      batch.reduce((sum, s) => sum + s.temperature, 0) / batch.length
    );
    const avgHumidity = Math.round(
      batch.reduce((sum, s) => sum + s.humidity, 0) / batch.length
    );

    // Use first sample's RFID tag (or combine if needed)
    const rfidTag = batch[0].rfidTag || '';

    // 6. Create EIP-712 signature
    const signature = await createSignature(
      signer,
      CONTRACT_ADDRESS,
      domainSeparator,
      shipmentKey,
      merkleRoot,
      cid,
      avgTemp,
      avgHumidity,
      rfidTag,
      nonceNumber,
      isAsync
    );

    console.log('Signature created');

    // 7. Submit to contract (this can be done by EVVM/Fisher, not the gateway)
    // For demo, we'll submit it ourselves, but in production EVVM would do this
    const tx = await submitTelemetryWithSignature(
      signer, // Use signer for transaction submission
      shipmentKey,
      merkleRoot,
      cid,
      avgTemp,
      avgHumidity,
      rfidTag,
      nonceNumber,
      isAsync,
      signature
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    await tx.wait();
    console.log(`Transaction confirmed: ${tx.hash}`);

    return {
      cid,
      merkleRoot,
      txHash: tx.hash,
      nonce: nonceNumber,
    };
  } catch (error) {
    console.error('Batch processing error:', error);
    throw error;
  }
}

/**
 * GET /shipment/:id
 * Returns processed telemetry, pulled from Filecoin CID + contract
 */
app.get('/shipment/:shipmentKey', async (req, res) => {
  try {
    const { shipmentKey } = req.params;

    // Validate shipmentKey format (should be hex string)
    if (!/^0x[a-fA-F0-9]{64}$/.test(shipmentKey)) {
      return res.status(500).json({
        error: 'Invalid shipmentKey format',
      });
    }

    // Get on-chain record
    const contract = getRegistryContract(provider);
    const record = await contract.records(shipmentKey);

    // Check if record exists
    if (record.gateway === ethers.ZeroAddress) {
      return res.status(404).json({
        error: 'Shipment not found',
      });
    }

    // Fetch batch data from Filecoin
    let batchData = null;
    try {
      batchData = await fetchFromFilecoin(record.cid);
    } catch (error) {
      console.error('Failed to fetch from Filecoin:', error);
      // Continue without batch data
    }

    // Format response
    const response = {
      shipmentKey,
      onChain: {
        gateway: record.gateway,
        merkleRoot: record.merkleRoot,
        cid: record.cid,
        timestamp: Number(record.timestamp),
        temperature: Number(record.temperature) / 100,
        humidity: Number(record.humidity) / 100,
        rfidTag: record.rfidTag,
      },
      batchData, // Full batch from Filecoin
    };

    res.json(response);
  } catch (error) {
    console.error('Shipment lookup error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gateway: gatewayAddress,
    contract: CONTRACT_ADDRESS,
    network: provider.network?.name || 'unknown',
    batches: batcher.batches.size,
  });
});

/**
 * GET /batch/:shipmentKey
 * Get current batch status for a shipment
 */
app.get('/batch/:shipmentKey', (req, res) => {
  const { shipmentKey } = req.params;
  const batch = batcher.getBatch(shipmentKey);

  res.json({
    shipmentKey,
    batchSize: batch.length,
    samples: batch,
  });
});

const PORT = process.env.PORT || 3001;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Gateway server running on port ${PORT}`);
    console.log(`Contract: ${CONTRACT_ADDRESS}`);
    console.log(`Gateway: ${gatewayAddress}`);
  });
}

// Export app for testing
module.exports = app;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, flushing batches...');
  const batches = batcher.flushAll();
  console.log(`Flushed ${batches.length} batches`);
  process.exit(0);
});

