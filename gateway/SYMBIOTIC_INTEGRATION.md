# Symbiotic Relay Integration Guide

This guide explains how the Symbiotic Relay attestation system is integrated into the RealTrack gateway.

## Overview

After each batch of telemetry data is processed and submitted to the contract, the gateway automatically creates **5 attestation tasks** on the Symbiotic Relay network. These tasks enable stake-backed verification of:

1. **Sensor Data Validity** - All sensor data from batch CID is valid
2. **Temperature Threshold** - Temperature stayed within configured threshold
3. **Merkle Integrity** - Shipment integrity proven using Merkle tree + Filecoin CID
4. **Filecoin Verification** - Stored dataset verified using Filecoin Onchain Cloud
5. **Shipment Integrity** - Complete verification combining all checks

## How It Works

### 1. Batch Processing Flow

```
Telemetry → Batch → Filecoin Upload → Merkle Root → Contract Submission → Symbiotic Attestations
```

When a batch is ready:
1. Data is uploaded to Filecoin (get CID)
2. Merkle root is computed
3. Data is submitted to the contract
4. **Symbiotic attestation tasks are created automatically**

### 2. Attestation Task Creation

Each attestation task contains:
- **CID**: Filecoin Content ID of the batch data
- **Merkle Root**: Root hash of the Merkle tree
- **Shipment Key**: Unique identifier for the shipment
- **Temperature**: Average temperature for the batch
- **Temperature Thresholds**: Min/max allowed temperatures
- **Attestation Type**: Type of verification required

### 3. Relay Verification Process

The Symbiotic Relay network validators will:

1. **Receive the CID** from the attestation task
2. **Fetch the dataset** from Filecoin using the CID
3. **Verify Merkle integrity** by:
   - Recomputing the Merkle root from the fetched data
   - Comparing with the expected Merkle root from the task
4. **Check temperature thresholds** by:
   - Iterating through all samples in the batch
   - Verifying each temperature reading is within bounds
5. **Validate sensor data** by:
   - Checking data structure and format
   - Verifying required fields are present

### 4. Attestation Results

Once validators reach consensus, the result is:
- Posted to destination chains
- Available via the `/attestation/:taskId` endpoint
- Stored on-chain for permanent verification

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Symbiotic Relay Contract Address
SYMBIOTIC_RELAY_ADDRESS=0x4826533B4897376654Bb4d4AD88B7faFD0C98528

# Optional: Settlement contract address
SYMBIOTIC_SETTLEMENT_ADDRESS=

# Temperature thresholds (in Celsius, scaled by 100)
TEMP_MIN=-2000  # -20°C (minimum for cold chain)
TEMP_MAX=800    # 8°C (maximum for cold chain)
```

**Note**: If `SYMBIOTIC_RELAY_ADDRESS` is not set, the gateway will continue to work but won't create attestation tasks.

## API Endpoints

### Get Attestation Result

```bash
GET /attestation/:taskId
```

Query the status and result of an attestation task.

**Example:**
```bash
curl http://localhost:3001/attestation/0x1234...
```

**Response:**
```json
{
  "taskId": "0x1234...",
  "timestamp": 1234567890,
  "result": "1",
  "completed": true
}
```

### Get Shipment Attestations

```bash
GET /shipment/:shipmentKey/attestations
```

Get attestation information for a shipment.

### Manual Verification

```bash
POST /verify
```

Manually trigger verification for testing purposes.

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
    "filecoin": {
      "valid": true,
      "cid": "bafy...",
      "accessible": true,
      "dataSize": 1234
    },
    "merkle": {
      "valid": true,
      "expectedRoot": "0x...",
      "computedRoot": "0x...",
      "match": true
    },
    "temperature": {
      "valid": true,
      "violations": [],
      "totalSamples": 10,
      "violationCount": 0
    },
    "sensorData": {
      "valid": true,
      "batchSize": 10,
      "merkleRoot": "0x..."
    }
  },
  "overallValid": true
}
```

## Attestation Types

### SENSOR_DATA_VALID

Verifies that all sensor data from the batch CID is valid:
- Data is accessible from Filecoin
- Data structure is correct
- Merkle root matches expected value

### TEMPERATURE_THRESHOLD

Verifies temperature stayed within threshold:
- All samples have temperature within min/max bounds
- No temperature violations detected

### MERKLE_INTEGRITY

Verifies shipment integrity using Merkle tree:
- Fetches data from Filecoin
- Recomputes Merkle root
- Compares with expected root

### FILECOIN_VERIFIED

Verifies stored dataset is accessible:
- Dataset can be fetched from Filecoin
- Data is valid and parseable

### SHIPMENT_INTEGRITY

Complete verification combining all checks:
- Filecoin accessibility
- Merkle integrity
- Temperature threshold
- Sensor data validity

## Integration with Symbiotic Relay Network

### Setting Up the Relay Network

To run a local Symbiotic Relay network for testing:

```bash
# Clone the repository
git clone https://github.com/symbioticfi/symbiotic-super-sum.git
cd symbiotic-super-sum

# Initialize submodules
git submodule update --init --recursive

# Install dependencies
npm install

# Generate network configuration
./generate_network.sh

# Start the network
docker compose --project-directory temp-network up -d
```

### Production Integration

In production, you'll need to:

1. **Deploy or connect to a Symbiotic Relay network**
2. **Update `SYMBIOTIC_RELAY_ADDRESS`** with the actual contract address
3. **Implement task submission** in `createAttestationTask()` function
4. **Store task IDs** in a database for later querying
5. **Monitor attestation results** and handle failures

### Task Submission

Currently, the `createAttestationTask()` function creates a task identifier and logs it. To fully integrate:

1. Use the Symbiotic Relay SDK or contract interface
2. Submit tasks using the `createTask()` function
3. Store task IDs for later querying
4. Monitor task completion

Example (from Symbiotic docs):
```javascript
const taskID = await symbioticContract.createTask(
  taskDataParam1,
  taskDataParam2
);
```

## Verification Functions

The `symbiotic.js` module provides verification functions that the Relay validators can use:

- `verifySensorDataValidity(cid, expectedMerkleRoot)` - Verify sensor data
- `verifyTemperatureThreshold(cid, tempMin, tempMax)` - Check temperature
- `verifyMerkleIntegrity(cid, expectedMerkleRoot)` - Verify Merkle root
- `verifyFilecoinDataset(cid)` - Verify Filecoin accessibility
- `verifyShipmentIntegrity({...})` - Complete verification

These functions are designed to be called by Relay validators to perform the actual verification work.

## Troubleshooting

### Attestations Not Created

- Check that `SYMBIOTIC_RELAY_ADDRESS` is set in `.env`
- Verify the address is correct
- Check gateway logs for errors

### Attestation Task Not Found

- Task IDs are generated but not stored (in current implementation)
- In production, implement task ID storage in a database
- Use the batch processing response to get task IDs

### Verification Fails

- Check Filecoin CID is accessible
- Verify Merkle root computation matches
- Check temperature thresholds are correct
- Ensure data structure is valid

## Next Steps

1. **Implement task ID storage** - Store task IDs in a database
2. **Add task monitoring** - Poll for task completion
3. **Handle attestation results** - Process and store results
4. **Add retry logic** - Retry failed attestations
5. **Implement webhooks** - Notify on attestation completion

## References

- [Symbiotic Relay Documentation](https://docs.symbiotic.fi/relay-sdk/)
- [Symbiotic Super Sum Repository](https://github.com/symbioticfi/symbiotic-super-sum)
- [Relay Quickstart Guide](https://docs.symbiotic.fi/relay-sdk/quickstart/)

