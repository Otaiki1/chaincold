# Data Flow Analysis - ChainCold Project

## Current Architecture Overview

```
┌─────────────┐
│  IoT Device │
└──────┬──────┘
       │ POST /telemetry
       │ (temperature, humidity, shipmentId, batchId)
       ▼
┌─────────────┐
│   Gateway   │  ← Receives IoT data
│   (API)     │  ← Batches samples
│             │  ← Uploads to Filecoin
│             │  ← Computes Merkle root
│             │  ← Creates EIP-712 signature
│             │  ← Submits to contract
└──────┬──────┘
       │ submitTelemetryWithSignature()
       ▼
┌─────────────┐
│  Contract   │  ← Stores: gateway, merkleRoot, cid,
│ (Blockchain)│     timestamp, avg temp/humidity, rfidTag
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  Frontend   │   │  Frontend    │
│ (Contract)  │   │ (Gateway API)│  ← NOT IMPLEMENTED
└─────────────┘   └─────────────┘
```

## ✅ What's Working Correctly

### 1. IoT Device → Gateway Flow

**Status**: ✅ **WORKING**

-   **Endpoint**: `POST /telemetry` (gateway/index.js:56)
-   **Process**:
    1. IoT device sends telemetry data (temperature, humidity, shipmentId, batchId)
    2. Gateway validates input
    3. Gateway computes `shipmentKey` from shipmentId + batchId
    4. Gateway adds sample to batcher
    5. Returns success response

**Code Reference**:

```56:114:gateway/index.js
app.post('/telemetry', async (req, res) => {
  // ... receives IoT data and batches it
});
```

### 2. Gateway → Contract Flow

**Status**: ✅ **WORKING**

-   **Process** (`processBatch` function):
    1. When batch is ready (size or timeout):
        - Uploads batch JSON to Filecoin → gets CID
        - Computes Merkle root from batch samples
        - Gets current nonce from contract
        - Creates EIP-712 signature
        - Submits signed transaction to contract
        - Creates Symbiotic Relay attestations (optional)

**Code Reference**:

```119:221:gateway/index.js
async function processBatch(shipmentKey, batch, shipmentId, batchId) {
  // ... processes batch and submits to contract
}
```

**Contract Submission**:

```100:127:gateway/contract.js
async function submitTelemetryWithSignature(
  signerOrProvider,
  shipmentKey,
  merkleRoot,
  cid,
  temperature,
  humidity,
  rfidTag,
  nonce,
  isAsync,
  signature
) {
  // ... submits to contract
}
```

### 3. Frontend → Contract Flow

**Status**: ✅ **WORKING**

-   **TrackShipment Component**: Reads directly from contract
    -   Uses `contract.records(shipmentKey)` to get on-chain data
    -   Displays: gateway, merkleRoot, CID, timestamp, temperature, humidity, rfidTag

**Code Reference**:

```29:77:frontend/components/TrackShipment.tsx
async function fetchRecord() {
  // ... reads directly from contract
  const r = await contract.records(key);
}
```

-   **LiveTelemetry Component**: Listens to contract events
    -   Listens to `TelemetryRecorded` events
    -   Shows real-time updates when new telemetry is recorded

**Code Reference**:

```29:128:frontend/components/LiveTelemetry.tsx
useEffect(() => {
  // ... listens to contract events
  contract.on('TelemetryRecorded', handler);
});
```

## ❌ What's Missing

### Frontend → Gateway API Integration

**Status**: ❌ **NOT IMPLEMENTED**

**Problem**: The frontend is **only** reading from the contract, which stores:

-   Summary data (average temperature/humidity per batch)
-   CID (Filecoin content identifier)
-   Merkle root

**Missing**: The frontend is **NOT** calling the gateway API to fetch:

-   Full batch data from Filecoin (all individual samples)
-   Detailed telemetry history

**Available Gateway Endpoint**:

```227:280:gateway/index.js
app.get('/shipment/:shipmentKey', async (req, res) => {
  // Returns:
  // - onChain: contract data
  // - batchData: full batch from Filecoin
});
```

**Response Format**:

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
  "batchData": [
    {
      "shipmentId": "SHIPMENT-001",
      "batchId": "BATCH-0001",
      "temperature": 25.50,
      "humidity": 70.25,
      "timestamp": 1234567890,
      ...
    },
    // ... all samples in the batch
  ]
}
```

## Recommended Flow (Complete)

### Ideal Architecture

```
IoT Device
    │
    │ POST /telemetry
    ▼
Gateway API
    │
    ├─→ Batches samples
    ├─→ Uploads to Filecoin (gets CID)
    ├─→ Computes Merkle root
    ├─→ Creates signature
    └─→ Submits to Contract
         │
         │ Stores summary + CID
         ▼
    Contract (Blockchain)
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
    Frontend          Frontend
    (Contract)        (Gateway API)
         │                  │
         │                  │ GET /shipment/:shipmentKey
         │                  │ (returns onChain + batchData)
         │                  │
         └──────────┬───────┘
                    │
                    │ User sees:
                    │ - Summary from contract
                    │ - Full batch details from gateway
                    ▼
              Complete View
```

## Recommendations

### 1. Add Gateway API Integration to Frontend

**Option A: Enhance TrackShipment Component**

-   Keep existing contract read for summary data
-   Add optional call to gateway API for full batch data
-   Display both summary and detailed samples

**Option B: Create New Component**

-   Create `TrackShipmentDetailed.tsx` that fetches from gateway API
-   Shows full batch history with all samples
-   Can still verify against contract data

### 2. Implementation Example

Add to `TrackShipment.tsx`:

```typescript
// Add state for batch data
const [batchData, setBatchData] = useState<any[] | null>(null);

// Add function to fetch from gateway
async function fetchFromGateway(shipmentKey: string) {
    try {
        const GATEWAY_URL =
            process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3001";
        const response = await fetch(`${GATEWAY_URL}/shipment/${shipmentKey}`);
        if (!response.ok) throw new Error("Failed to fetch from gateway");
        const data = await response.json();
        setBatchData(data.batchData);
    } catch (error) {
        console.error("Gateway fetch error:", error);
        // Fallback: only show contract data
    }
}

// Call after fetching from contract
if (record) {
    fetchFromGateway(key);
}
```

### 3. Environment Configuration

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3001
```

## Current Data Flow Summary

| Step | Source     | Destination | Status     | Data                        |
| ---- | ---------- | ----------- | ---------- | --------------------------- |
| 1    | IoT Device | Gateway API | ✅ Working | Raw telemetry samples       |
| 2    | Gateway    | Filecoin    | ✅ Working | Batch JSON (CID)            |
| 3    | Gateway    | Contract    | ✅ Working | Summary + CID + Merkle root |
| 4    | Frontend   | Contract    | ✅ Working | Summary data only           |
| 5    | Frontend   | Gateway API | ❌ Missing | Full batch data             |

## Conclusion

**Current State**:

-   ✅ IoT → Gateway → Contract flow is **correct and working**
-   ✅ Frontend can read from contract
-   ❌ Frontend is **NOT** calling gateway API to get full batch data

**What Needs to be Done**:

1. Add gateway API integration to frontend
2. Fetch full batch data from gateway endpoint
3. Display both contract summary and detailed batch samples
4. Optionally: Add environment variable for gateway URL

The architecture is sound, but the frontend is only using half of the available data sources. Adding gateway API integration will provide users with complete telemetry history, not just batch summaries.
