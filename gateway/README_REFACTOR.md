# Gateway Refactoring - Backend-Inspired Structure

## Overview

The gateway has been refactored to follow the backend folder's organizational patterns, improving code structure, security, and maintainability.

## Changes Made

### 1. **Routes/Controller Pattern**
- **Before**: All logic in `index.js`
- **After**: Separated into:
  - `routes/telemetry.js` - Telemetry endpoints
  - `routes/shipment.js` - Shipment lookup endpoints
  - `routes/attestation.js` - Attestation endpoints
  - `controller/telemetry.js` - Telemetry business logic
  - `controller/shipment.js` - Shipment business logic
  - `controller/attestation.js` - Attestation business logic

### 2. **Encrypted Key Management**
- **New**: `encryptKey.js` - Secure wallet key encryption
- **Benefits**:
  - Private keys are encrypted at rest
  - Password-protected key storage
  - Fallback to plain key if encrypted key doesn't exist

**Usage**:
```bash
# Set password in .env
PRIVATE_KEY_PASSWORD=your_secure_password

# Encrypt your key
node encryptKey.js
```

### 3. **Improved Error Handling**
- Better error messages
- Consistent error response format
- Proper validation before processing

### 4. **Middleware Organization**
- Request logging middleware
- CORS configuration
- JSON body parsing
- Clean separation of concerns

## File Structure

```
gateway/
├── index.js                 # Main entry point
├── encryptKey.js            # Key encryption utility
├── routes/
│   ├── telemetry.js        # Telemetry routes
│   ├── shipment.js         # Shipment routes
│   └── attestation.js     # Attestation routes
├── controller/
│   ├── telemetry.js        # Telemetry controller
│   ├── shipment.js         # Shipment controller
│   └── attestation.js     # Attestation controller
├── batcher.js              # Batching logic
├── contract.js             # Contract interactions
├── filecoin.js             # Filecoin integration
├── merkle.js               # Merkle tree computation
├── signer.js               # EIP-712 signing
├── symbiotic.js            # Symbiotic Relay integration
└── evvm-relayer.js         # EVVM relayer
```

## API Endpoints (Unchanged)

All endpoints remain the same:

- `POST /telemetry` - Receive IoT telemetry
- `GET /shipment/:shipmentKey` - Get shipment data
- `GET /shipment/:shipmentKey/attestations` - Get attestations
- `GET /attestation/:taskId` - Get attestation result
- `POST /verify` - Manual verification
- `GET /health` - Health check
- `GET /telemetry/batch/:shipmentKey` - Get batch status

## Migration Guide

### For Existing Deployments

1. **Update dependencies** (if needed):
   ```bash
   npm install
   ```

2. **Encrypt your private key** (recommended):
   ```bash
   # Set PRIVATE_KEY_PASSWORD in .env
   node encryptKey.js
   ```

3. **Restart the gateway**:
   ```bash
   npm start
   # or
   npm run dev
   ```

### Environment Variables

No changes required - all existing environment variables work as before:

```env
GATEWAY_PRIVATE_KEY=your_private_key
PRIVATE_KEY_PASSWORD=your_password  # New, optional
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
REGISTRY_EVVM=0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C
BATCH_SIZE=10
BATCH_TIMEOUT=30000
PORT=3001
```

## Benefits

1. **Better Organization**: Code is easier to navigate and maintain
2. **Security**: Encrypted key storage (optional but recommended)
3. **Scalability**: Easy to add new routes/controllers
4. **Testability**: Controllers can be tested independently
5. **Consistency**: Matches backend folder patterns

## Testing

All existing tests should continue to work. Run:

```bash
npm test
```

## Notes

- The gateway maintains backward compatibility - all API endpoints work the same
- Encrypted key storage is optional - plain private key still works
- Controllers are initialized with shared dependencies (provider, signer, etc.)
- The structure follows the backend folder's proven patterns

