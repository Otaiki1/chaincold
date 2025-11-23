require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const TelemetryBatcher = require('./batcher');
const { loadWallet } = require('./encryptKey');
const { initSymbiotic } = require('./symbiotic');

// Import routes
const telemetryRoutes = require('./routes/telemetry');
const shipmentRoutes = require('./routes/shipment');
const attestationRoutes = require('./routes/attestation');

// Import controllers for initialization
const telemetryController = require('./controller/telemetry');
const shipmentController = require('./controller/shipment');
const attestationController = require('./controller/attestation');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize provider
const RPC_URL = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Initialize signer (gateway private key)
let signer = null;
let gatewayAddress = null;

async function initializeGateway() {
  try {
    // Try to load from encrypted key, fallback to plain private key
    signer = await loadWallet(provider);
    gatewayAddress = signer.address;
    console.log(`✅ Gateway initialized: ${gatewayAddress}`);
  } catch (error) {
    console.error('ERROR: Failed to initialize gateway:', error.message);
    console.error('Make sure GATEWAY_PRIVATE_KEY is set in .env');
    console.error('Or run: node encryptKey.js to encrypt your key');
    process.exit(1);
  }
}

// Initialize Symbiotic Relay (optional - will warn if not configured)
initSymbiotic(provider);

// Initialize batcher
const batcher = new TelemetryBatcher({
  batchSize: parseInt(process.env.BATCH_SIZE || '10'),
  batchTimeout: parseInt(process.env.BATCH_TIMEOUT || '30000'),
});

// Contract address
const CONTRACT_ADDRESS =
  process.env.REGISTRY_EVVM || '0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C';

// In-memory store for attestation task IDs (in production, use a database)
const attestationStore = new Map();

// Initialize controllers with shared dependencies
telemetryController.initTelemetryController({
  batcher,
  signer: null, // Will be set after async initialization
  provider,
  attestationStore,
});

shipmentController.initShipmentController({
  provider,
  attestationStore,
});

attestationController.initAttestationController({
  provider,
  attestationStore,
});

// Routes
app.use('/telemetry', telemetryRoutes);
app.use('/shipment', shipmentRoutes);
app.use('/attestation', attestationRoutes);
// POST /verify endpoint (manual verification)
app.post('/verify', attestationController.verifyShipment);

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gateway: gatewayAddress || 'not initialized',
    contract: CONTRACT_ADDRESS,
    network: provider.network?.name || 'unknown',
    batches: batcher.batches.size,
    symbioticEnabled: !!process.env.SYMBIOTIC_RELAY_ADDRESS,
  });
});

// Initialize gateway and start server
async function startServer() {
  await initializeGateway();
  
  // Update telemetry controller with signer
  telemetryController.initTelemetryController({
    batcher,
    signer,
    provider,
    attestationStore,
  });

  const PORT = process.env.PORT || 3001;

  // Only start server if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`🚀 Gateway server running on port ${PORT}`);
      console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
      console.log(`🔑 Gateway: ${gatewayAddress}`);
      console.log(`🌐 Network: ${provider.network?.name || 'unknown'}`);
    });
  }
}

// Start server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Export app for testing
module.exports = app;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, flushing batches...');
  const batches = batcher.flushAll();
  console.log(`Flushed ${batches.length} batches`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, flushing batches...');
  const batches = batcher.flushAll();
  console.log(`Flushed ${batches.length} batches`);
  process.exit(0);
});
