# Cold Chain Gateway Service

Gateway service that receives IoT telemetry data, batches it, uploads to Filecoin, and submits to the blockchain using EVVM signatures.

## Architecture

```
IoT Device → Gateway API → Batcher → Filecoin → Merkle Root → EIP-712 Signature → Contract → Symbiotic Relay Attestations
```

## Features

- **Telemetry Collection**: Receives IoT sensor data via REST API
- **Batching**: Collects samples into batches for efficient processing
- **Filecoin Upload**: Uploads batch data to Filecoin Calibration Testnet
- **Merkle Root Computation**: Computes Merkle root for data integrity
- **EIP-712 Signing**: Creates gasless signatures for EVVM submission
- **Contract Integration**: Submits signed telemetry to ShipmentRegistryEVVM
- **Symbiotic Relay Attestations**: Creates stake-backed attestation tasks for:
  - Sensor data validity verification
  - Temperature threshold compliance
  - Merkle integrity verification
  - Filecoin dataset verification
  - Complete shipment integrity checks

## Installation

```bash
cd gateway
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
GATEWAY_PRIVATE_KEY=your_private_key_here
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
REGISTRY_EVVM=0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C
BATCH_SIZE=10
BATCH_TIMEOUT=30000
PORT=3001

# Symbiotic Relay (optional)
SYMBIOTIC_RELAY_ADDRESS=0x4826533B4897376654Bb4d4AD88B7faFD0C98528
SYMBIOTIC_SETTLEMENT_ADDRESS=

# EVVM Integration (optional)
USE_EVVM=false  # Set to 'true' to enable EVVM async mode
EVVM_RPC_URL=https://rpc.sepolia.org
FISHER_PRIVATE_KEY=your_fisher_private_key  # Required if USE_EVVM=true

# Temperature thresholds (in Celsius, scaled by 100)
TEMP_MIN=-2000  # -20°C
TEMP_MAX=800    # 8°C
```

**Important**: The gateway private key must correspond to an address that is authorized in the contract (via `setGateway`).

## Filecoin Setup

The gateway uses Synapse SDK for Filecoin uploads. You'll need to:

1. **Install the Synapse SDK** (already in package.json):
   ```bash
   npm install
   ```

2. **Get Test Tokens**:
   - **tFIL** (for gas fees): https://faucet.calibnet.chainsafe-fil.io/funds.html
   - **USDFC** (for storage): https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc

3. **Configure your Filecoin wallet** in `.env`:
   ```env
   FILECOIN_PRIVATE_KEY=your_wallet_private_key_here
   ```

4. **Setup Payment** (one-time, before first upload):
   The gateway will automatically handle payment setup, but you can also run it manually:
   ```javascript
   const { setupPayment } = require('./filecoin');
   await setupPayment(); // Deposits 2.5 USDFC and approves Warm Storage
   ```

**Note**: Minimum upload size is 127 bytes. The gateway automatically pads smaller JSON data.

## API Endpoints

### POST /telemetry

Submit IoT telemetry data.

**Request:**
```json
{
  "shipmentId": "SHIPMENT-001",
  "batchId": "BATCH-0001",
  "temperature": 25.50,
  "humidity": 70.25,
  "rfidTag": "RFID-123",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Telemetry received",
  "shipmentKey": "0x...",
  "batchSize": 5
}
```

### GET /shipment/:shipmentKey

Get shipment data from on-chain record and Filecoin.

**Response:**
```json
{
  "shipmentKey": "0x...",
  "onChain": {
    "gateway": "0x...",
    "merkleRoot": "0x...",
    "cid": "bafy...",
    "timestamp": 1234567890,
    "temperature": 25.50,
    "humidity": 70.25,
    "rfidTag": "RFID-123"
  },
  "batchData": [...]
}
```

### GET /batch/:shipmentKey

Get current batch status for a shipment.

### GET /health

Health check endpoint.

### GET /attestation/:taskId

Get attestation task result from Symbiotic Relay.

**Response:**
```json
{
  "taskId": "0x...",
  "timestamp": 1234567890,
  "result": "1",
  "completed": true
}
```

### GET /shipment/:shipmentKey/attestations

Get attestation information for a shipment.

### POST /verify

Manually trigger verification for a shipment (for testing).

**Request:**
```json
{
  "cid": "bafy...",
  "merkleRoot": "0x...",
  "shipmentKey": "0x...",
  "tempMin": -2000,
  "tempMax": 800
}
```

**Response:**
```json
{
  "cid": "bafy...",
  "merkleRoot": "0x...",
  "shipmentKey": "0x...",
  "checks": {
    "filecoin": { "valid": true, ... },
    "merkle": { "valid": true, ... },
    "temperature": { "valid": true, ... },
    "sensorData": { "valid": true, ... }
  },
  "overallValid": true
}
```

## Usage

### Start Server

```bash
npm start
# or for development
npm run dev
```

### Submit Telemetry

```bash
curl -X POST http://localhost:3001/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "SHIPMENT-001",
    "batchId": "BATCH-0001",
    "temperature": 25.50,
    "humidity": 70.25,
    "rfidTag": "RFID-123"
  }'
```

### Check Shipment

```bash
curl http://localhost:3001/shipment/0x...
```

## How It Works

1. **Receive Telemetry**: IoT devices POST telemetry data to `/telemetry`
2. **Batch Collection**: Samples are collected into batches (size or time-based)
3. **Filecoin Upload**: When batch is ready, upload to Filecoin Calibration Testnet
4. **Merkle Root**: Compute Merkle root from batch samples
5. **EIP-712 Signature**: Gateway signs the data using EIP-712
6. **Contract Submission**: Submit signed transaction to contract (can be done by EVVM/Fisher)
7. **Symbiotic Attestations**: Create attestation tasks for Symbiotic Relay network to verify:
   - All sensor data from batch CID is valid
   - Temperature stayed within threshold
   - Shipment integrity proven using Merkle tree + Filecoin CID
   - Stored dataset verified using Filecoin Onchain Cloud

## Batching

The gateway uses a batching system to:
- Reduce Filecoin upload costs
- Batch multiple samples together
- Process when batch is full OR timeout is reached

Configure via:
- `BATCH_SIZE`: Number of samples per batch (default: 10)
- `BATCH_TIMEOUT`: Timeout in ms (default: 30000 = 30 seconds)

## EVVM Integration

ChainCold uses EVVM's Mate Metaprotocol to execute gasless / async shipment recordings via a Fisher/Executor flow.

### How It Works

1. **Gateway produces signed messages**: When batches are processed, the gateway creates EIP-712 signatures using `asyncNonce` for queue-able operations.
2. **Messages stored in EVVM**: Signed messages are stored in EVVM (Mate Metaprotocol on Sepolia, EVVM ID 2).
3. **Fisher/Executor processes messages**: An EVVM Fisher/Relayer script runs on Sepolia (Mate) and reads signed messages from EVVM storage/queue.
4. **Async nonces prevent replay**: The Fisher uses `asyncNonce` semantics to ensure no replay attacks.
5. **Real transaction submitted**: The Fisher submits the actual transaction to `ShipmentRegistryEVVM` contract, paying gas on behalf of the gateway.

### EVVM Configuration

To enable EVVM mode, set in `.env`:

```env
USE_EVVM=true
EVVM_RPC_URL=https://rpc.sepolia.org  # Mate Metaprotocol on Sepolia
FISHER_PRIVATE_KEY=your_fisher_private_key  # Fisher's wallet (pays gas)
```

### Running the EVVM Fisher/Relayer

The Fisher script (`evvm-relayer.js`) continuously polls EVVM for new signed messages and submits them to the contract:

```bash
node gateway/evvm-relayer.js
```

**Example Flow:**

1. Gateway receives telemetry → batches → creates signature with `asyncNonce`
2. Gateway adds message to EVVM queue (via `addMessageToEVVM()`)
3. Fisher reads message from EVVM
4. Fisher verifies `asyncNonce` matches contract state
5. Fisher submits `recordTelemetryWithSignature()` transaction
6. Contract verifies signature and increments `asyncNonce`

### EVVM Contracts & Services

- **EVVM ID**: 2 (Mate Metaprotocol)
- **Network**: Sepolia
- **Mate Staking**: Stake-backed execution
- **Mate NameService**: Message storage/retrieval
- **Contract**: `ShipmentRegistryEVVM` (deployed on Arbitrum Sepolia or Sepolia)

### Example Transaction

When a Fisher processes a message, you'll see:

```
🔄 Processing message for shipment: 0x1234...
✅ Async nonce verified: 5
📤 Submitting transaction to contract...
⏳ Transaction submitted: 0xabc123...
✅ Transaction confirmed: 0xabc123... (block: 12345678)
```

**View on Explorer**: Search for the transaction hash on your network's block explorer to see the EVVM-executed transaction.

### Benefits

- **Gasless for Gateway**: Gateway doesn't need ETH/gas tokens
- **Queue-able**: Messages can be queued and processed asynchronously
- **Replay Protection**: Async nonces ensure each message is processed exactly once
- **Decentralized**: Any Fisher can process messages, creating a competitive relayer market

## Symbiotic Relay Integration

The gateway automatically creates Symbiotic Relay attestation tasks after each batch is processed and submitted to the contract. These attestations provide stake-backed verification of:

- **Sensor Data Validity**: Verifies all sensor data from the batch CID is valid and matches the Merkle root
- **Temperature Threshold**: Verifies temperature stayed within configured thresholds
- **Merkle Integrity**: Verifies shipment integrity using Merkle tree + Filecoin CID
- **Filecoin Verification**: Verifies stored dataset is accessible and valid on Filecoin
- **Shipment Integrity**: Complete verification combining all checks

### Configuration

Set `SYMBIOTIC_RELAY_ADDRESS` in `.env` to enable Symbiotic attestations. If not set, the gateway will continue to work but won't create attestation tasks.

### Attestation Workflow

1. After a batch is processed and submitted to the contract, the gateway creates 5 attestation tasks
2. Each task is submitted to the Symbiotic Relay network
3. Validators on the network verify the attestation requirements:
   - Fetch dataset from Filecoin using CID
   - Verify Merkle integrity
   - Check temperature thresholds
   - Validate sensor data structure
4. Once validators reach consensus, the result is posted to destination chains

### Querying Attestations

Use the `/attestation/:taskId` endpoint to check the status and result of an attestation task.

## Filecoin Onchain Cloud Integration

ChainCold uses **Filecoin Onchain Cloud** via the **Synapse SDK** to store all raw sensor samples. Only the CID and Merkle root are stored on-chain, making Filecoin the primary storage layer for IoT telemetry.

### Synapse SDK Usage

The gateway explicitly uses `@filoz/synapse-sdk` for all Filecoin operations:

- **Network**: Calibration Testnet
- **Storage Type**: Warm Storage (via Synapse SDK)
- **Upload Method**: `sdk.storage.upload()` - uploads data buffers to Filecoin
- **Download Method**: `sdk.storage.download()` - retrieves data by CID

**Code Reference** (`gateway/filecoin.js`):

```javascript
const { Synapse, RPC_URLS } = require('@filoz/synapse-sdk');

// Initialize with Calibration Testnet
synapse = await Synapse.create({
  privateKey: FILECOIN_PRIVATE_KEY,
  rpcURL: RPC_URLS.calibration.http,
});

// Upload batch data
const result = await sdk.storage.upload(uint8Array);
const cid = result.pieceCid; // CID stored on-chain

// Retrieve data
const bytes = await sdk.storage.download(cid);
```

### Storage Flow

1. **IoT samples** → Gateway batches → **JSON array**
2. **Batch JSON** → Synapse SDK → **Filecoin Calibration** → **CID**
3. **CID + Merkle Root** → Contract (on-chain)
4. **Full batch data** → Retrieved from Filecoin when needed

### Verification

The frontend includes a "Verify on Filecoin" button that:
1. Fetches batch data from Filecoin using the CID
2. Recomputes Merkle root from the batch data
3. Compares with on-chain `merkleRoot`
4. Shows ✅ or ❌ verification result

### Example CID

After uploading, you'll see:
```
✅ Uploaded to Filecoin: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi (1234 bytes)
```

**View on IPFS Gateway**: `https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`

### Benefits

- **Decentralized Storage**: Data stored on Filecoin network, not centralized servers
- **Cost-Effective**: Only CID + Merkle root on-chain (gas efficient)
- **Verifiable**: Merkle root proves data integrity without downloading full dataset
- **Accessible**: Data retrievable via IPFS gateways or Synapse SDK

## Troubleshooting

### "GATEWAY_PRIVATE_KEY not set"
- Ensure `.env` file exists with `GATEWAY_PRIVATE_KEY`

### "Gateway not authorized"
- The gateway address must be authorized in the contract
- Use `setGateway(gatewayAddress, true)` from admin account

### Filecoin upload fails
- Check Synapse SDK installation
- Verify API key configuration
- Check network connectivity

## License

MIT

