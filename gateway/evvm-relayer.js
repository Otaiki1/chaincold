/**
 * EVVM Fisher/Relayer Script
 * 
 * This script demonstrates how RealTrack uses EVVM's Mate Metaprotocol to execute
 * gasless / async shipment recordings via a Fisher/Executor flow.
 * 
 * Flow:
 * 1. Gateway produces signed messages (EIP-712 signatures)
 * 2. Messages are stored in EVVM (Mate Metaprotocol on Sepolia)
 * 3. EVVM Fisher/Executor reads messages from EVVM
 * 4. Fisher uses async nonces to ensure no replay
 * 5. Fisher submits real tx to ShipmentRegistryEVVM contract
 * 
 * EVVM Integration:
 * - Uses Mate Metaprotocol (EVVM ID 2) on Sepolia
 * - Reads signed messages from EVVM storage/queue
 * - Uses asyncNonce for queue-able, gasless transactions
 * 
 * Documentation: https://docs.evvm.network/
 */

const { ethers } = require('ethers');
const {
  getRegistryContract,
  getCurrentNonce,
  submitTelemetryWithSignature,
} = require('./contract');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const EVVM_RPC_URL = process.env.EVVM_RPC_URL || 'https://rpc.sepolia.org'; // Mate on Sepolia
const CONTRACT_ADDRESS = process.env.REGISTRY_EVVM || '0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C';
const FISHER_PRIVATE_KEY = process.env.FISHER_PRIVATE_KEY; // Fisher's wallet (pays gas)

// EVVM Mate Metaprotocol configuration
const EVVM_ID = 2; // Mate Metaprotocol
const MATE_STAKING_ADDRESS = process.env.MATE_STAKING_ADDRESS || '0x...'; // Mate Staking contract
const MATE_NAMESERVICE_ADDRESS = process.env.MATE_NAMESERVICE_ADDRESS || '0x...'; // Mate NameService

/**
 * Signed message structure stored in EVVM
 * @typedef {Object} SignedTelemetryMessage
 * @property {string} shipmentKey
 * @property {string} merkleRoot
 * @property {string} cid
 * @property {number} temperature
 * @property {number} humidity
 * @property {string} rfidTag
 * @property {number} nonce
 * @property {boolean} isAsync
 * @property {Object} signature
 * @property {number} signature.v
 * @property {string} signature.r
 * @property {string} signature.s
 * @property {string} gatewayAddress
 * @property {number} timestamp
 */

/**
 * In-memory queue for signed messages
 * In production, this would read from EVVM storage/events
 */
const messageQueue = [];

/**
 * Simulate reading signed messages from EVVM Mate Metaprotocol
 * In production, this would:
 * 1. Listen to EVVM events for new signed messages
 * 2. Read from EVVM storage (via Mate NameService)
 * 3. Query EVVM queue via Mate P2P Swap
 */
async function readMessagesFromEVVM() {
  // TODO: Implement actual EVVM integration
  // Example pattern:
  // const evvmProvider = new ethers.JsonRpcProvider(EVVM_RPC_URL);
  // const mateContract = new ethers.Contract(MATE_STAKING_ADDRESS, MATE_ABI, evvmProvider);
  // const messages = await mateContract.getPendingMessages(CONTRACT_ADDRESS);
  // return messages;
  
  // For now, return messages from in-memory queue
  return messageQueue.splice(0, messageQueue.length);
}

/**
 * Add a signed message to the EVVM queue
 * This would typically be called by the gateway after creating a signature
 */
function addMessageToEVVM(message) {
  messageQueue.push({
    ...message,
    timestamp: Date.now(),
  });
  console.log(`📨 Added message to EVVM queue: ${message.shipmentKey.slice(0, 16)}...`);
}

/**
 * Verify async nonce is valid before submitting
 */
async function verifyAsyncNonce(provider, gatewayAddress, expectedNonce) {
  const contract = getRegistryContract(provider);
  const currentAsyncNonce = await contract.getAsyncNonce(gatewayAddress);
  return Number(currentAsyncNonce) === expectedNonce;
}

/**
 * Process a single signed message from EVVM
 */
async function processMessage(message, fisherSigner, provider) {
  try {
    console.log(`\n🔄 Processing message for shipment: ${message.shipmentKey.slice(0, 16)}...`);
    
    // Verify async nonce matches current contract state
    const nonceValid = await verifyAsyncNonce(provider, message.gatewayAddress, message.nonce);
    if (!nonceValid) {
      const currentNonce = await getCurrentNonce(provider, message.gatewayAddress, true);
      throw new Error(
        `Nonce mismatch: expected ${message.nonce}, contract has ${currentNonce}. ` +
        `Message may have been processed already or is out of order.`
      );
    }

    console.log(`✅ Async nonce verified: ${message.nonce}`);

    // Submit transaction using Fisher's wallet (Fisher pays gas)
    console.log(`📤 Submitting transaction to contract...`);
    const tx = await submitTelemetryWithSignature(
      fisherSigner,
      message.shipmentKey,
      message.merkleRoot,
      message.cid,
      message.temperature,
      message.humidity,
      message.rfidTag,
      message.nonce,
      message.isAsync, // true for async operations
      message.signature
    );

    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed: ${tx.hash} (block: ${receipt.blockNumber})`);

    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      shipmentKey: message.shipmentKey,
    };
  } catch (error) {
    console.error(`❌ Failed to process message:`, error.message);
    return {
      success: false,
      error: error.message,
      shipmentKey: message.shipmentKey,
    };
  }
}

/**
 * Main Fisher/Executor loop
 * Polls EVVM for new messages and processes them
 */
async function runFisher() {
  if (!FISHER_PRIVATE_KEY) {
    console.error('❌ FISHER_PRIVATE_KEY not set');
    console.error('Set FISHER_PRIVATE_KEY in .env to run the Fisher');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const fisherSigner = new ethers.Wallet(FISHER_PRIVATE_KEY, provider);

  console.log('🚀 EVVM Fisher/Relayer started');
  console.log(`Fisher address: ${fisherSigner.address}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`EVVM ID: ${EVVM_ID} (Mate Metaprotocol)`);
  console.log(`Network: ${await provider.getNetwork().then(n => n.name)}`);
  console.log('\n📡 Listening for signed messages from EVVM...\n');

  const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000'); // 5 seconds

  while (true) {
    try {
      // Read messages from EVVM
      const messages = await readMessagesFromEVVM();

      if (messages.length > 0) {
        console.log(`📬 Found ${messages.length} message(s) in EVVM queue`);
      }

      // Process each message
      for (const message of messages) {
        await processMessage(message, fisherSigner, provider);
        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      console.error('❌ Fisher loop error:', error);
      // Continue running even if one iteration fails
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

/**
 * Submit a test message (for testing/demo)
 */
async function submitTestMessage(messageData) {
  addMessageToEVVM(messageData);
  console.log('✅ Test message added to EVVM queue');
}

// Export functions
module.exports = {
  runFisher,
  addMessageToEVVM,
  readMessagesFromEVVM,
  processMessage,
  verifyAsyncNonce,
};

// Run Fisher if executed directly
if (require.main === module) {
  runFisher().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

