require('dotenv').config();
const { ethers } = require('ethers');
const { getRegistryContract } = require('../contract');
const { fetchFromFilecoin } = require('../filecoin');

let provider = null;
let attestationStore = null;

/**
 * Initialize shipment controller
 */
function initShipmentController(config) {
  provider = config.provider;
  attestationStore = config.attestationStore;
}

/**
 * Get shipment data
 */
async function getShipment(req, res) {
  try {
    const { shipmentKey } = req.params;

    // Validate shipmentKey format (should be hex string)
    if (!/^0x[a-fA-F0-9]{64}$/.test(shipmentKey)) {
      return res.status(400).json({
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
};

module.exports = {
  initShipmentController,
  getShipment,
};

