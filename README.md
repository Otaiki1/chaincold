# 🧊 ChainCold – Trustless IoT Cold-Chain Monitoring Using Filecoin, Symbiotic Relay & EVVM

Verifiable supply-chain telemetry with decentralized storage, stake-backed attestations, and gasless IoT transactions.

## 🚀 Overview

ChainCold is a next-generation IoT telemetry system that brings trust, immutability, and verifiable integrity to global cold-chain logistics.

We allow IoT sensors to stream temperature, humidity, and RFID data to a Gateway API, which:

-   Batches & stores sensor data on **Filecoin Onchain Cloud**
-   Generates **Merkle-root integrity proofs**
-   Signs updates using **EIP-712**
-   Relays them to the blockchain via **EVVM** (gasless, nonce-protected)
-   Triggers **Symbiotic** stake-backed verification attestations
-   Allows anyone to audit the full dataset and verify it on-chain

This creates the first fully trustless cold-chain monitoring system: **verifiable storage (Filecoin) + verifiable execution (Symbiotic) + verifiable signatures (EVVM)**.

## 🏆 Sponsor Tracks

### 🟣 Filecoin Onchain Cloud – Best Storage Innovation

We use **Synapse SDK** on Calibration Testnet to:

-   Store every IoT batch as decentralized warm storage
-   Retrieve full sensor datasets (not only metadata)
-   Reconstruct Merkle proofs directly from Filecoin data
-   Make Filecoin the **primary storage layer** for IoT telemetry

**Only CID + MerkleRoot are stored on-chain** — raw data lives on Filecoin.

This showcases Filecoin as a programmable data layer for IoT and supply-chain integrity.

### 🟡 Symbiotic – Best Use of Relay SDK

For each batch, we generate **five stake-backed attestations**:

1. Filecoin dataset availability
2. Merkle-root integrity
3. Temperature compliance (threshold violations)
4. Telemetry structure validity (RFID, humidity ranges, packet shape)
5. Full shipment integrity proof

These are **stake-secured via the Symbiotic Relay**, providing economic guarantees that the cold-chain data is intact and correctly stored.

### 🟢 EVVM (Mate Metaprotocol) – Gasless IoT Execution

IoT devices don't have wallets.

So ChainCold uses EVVM to enable:

-   Off-chain EIP-712 signing
-   Async nonces for queued updates
-   Fisher/Executor pattern
-   Gasless submission to L2

EVVM transforms our IoT pipeline into a **gasless, signature-driven, secure virtual chain**.

## 📦 Architecture

```
┌───────────────────┐
│    IoT Device     │
│ (Temp/Humidity/RF)│
└─────────┬─────────┘
          │ POST /telemetry
          ▼
┌──────────────────────────┐
│        Gateway API       │
│  • batching              │
│  • Filecoin upload       │
│  • Merkle root           │
│  • EIP-712 signature     │
│  • Symbiotic tasks       │
└─────────┬───────────────┘
          │ signed payload
          ▼
┌──────────────────────────┐
│         EVVM Layer       │
│ (asyncNonces, Fisher)    │
└─────────┬───────────────┘
          │ gasless tx
          ▼
┌──────────────────────────┐
│ ShipmentRegistryEVVM SC  │
│  • stores CID            │
│  • stores Merkle root    │
│  • stores summary        │
└─────────┬───────────────┘
          │
          ├───────────────────────────────┐
          │                               │
          ▼                               ▼
┌───────────────────┐            ┌────────────────────┐
│   Frontend (SC)   │            │ Frontend (Gateway) │
│  Summary view     │            │ Full batch details │
└───────────────────┘            └────────────────────┘
```

## 🔐 Key Innovations

### 1️⃣ Filecoin-Native IoT Storage (Synapse SDK)

Each batch of sensor readings is uploaded via **Synapse SDK** to Filecoin Calibration Testnet:

-   Warm storage with fast retrieval
-   Content-addressed using CIDs
-   Full dataset accessible & fully verifiable
-   **Only hashes go on Ethereum** — raw data lives trustlessly on Filecoin.

### 2️⃣ Merkle-Secured Batching

Each batch produces:

-   `merkleRoot`
-   `cid`
-   `avgTemperature`
-   `avgHumidity`
-   `rfidTag`

Clients can recompute Merkle roots from Filecoin data to verify integrity.

### 3️⃣ EVVM-Based Gasless Execution

IoT devices do not pay gas.

Instead:

1. Gateway signs structured EIP-712 messages
2. EVVM manages async nonces
3. Fisher submits the transaction
4. ShipmentRegistryEVVM verifies signature + nonce

This is the ideal flow for IoT automation.

### 4️⃣ Symbiotic Relay Attestations

Every batch triggers stake-backed tasks:

-   `TemperatureCheckTask`
-   `MerkleIntegrityTask`
-   `FilecoinDatasetCheckTask`
-   `HumidityRangeTask`
-   `ShipmentIntegrityTask`

Symbiotic relays return:

-   `status = "pending" / "verified" / "failed"`
-   detailed verification logs
-   attestation hashes

## 🖥️ Frontend Features

### ✔ Track Shipment

Reads directly from contract:

-   Gateway address
-   Timestamp
-   Merkle root
-   CID
-   Summary temp/humidity
-   RFID

### ✔ Full Telemetry Detail (via Gateway)

Calls `/shipment/:shipmentKey` and shows:

-   All samples in the batch
-   Timestamped readings
-   Recomputed merkle root
-   Filecoin CID link
-   Attestation results

### ✔ Verification Panel

-   Merkle verification (computed vs on-chain)
-   Filecoin dataset retrieval
-   Symbiotic attestation statuses

## 🧪 Demo Workflow

1. IoT device sends:

```json
{
    "shipmentId": "SHIP-001",
    "batchId": "001",
    "temperature": 2.5,
    "humidity": 71.2,
    "rfid": "RFID-0001"
}
```

2. Gateway batches → uploads to Filecoin

3. Returns CID like: `bafybeigd...bbn3`

4. Computes MerkleRoot: `0x43a2...fae9`

5. Signs EIP-712 payload

6. EVVM relayer submits tx

7. Smart contract stores summary

8. Symbiotic generates 5 verification tasks

9. Frontend shows:
    - Summary panel
    - Full Filecoin dataset
    - Merkle verification
    - Attestation results

## 🔧 Technical Breakdown

### Smart Contract

**ShipmentRegistryEVVM.sol**

Features:

-   `recordTelemetryWithSignature()`
-   EIP-712 domain & struct hashing
-   sync/async nonces
-   event: `TelemetryRecorded`

Network:

-   Arbitrum Sepolia or Mate-supported EVM chain

### Gateway API

Node.js Express server.

**Endpoints:**

| Route                             | Description                              |
| --------------------------------- | ---------------------------------------- |
| `POST /telemetry`                 | IoT submits sample                       |
| `GET /shipment/:key`              | on-chain summary + full Filecoin dataset |
| `GET /attestation/:taskId`        | Symbiotic status                         |
| `GET /shipment/:key/attestations` | All related attestations                 |

-   **Batching**: configurable size & timeout.
-   **Storage**: Synapse SDK → Filecoin Calibration.

### EVVM Relayer

-   Reads signed payloads from Gateway/queue
-   Ensures async nonce correctness
-   Submits to L2 using signer
-   Logs tx IDs for audit

### Symbiotic Attester

-   Creates Relay tasks per batch
-   Stores `taskId → shipmentKey`
-   Verifies CID availability + Merkle proof
-   Performs threshold checks

## ⚙️ Setup

### 1. Clone repo

```bash
git clone https://github.com/<your-org>/chaincold
cd chaincold
```

### 2. Environment variables

**Example `.env`:**

```env
RPC_URL=<arbitrum_sepolia>
GATEWAY_PRIVATE_KEY=<yourkey>
REGISTRY_EVVM=<deployed_contract>
FILECOIN_KEY=<calibration key>
FILECOIN_ENDPOINT=https://api.calibration.node.glif.io
SYMBIOTIC_API_KEY=<relay key>
EVVM_MATE_RPC=<mate rpc>
```

### 3. Run gateway

```bash
cd gateway
npm install
npm start
```

### 4. Run frontend

```bash
cd frontend
npm install
npm run dev
```

## 📹 Demo Video

📌 Place video link here before submission.

## 📚 Future Extensions

-   SMS alerts when temperature thresholds breached
-   NFT audit certificates for each shipment
-   Multi-shipment dashboards
-   AI predictions on cold-chain failure
-   Mobile app for on-site verifiers
