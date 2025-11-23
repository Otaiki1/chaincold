# Cold Chain Dashboard - Frontend

A Next.js dashboard for tracking shipments, monitoring live telemetry, and verifying Merkle roots on-chain.

## Features

### 📦 Track Shipment
- Look up shipments by Shipment ID and Batch ID
- View on-chain telemetry data including:
  - Temperature and humidity readings
  - IPFS CID for off-chain data
  - Merkle root for data integrity
  - Gateway address and timestamp
  - RFID tag information

### 📡 Live Telemetry
- Real-time monitoring of `TelemetryRecorded` events
- Automatic updates when new telemetry is recorded
- Shows last 50 events with full details
- Visual indicator for connection status

### 🔍 Merkle Verifier
- Fetch payload from IPFS using CID
- Compute Merkle root client-side
- Compare with on-chain Merkle root
- Verify data integrity

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Blockchain**: ethers.js v6
- **IPFS**: Public IPFS gateway (ipfs.io)
- **Merkle**: merkletreejs + keccak256

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env.local` file (optional):

```env
# RPC URL for Arbitrum Sepolia
# Uses public RPC by default if not set
NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Or use your own Alchemy/Infura endpoint
# NEXT_PUBLIC_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx          # Home page with navigation
│   ├── track/
│   │   └── page.tsx      # Track Shipment page
│   ├── live/
│   │   └── page.tsx      # Live Telemetry page
│   └── verify/
│       └── page.tsx      # Merkle Verifier page
├── components/
│   ├── TrackShipment.tsx    # Shipment lookup component
│   ├── LiveTelemetry.tsx    # Real-time event listener
│   └── MerkleVerify.tsx     # Merkle root verifier
├── lib/
│   ├── contracts.ts      # Contract ABI and helpers
│   ├── helpers.ts        # Utility functions
│   ├── merkle.ts         # Merkle tree computation
│   └── provider.tsx      # Ethereum provider setup
└── package.json
```

## Usage

### Track a Shipment

1. Navigate to `/track`
2. Enter Shipment ID (e.g., `SHIPMENT-EVVM-001`)
3. Enter Batch ID (e.g., `BATCH-0001`)
4. Click "Lookup Shipment"
5. View on-chain record with all telemetry data

### Monitor Live Telemetry

1. Navigate to `/live`
2. The page automatically listens for `TelemetryRecorded` events
3. New events appear in real-time as they're recorded on-chain
4. View details including temperature, humidity, CID, and more

### Verify Merkle Root

1. Navigate to `/verify`
2. Enter IPFS CID (or use CID from a tracked shipment)
3. Optionally enter on-chain Merkle root for comparison
4. Click "Verify Merkle Root"
5. View computed root and verification result

## Contract Integration

The dashboard connects to the deployed `ShipmentRegistryEVVM` contract:

- **Address**: `0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C`
- **Network**: Arbitrum Sepolia (Chain ID: 421614)
- **Block Explorer**: https://sepolia.arbiscan.io/address/0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C

## Development

### Build for Production

```bash
npm run build
npm start
```

### Type Checking

The project uses TypeScript. Check types with:

```bash
npx tsc --noEmit
```

## Notes

- The dashboard uses read-only access to the blockchain (no wallet connection required)
- Events are fetched from the last 1000 blocks on page load
- Real-time updates use ethers event listeners
- For production, consider using WebSocket providers for more reliable event streaming

## Troubleshooting

### Events Not Showing

- Check that the contract address is correct
- Verify you're connected to Arbitrum Sepolia network
- Ensure the RPC endpoint is accessible

### IPFS Fetch Errors

- IPFS gateways can be slow or unavailable
- Try alternative gateways: `https://gateway.pinata.cloud/ipfs/` or `https://cloudflare-ipfs.com/ipfs/`

### Merkle Root Mismatch

- Ensure JSON serialization matches the gateway's format
- Check that the CID points to the correct payload
- Verify the on-chain root is from the same shipment

## License

MIT
