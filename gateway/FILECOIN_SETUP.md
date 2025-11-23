# Filecoin Integration Setup Guide

This guide walks you through setting up Filecoin storage using the Synapse SDK.

## Prerequisites

1. **Node.js 20+** installed
2. **Wallet with test tokens** on Filecoin Calibration Testnet

## Step 1: Install Dependencies

The Synapse SDK is already included in `package.json`. Install it:

```bash
npm install
```

This installs:
- `@filoz/synapse-sdk` - Filecoin storage SDK
- `ethers` - Blockchain interaction library

## Step 2: Get Test Tokens

You need two types of tokens for Filecoin Calibration Testnet:

### tFIL (for gas fees)
1. Visit: https://faucet.calibnet.chainsafe-fil.io/funds.html
2. Enter your wallet address
3. Request tFIL tokens

### USDFC (for storage payments)
1. Visit: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
2. Enter your wallet address
3. Request USDFC tokens

**Recommended amounts:**
- **tFIL**: 0.1 tFIL (for gas fees)
- **USDFC**: 2.5 USDFC (covers ~1TiB storage for 30 days)

## Step 3: Configure Environment

Add your Filecoin wallet private key to `.env`:

```env
FILECOIN_PRIVATE_KEY=0xyour_private_key_here
```

**⚠️ Security Note**: Never commit your private key to git!

## Step 4: Setup Payment (One-Time)

Before uploading data, you need to deposit USDFC and approve the Warm Storage service:

```javascript
const { setupPayment } = require('./filecoin');

async function setup() {
  try {
    await setupPayment(); // Deposits 2.5 USDFC and approves service
    console.log('✅ Payment setup complete!');
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

setup();
```

Or run via Node:

```bash
node -e "require('./filecoin').setupPayment().then(() => console.log('✅ Done')).catch(console.error)"
```

## Step 5: Test Upload

Test the Filecoin integration:

```javascript
const { uploadJSONToFilecoin, fetchFromFilecoin } = require('./filecoin');

async function test() {
  const testData = {
    message: 'Hello Filecoin!',
    timestamp: Date.now(),
  };
  
  // Upload
  const cid = await uploadJSONToFilecoin(testData);
  console.log('Uploaded CID:', cid);
  
  // Download
  const retrieved = await fetchFromFilecoin(cid);
  console.log('Retrieved data:', retrieved);
}

test();
```

## How It Works

### Upload Flow

1. **Initialize SDK**: Creates Synapse instance with your private key
2. **Convert Data**: Converts JSON to Uint8Array (minimum 127 bytes)
3. **Upload**: Uses `synapse.storage.upload()` which:
   - Automatically selects a storage provider
   - Creates a data set if needed
   - Returns `pieceCid` (content identifier)
4. **Return CID**: Returns the CID for on-chain storage

### Download Flow

1. **Initialize SDK**: Reuses existing Synapse instance
2. **Download**: Uses `synapse.storage.download(pieceCid)`
3. **Parse**: Converts Uint8Array back to JSON
4. **Return**: Returns the original data

## Minimum Size Requirement

Filecoin requires **minimum 127 bytes** per upload. The gateway automatically:
- Checks data size
- Pads JSON data if needed
- Throws error if data is too small after padding

## Error Handling

Common errors and solutions:

### "FILECOIN_PRIVATE_KEY not set"
- Add `FILECOIN_PRIVATE_KEY` to `.env`

### "Insufficient USDFC balance"
- Get USDFC from faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
- Run `setupPayment()` to deposit

### "Insufficient tFIL balance"
- Get tFIL from faucet: https://faucet.calibnet.chainsafe-fil.io/funds.html

### "Data too small: X bytes"
- Minimum 127 bytes required
- Gateway automatically pads JSON, but raw data must meet requirement

## Integration with Gateway

The gateway automatically:
1. Uploads batch data to Filecoin when batch is ready
2. Stores the CID in the contract
3. Retrieves data when requested via `/shipment/:shipmentKey`

No manual intervention needed once payment is set up!

## Resources

- **Synapse SDK Docs**: https://docs.filecoin.cloud/getting-started
- **Calibration Testnet**: https://chainlist.org/chain/314159
- **Example App**: https://github.com/FIL-Builders/fs-upload-dapp

## Troubleshooting

### SDK not found
```bash
npm install @filoz/synapse-sdk ethers
```

### Payment errors
- Check wallet has USDFC balance
- Ensure you've run `setupPayment()` at least once
- Verify network is Calibration Testnet

### Upload fails
- Check minimum size (127 bytes)
- Verify payment setup is complete
- Check network connectivity

