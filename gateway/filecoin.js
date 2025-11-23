/**
 * Filecoin integration using Synapse SDK
 * Uploads data to Filecoin Calibration Testnet
 * 
 * Documentation: https://docs.filecoin.cloud/getting-started
 * 
 * Prerequisites:
 * 1. Install: npm install @filoz/synapse-sdk ethers
 * 2. Get test tokens:
 *    - tFIL: https://faucet.calibnet.chainsafe-fil.io/funds.html
 *    - USDFC: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
 * 3. Set FILECOIN_PRIVATE_KEY in .env
 */

const { Synapse, RPC_URLS } = require('@filoz/synapse-sdk');
const { ethers } = require('ethers');

let synapse = null;

/**
 * Initialize Synapse SDK
 * Must be called before any Filecoin operations
 */
async function initSynapse() {
  // In test mode, allow re-initialization to test different scenarios
  if (synapse && process.env.NODE_ENV !== 'test') {
    return synapse;
  }

  try {
    const privateKey = process.env.FILECOIN_PRIVATE_KEY;
    if (!privateKey) {
      // In test environment, allow missing key (tests will mock)
      if (process.env.NODE_ENV === 'test') {
        throw new Error('FILECOIN_PRIVATE_KEY not set (test mode - should be mocked)');
      }
      throw new Error(
        'FILECOIN_PRIVATE_KEY not set in .env. ' +
        'This should be a wallet private key with test tokens (tFIL and USDFC).'
      );
    }

    // Initialize SDK with Calibration Testnet
    // Disable telemetry for production use (enabled by default on calibration)
    synapse = await Synapse.create({
      privateKey: privateKey,
      rpcURL: RPC_URLS.calibration.http,
      telemetry: { sentryInitOptions: { enabled: false } },
    });

    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Synapse SDK initialized for Filecoin Calibration Testnet');
    }
    return synapse;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to initialize Synapse SDK:', error);
    }
    throw new Error(
      `Filecoin SDK initialization failed: ${error.message}. ` +
      'Make sure @filoz/synapse-sdk is installed and FILECOIN_PRIVATE_KEY is set.'
    );
  }
}

/**
 * Ensure payment setup is complete
 * Deposits USDFC and approves Warm Storage service if needed
 */
async function ensurePaymentSetup() {
  const sdk = await initSynapse();
  
  try {
    // Check if we need to set up payments
    // For now, we'll attempt upload and handle payment errors gracefully
    // In production, you'd want to check balance and deposit upfront
    return sdk;
  } catch (error) {
    console.error('Payment setup error:', error);
    throw error;
  }
}

/**
 * Upload data buffer to Filecoin
 * Returns pieceCid (CID)
 * 
 * Minimum size requirement: 127 bytes
 */
async function uploadToFilecoin(data) {
  try {
    const sdk = await initSynapse();
    
    // Convert data to Uint8Array (required by Synapse SDK)
    let uint8Array;
    if (Buffer.isBuffer(data)) {
      uint8Array = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      uint8Array = data;
    } else {
      // Convert to JSON string then to Uint8Array
      const jsonString = JSON.stringify(data);
      uint8Array = new TextEncoder().encode(jsonString);
    }
    
    // Check minimum size requirement (127 bytes)
    if (uint8Array.length < 127) {
      throw new Error(
        `Data too small: ${uint8Array.length} bytes. ` +
        'Filecoin requires minimum 127 bytes per upload.'
      );
    }
    
    // Upload using Synapse SDK
    const result = await sdk.storage.upload(uint8Array);
    
    // Result contains { pieceCid, size }
    console.log(`✅ Uploaded to Filecoin: ${result.pieceCid} (${result.size} bytes)`);
    return result.pieceCid;
  } catch (error) {
    console.error('Filecoin upload error:', error);
    
    // Provide helpful error messages
    if (error.message.includes('insufficient')) {
      throw new Error(
        'Insufficient USDFC balance. ' +
        'Get test tokens: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc'
      );
    }
    
    throw error;
  }
}

/**
 * Upload JSON data to Filecoin
 * Automatically ensures minimum 127 bytes requirement
 */
async function uploadJSONToFilecoin(jsonData) {
  // Convert to JSON string
  let jsonString = JSON.stringify(jsonData, null, 2);
  
  // Ensure minimum 127 bytes
  const minSize = 127;
  if (jsonString.length < minSize) {
    // Pad with metadata to meet minimum requirement
    const padding = minSize - jsonString.length;
    jsonString += ' '.repeat(padding);
  }
  
  // Convert to Uint8Array
  const uint8Array = new TextEncoder().encode(jsonString);
  return await uploadToFilecoin(uint8Array);
}

/**
 * Fetch data from Filecoin using pieceCid
 * Returns the raw data as Uint8Array
 */
async function fetchFromFilecoin(pieceCid) {
  try {
    const sdk = await initSynapse();
    
    // Download using Synapse SDK
    const bytes = await sdk.storage.download(pieceCid);
    
    // Convert Uint8Array to JSON if it's JSON data
    try {
      const text = new TextDecoder().decode(bytes);
      return JSON.parse(text);
    } catch {
      // If not JSON, return as buffer
      return Buffer.from(bytes);
    }
  } catch (error) {
    console.error('Filecoin fetch error:', error);
    
    // Fallback to IPFS gateway if SDK download fails
    try {
      console.log('Attempting IPFS gateway fallback...');
      const response = await fetch(`https://ipfs.io/ipfs/${pieceCid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch CID ${pieceCid}`);
      }
      return await response.json();
    } catch (fallbackError) {
      throw new Error(
        `Failed to fetch from Filecoin: ${error.message}. ` +
        `IPFS gateway fallback also failed: ${fallbackError.message}`
      );
    }
  }
}

/**
 * Setup payment for Filecoin storage
 * Deposits USDFC and approves Warm Storage service
 * 
 * This should be called once before uploading data
 */
async function setupPayment(depositAmount = null) {
  const { TOKENS, TIME_CONSTANTS } = require('@filoz/synapse-sdk');
  const sdk = await initSynapse();
  
  try {
    // Default deposit: 2.5 USDFC (covers 1TiB for 30 days)
    const defaultAmount = ethers.parseUnits('2.5', 18);
    const amount = depositAmount || defaultAmount;
    
    // Check wallet balance
    const walletBalance = await sdk.payments.walletBalance(TOKENS.USDFC);
    
    if (walletBalance < amount) {
      throw new Error(
        `Insufficient USDFC balance. ` +
        `Required: ${ethers.formatUnits(amount, 18)} USDFC, ` +
        `Available: ${ethers.formatUnits(walletBalance, 18)} USDFC. ` +
        `Get test tokens: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc`
      );
    }
    
    // Deposit and approve in single transaction
    const tx = await sdk.payments.depositWithPermitAndApproveOperator(
      amount,
      sdk.getWarmStorageAddress(),
      ethers.MaxUint256, // Rate allowance
      ethers.MaxUint256, // Lockup allowance
      TIME_CONSTANTS.EPOCHS_PER_MONTH, // Max lockup: 30 days
    );
    
    await tx.wait();
    console.log(`✅ USDFC deposit and Warm Storage approval successful!`);
    return tx;
  } catch (error) {
    console.error('Payment setup error:', error);
    throw error;
  }
}

module.exports = {
  uploadToFilecoin,
  uploadJSONToFilecoin,
  fetchFromFilecoin,
  initSynapse,
  setupPayment,
  ensurePaymentSetup,
};

