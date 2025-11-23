# ShipmentRegistryEVVM - Smart Contract Documentation

## Overview

A blockchain-based shipment tracking system designed for IoT devices that records temperature, humidity, and RFID data on-chain. The contract supports **gasless transactions** via EVVM (Ethereum Virtual Machine) using EIP-712 cryptographic signatures, allowing IoT devices to record data without paying gas fees.

## Key Features

### 🔐 Security & Access Control
- **Admin-controlled**: Only the contract deployer can authorize gateways and flag breaches
- **Authorized gateways**: Only pre-approved addresses can record telemetry data
- **Replay protection**: Nonce-based system prevents signature replay attacks
- **EIP-712 signatures**: Industry-standard structured data signing for secure verification

### 💰 Gasless Transactions (EVVM)
- **Two recording methods**:
  1. `recordTelemetry()` - Direct call (gateway pays gas)
  2. `recordTelemetryWithSignature()` - Gasless via EVVM (anyone can submit, EVVM pays gas)
- IoT devices can sign data off-chain without needing ETH
- EVVM/Fisher nodes can submit signed transactions on behalf of devices

### 📊 Data Storage
Each shipment record stores:
- **Gateway address**: Authorized device that recorded the data
- **Merkle root**: Cryptographic proof of batch data integrity
- **CID**: IPFS/Filecoin content identifier for off-chain data
- **Timestamp**: Block timestamp when data was recorded
- **Temperature**: Scaled by 100 (e.g., 2550 = 25.50°C)
- **Humidity**: Scaled by 100 (e.g., 7025 = 70.25%)
- **RFID tag**: Unique identifier for access control

## Contract Structure

### Core Components

#### TelemetryRecord
```solidity
struct TelemetryRecord {
    address gateway;
    bytes32 merkleRoot;
    string cid;
    uint256 timestamp;
    int256 temperature;
    uint256 humidity;
    string rfidTag;
}
```

#### Access Control
- `admin`: Contract deployer with full control
- `authorizedGateways`: Mapping of authorized gateway addresses
- `onlyAdmin` modifier: Restricts admin-only functions
- `onlyGateway` modifier: Restricts gateway-only functions

#### Replay Protection
- `syncNonces`: For immediate/synchronous operations
- `asyncNonces`: For queued/asynchronous operations
- Each signature must include the current nonce
- Contract verifies and auto-increments nonces

## Main Functions

### `recordTelemetry()`
Direct method for recording telemetry data.
- **Who can call**: Authorized gateways only
- **Gas**: Gateway pays transaction fees
- **Use case**: When gateway has ETH and wants immediate recording

### `recordTelemetryWithSignature()`
Gasless method using EIP-712 signatures.
- **Who can call**: Anyone (typically EVVM/Fisher nodes)
- **Gas**: Submitter pays (not the gateway)
- **Use case**: IoT devices without ETH can still record data
- **Process**:
  1. Gateway signs data off-chain with EIP-712
  2. Anyone submits the signed transaction
  3. Contract verifies signature, nonce, and gateway authorization
  4. Data is stored on-chain

### `setGateway(address gateway, bool allowed)`
Admin function to authorize/revoke gateway addresses.
- **Who can call**: Admin only
- **Purpose**: Control which devices can record telemetry

### `flagBreach(bytes32 shipmentKey, uint256 code, string reason)`
Admin function to flag a shipment as breached.
- **Who can call**: Admin only
- **Purpose**: Mark shipments that violated temperature/humidity thresholds

### View Functions
- `getSyncNonce(address gateway)`: Get current sync nonce
- `getAsyncNonce(address gateway)`: Get current async nonce
- `getDomainSeparator()`: Get EIP-712 domain separator for signature verification
- `records(bytes32 shipmentKey)`: Read telemetry record
- `breached(bytes32 shipmentKey)`: Check if shipment is flagged

## How It Works

### Gasless Transaction Flow (EVVM)

```
1. IoT Device
   └─> Collects temperature/humidity data

2. Gateway
   └─> Signs data with EIP-712 signature (off-chain, no gas needed)
   └─> Creates signature with: shipmentKey, merkleRoot, cid, temperature, 
       humidity, rfidTag, nonce, isAsync

3. EVVM/Fisher Node
   └─> Submits signed transaction to blockchain (pays gas)

4. Contract Verification
   ├─> Verifies EIP-712 signature is valid
   ├─> Checks signer is authorized gateway
   ├─> Verifies nonce matches current nonce
   └─> Stores data + increments nonce

5. Result
   └─> Data permanently stored on-chain
   └─> Anyone can verify shipment conditions
```

### Example Use Case: Cold Chain Shipping

1. **IoT sensors** monitor temperature in a refrigerated container
2. **Gateway device** collects readings and signs them off-chain (no gas needed)
3. **EVVM network** submits transactions to blockchain (pays gas)
4. **Recipients** can verify on-chain that temperature stayed within safe range
5. **Admin** can flag breaches if temperature exceeded thresholds

## Deployment

### Current Deployment (Arbitrum Sepolia Testnet)

- **Contract Address**: `0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C`
- **Network**: Arbitrum Sepolia (Chain ID: 421614)
- **Block Explorer**: https://sepolia.arbiscan.io/address/0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C
- **Domain Separator**: `0xf4db8c78b078646e162bab020eb2a24c22b3d69521cb9ca56acf751eab197fc4`
- **Authorized Gateway**: `0xA18421737EB6a4df57C694AFb8a8f144a3CC7d8F`

### Deployment Scripts

#### Deploy Contract
```bash
npx hardhat run scripts/deploy-evvm.js --network arbitrumSepolia
```

#### Record Test Telemetry
```bash
export REGISTRY_EVVM=0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C
npx hardhat run scripts/record-telemetry-evvm.js --network arbitrumSepolia
```

#### Verify Contract
```bash
npx hardhat verify --network arbitrumSepolia 0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C
```

## Configuration

### Environment Variables

Add these to your application's `.env` file:

```env
# Contract Address
REGISTRY_EVVM=0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C

# EIP-712 Domain Separator (for signature verification)
DOMAIN_SEPARATOR=0xf4db8c78b078646e162bab020eb2a24c22b3d69521cb9ca56acf751eab197fc4

# Network Configuration
NETWORK=arbitrumSepolia
CHAIN_ID=421614

# Gateway Address
GATEWAY_ADDRESS=0xA18421737EB6a4df57C694AFb8a8f144a3CC7d8F

# RPC URL (optional - uses public endpoint if not set)
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

## Security Features

### 1. Signature Verification
- Uses EIP-712 standard for structured data signing
- Contract verifies signature cryptographically
- Only signatures from authorized gateways are accepted

### 2. Nonce Protection
- Each signature includes a nonce
- Contract verifies nonce matches current value
- Prevents replay attacks (same signature can't be used twice)
- Separate nonces for sync and async operations

### 3. Access Control
- Admin can authorize/revoke gateways
- Only authorized addresses can create valid signatures
- Admin can flag breaches for investigation

### 4. Immutable Records
- Once recorded, telemetry data cannot be modified
- Timestamp is set automatically by blockchain
- Provides tamper-proof audit trail

## Events

### `TelemetryRecorded`
Emitted when telemetry is successfully recorded.
```solidity
event TelemetryRecorded(
    bytes32 indexed key,
    address indexed gateway,
    bytes32 merkleRoot,
    string cid,
    uint256 timestamp,
    int256 temperature,
    uint256 humidity,
    string rfidTag
);
```

### `BreachDetected`
Emitted when admin flags a shipment breach.
```solidity
event BreachDetected(
    bytes32 indexed key,
    uint256 breachCode,
    string reason
);
```

### `AccessGranted`
Emitted when telemetry is recorded (for access control tracking).
```solidity
event AccessGranted(
    bytes32 indexed key,
    string rfidTag,
    address indexed gateway,
    uint256 timestamp
);
```

## Technical Details

### EIP-712 Signature Format

The contract uses EIP-712 for structured data signing:

**Domain Separator:**
```solidity
keccak256(
    abi.encode(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("ShipmentRegistryEVVM"),
        keccak256("1"),
        block.chainid,
        address(this)
    )
)
```

**Type Hash:**
```solidity
keccak256(
    "RecordTelemetry(bytes32 shipmentKey,bytes32 merkleRoot,string cid,int256 temperature,uint256 humidity,string rfidTag,uint256 nonce,bool isAsync)"
)
```

**Final Hash:**
```solidity
keccak256(
    abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
)
```

### Data Scaling

- **Temperature**: Stored as `int256`, scaled by 100
  - Example: `2550` = 25.50°C
  - Supports negative temperatures (e.g., `-500` = -5.00°C)

- **Humidity**: Stored as `uint256`, scaled by 100
  - Example: `7025` = 70.25%
  - Range: 0-10000 (0.00% to 100.00%)

### Shipment Key Generation

```javascript
shipmentKey = keccak256(abi.encodePacked(shipmentId, batchId))
```

This creates a unique identifier for each shipment batch combination.

## Development

### Prerequisites
- Node.js
- Hardhat
- Private key with test ETH

### Setup
```bash
npm install
cp .env.example .env
# Edit .env with your PRIVATE_KEY
```

### Testing
```bash
# Run tests
npx hardhat test

# Run specific test
npx hardhat test test/evvm-test.js
```

### Compile
```bash
npx hardhat compile
```

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Quick start deployment
- [SETUP_ENV.md](./SETUP_ENV.md) - Environment setup
- [FIX_RPC.md](./FIX_RPC.md) - Troubleshooting RPC issues

## License

MIT

## Support

For issues or questions, please refer to the deployment documentation or check the block explorer for contract interactions.

