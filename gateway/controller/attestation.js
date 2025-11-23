require('dotenv').config();
const { ethers } = require('ethers');
const { getRegistryContract } = require('../contract');
const { getAttestationResult, verifyShipmentIntegrity } = require('../symbiotic');

let provider = null;
let attestationStore = null;

/**
 * Initialize attestation controller
 */
function initAttestationController(config) {
  provider = config.provider;
  attestationStore = config.attestationStore;
}

/**
 * Get attestation task result
 */
async function getAttestation(req, res) {
  try {
    const { taskId } = req.params;

    // Validate taskId format (should be hex string)
    if (!/^0x[a-fA-F0-9]{64}$/.test(taskId)) {
      return res.status(400).json({
        error: 'Invalid taskId format (expected 0x-prefixed 64-char hex)',
      });
    }

    const result = await getAttestationResult(taskId);

    res.json({
      taskId,
      ...result,
    });
  } catch (error) {
    console.error('Attestation lookup error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Get all attestations for a shipment
 */
async function getShipmentAttestations(req, res) {
  try {
    const { shipmentKey } = req.params;

    // Validate shipmentKey format
    if (!/^0x[a-fA-F0-9]{64}$/.test(shipmentKey)) {
      return res.status(400).json({
        error: 'Invalid shipmentKey format',
      });
    }

    // Get on-chain record to verify shipment exists
    const contract = getRegistryContract(provider);
    const record = await contract.records(shipmentKey);

    // Check if record exists
    if (record.gateway === ethers.ZeroAddress) {
      return res.status(404).json({
        error: 'Shipment not found',
      });
    }

    // Get stored attestation tasks for this shipment
    const tasks = attestationStore.get(shipmentKey) || [];

    // Optionally fetch status for each task
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        try {
          const result = await getAttestationResult(task.taskId);
          return {
            ...task,
            status: result.completed ? 'completed' : 'pending',
            result: result.completed ? result.result : null,
            timestamp: result.timestamp || task.createdAt,
          };
        } catch (error) {
          return {
            ...task,
            status: 'pending',
            error: error.message,
          };
        }
      })
    );

    res.json({
      shipmentKey,
      cid: record.cid,
      merkleRoot: record.merkleRoot,
      tasks: tasksWithStatus,
      count: tasksWithStatus.length,
    });
  } catch (error) {
    console.error('Attestation lookup error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Manually trigger verification
 */
async function verifyShipment(req, res) {
  try {
    const { cid, merkleRoot, shipmentKey, tempMin, tempMax } = req.body;

    if (!cid || !merkleRoot || !shipmentKey) {
      return res.status(400).json({
        error: 'Missing required fields: cid, merkleRoot, shipmentKey',
      });
    }

    const result = await verifyShipmentIntegrity({
      cid,
      merkleRoot,
      shipmentKey,
      tempMin: tempMin || -2000,
      tempMax: tempMax || 800,
    });

    res.json(result);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  initAttestationController,
  getAttestation,
  getShipmentAttestations,
  verifyShipment,
};

