require('dotenv').config();
const { ethers } = require('ethers');
const TelemetryBatcher = require('../batcher');
const { computeMerkleRoot } = require('../merkle');
const { uploadJSONToFilecoin } = require('../filecoin');
const { createSignature, computeShipmentKey } = require('../signer');
const {
  getCurrentNonce,
  getDomainSeparator,
  submitTelemetryWithSignature,
} = require('../contract');
const {
  createShipmentAttestations,
} = require('../symbiotic');
const { addMessageToEVVM } = require('../evvm-relayer');

// Initialize batcher (shared instance)
let batcher = null;
let signer = null;
let provider = null;
let attestationStore = null;

/**
 * Initialize telemetry controller
 */
function initTelemetryController(config) {
  batcher = config.batcher;
  signer = config.signer;
  provider = config.provider;
  attestationStore = config.attestationStore;
}

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
    const useEVVM = process.env.USE_EVVM === 'true';
    const isAsync = useEVVM;
    const nonce = await getCurrentNonce(provider, signer.address, isAsync);
    const nonceNumber = Number(nonce);
    console.log(`Current ${isAsync ? 'async' : 'sync'} nonce: ${nonceNumber}`);

    // 4. Get domain separator
    const domainSeparator = await getDomainSeparator(provider);

    // 5. Compute average temperature and humidity for this batch
    const avgTemp = Math.round(
      batch.reduce((sum, s) => sum + s.temperature, 0) / batch.length
    );
    const avgHumidity = Math.round(
      batch.reduce((sum, s) => sum + s.humidity, 0) / batch.length
    );

    // Use first sample's RFID tag
    const rfidTag = batch[0].rfidTag || '';

    // 6. Create EIP-712 signature
    const CONTRACT_ADDRESS =
      process.env.REGISTRY_EVVM || '0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C';
    
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

    // 7. Submit to contract or queue for EVVM Fisher
    let txHash = null;
    if (useEVVM) {
      console.log('📨 EVVM mode: Adding signed message to EVVM queue for Fisher/Executor');
      addMessageToEVVM({
        shipmentKey,
        merkleRoot,
        cid,
        temperature: avgTemp,
        humidity: avgHumidity,
        rfidTag,
        nonce: nonceNumber,
        isAsync: true,
        signature,
        gatewayAddress: signer.address,
      });
      console.log('✅ Message queued for EVVM Fisher/Executor (gasless transaction)');
    } else {
      // Direct mode: Gateway submits transaction itself
      const tx = await submitTelemetryWithSignature(
        signer,
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
      txHash = tx.hash;
    }

    // 8. Create Symbiotic Relay attestation tasks
    let attestations = null;
    try {
      const tempMin = parseInt(process.env.TEMP_MIN || '-2000');
      const tempMax = parseInt(process.env.TEMP_MAX || '800');
      
      attestations = await createShipmentAttestations({
        signer,
        cid,
        merkleRoot,
        shipmentKey,
        temperature: avgTemp,
        humidity: avgHumidity,
        tempMin,
        tempMax,
      });
      
      // Store attestation task IDs for later querying
      if (attestations && attestations.tasks) {
        attestationStore.set(shipmentKey, attestations.tasks);
      }
      
      console.log(`✅ Created ${attestations.tasks.length} Symbiotic attestation tasks`);
    } catch (error) {
      console.error('⚠️  Failed to create Symbiotic attestations:', error.message);
    }

    return {
      cid,
      merkleRoot,
      txHash,
      nonce: nonceNumber,
      attestations,
    };
  } catch (error) {
    console.error('Batch processing error:', error);
    throw error;
  }
}

/**
 * Handle telemetry POST request
 */
async function receiveTelemetry(req, res) {
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
      temperature: Math.round(temperature * 100),
      humidity: Math.round(humidity * 100),
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
};

/**
 * Get batch status
 */
function getBatchStatus(req, res) {
  try {
    const { shipmentKey } = req.params;
    const batch = batcher.getBatch(shipmentKey);

    res.json({
      shipmentKey,
      batchSize: batch.length,
      samples: batch,
    });
  } catch (error) {
    console.error('Batch status error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  initTelemetryController,
  receiveTelemetry,
  getBatchStatus,
};

