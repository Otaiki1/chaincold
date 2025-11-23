# Cold Chain Gateway Service

Gateway service that receives IoT telemetry data, batches it, uploads to Filecoin, and submits to the blockchain using EVVM signatures.

## Architecture

```
IoT Device → Gateway API → Batcher → Filecoin → Merkle Root → EIP-712 Signature → Contract
```

## Features

- **Telemetry Collection**: Receives IoT sensor data via REST API
- **Batching**: Collects samples into batches for efficient processing
- **Filecoin Upload**: Uploads batch data to Filecoin Calibration Testnet
- **Merkle Root Computation**: Computes Merkle root for data integrity
- **EIP-712 Signing**: Creates gasless signatures for EVVM submission
- **Contract Integration**: Submits signed telemetry to ShipmentRegistryEVVM

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

## Batching

The gateway uses a batching system to:
- Reduce Filecoin upload costs
- Batch multiple samples together
- Process when batch is full OR timeout is reached

Configure via:
- `BATCH_SIZE`: Number of samples per batch (default: 10)
- `BATCH_TIMEOUT`: Timeout in ms (default: 30000 = 30 seconds)

## EVVM Integration

The gateway creates EIP-712 signatures that can be submitted by anyone (EVVM/Fisher nodes). The gateway doesn't need to pay gas - the signature proves authorization.

## Filecoin Integration

Currently uses a placeholder for Synapse SDK. You'll need to:

1. Install the actual SDK package
2. Update `filecoin.js` with correct import and methods
3. Configure API keys

The SDK should support:
- `uploadBuffer(buffer)` or `storage.upload(buffer)`
- Returns CID string

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

