# Deployment Guide - Arbitrum Sepolia & Ethereum Sepolia

This guide walks you through deploying the ShipmentRegistry contracts to Arbitrum Sepolia or Ethereum Sepolia testnets.

## Network Options

### Arbitrum Sepolia (Recommended)

-   ✅ **Very low gas costs** - Perfect for IoT device transactions
-   ✅ **Fast transactions** - Quick confirmation times
-   ✅ **EVM compatible** - Works with all Ethereum tools
-   ✅ **Free test ETH** - Easy to get from faucets

### Ethereum Sepolia

-   ✅ **Most popular testnet** - Well-supported and stable
-   ✅ **Standard Ethereum** - Direct compatibility
-   ✅ **Free test ETH** - Available from multiple faucets

## Prerequisites

1. **Node.js** and **npm** installed
2. **Private Key** with ETH tokens for gas fees
3. **RPC Provider** (Alchemy, Infura, or public RPC)
4. **Block Explorer API Key** (Etherscan/Arbiscan for contract verification)

## Step 1: Install Dependencies

```bash
cd contracts
npm install
npm install --save-dev dotenv @nomiclabs/hardhat-etherscan
```

## Step 2: Configure Environment Variables

Create a `.env` file in the `contracts` directory:

```bash
# Private key of the deployer account (NEVER commit this!)
PRIVATE_KEY=your_private_key_here

# RPC URLs (choose one or both)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Block Explorer API Keys (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
```

### Getting RPC URLs

1. **Alchemy** (Recommended):

    - Sign up at https://www.alchemy.com/
    - Create a new app
    - For Ethereum Sepolia: Select "Ethereum" → "Sepolia" testnet
    - For Arbitrum Sepolia: Select "Arbitrum" → "Sepolia" testnet
    - Copy the HTTP URL

2. **Infura**:

    - Sign up at https://www.infura.io/
    - Create a new project
    - Select the appropriate network
    - Copy the endpoint URL

3. **Public RPC** (Not recommended for production):
    - Ethereum Sepolia: `https://rpc.sepolia.org`
    - Arbitrum Sepolia: `https://sepolia-rollup.arbitrum.io/rpc`

### Getting API Keys

1. **Etherscan**: https://etherscan.io/apis (for Ethereum Sepolia)
2. **Arbiscan**: https://arbiscan.io/apis (for Arbitrum Sepolia)

## Step 3: Fund Your Deployer Account

Get free test ETH:

### Ethereum Sepolia

1. **Alchemy Faucet**: https://www.alchemy.com/faucets/ethereum-sepolia
2. **Sepolia Faucet**: https://sepoliafaucet.com/
3. **Infura Faucet**: https://www.infura.io/faucet/sepolia

### Arbitrum Sepolia

1. **Alchemy Faucet**: https://www.alchemy.com/faucets/arbitrum-sepolia
2. **Arbitrum Faucet**: https://faucet.quicknode.com/arbitrum/sepolia

You'll need at least 0.01 ETH for deployment and testing.

## Step 4: Deploy the Contract

### Deploy to Arbitrum Sepolia (Recommended)

```bash
npx hardhat run scripts/deploy-evvm.js --network arbitrumSepolia
```

### Deploy to Ethereum Sepolia

```bash
npx hardhat run scripts/deploy-evvm.js --network sepolia
```

### Deploy Standard ShipmentRegistry

```bash
# Arbitrum Sepolia
npx hardhat run scripts/deploy-local.js --network arbitrumSepolia

# Ethereum Sepolia
npx hardhat run scripts/deploy-local.js --network sepolia
```

**Save the output!** You'll need:

-   Contract address
-   Domain separator (for EVVM)
-   Gateway addresses

Example output:

```
Deployer: 0x1234...
Gateway (sample): 0x5678...
ShipmentRegistryEVVM: 0xABCD...
Domain Separator: 0xEF01...
REGISTRY_EVVM=0xABCD...
```

## Step 5: Verify Contract on Block Explorer

Verification allows users to view and interact with your contract source code.

### Arbitrum Sepolia

```bash
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>
```

### Ethereum Sepolia

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Step 6: Verify Contract is Live

### Option 1: Check Block Explorer

**Arbitrum Sepolia:**

1. Go to https://sepolia.arbiscan.io/
2. Search for your contract address
3. Verify contract shows as "Contract" and code is visible

**Ethereum Sepolia:**

1. Go to https://sepolia.etherscan.io/
2. Search for your contract address
3. Verify contract shows as "Contract" and code is visible

### Option 2: Use Verification Script

```bash
# Set the contract address
export REGISTRY_EVVM=0xYourContractAddress

# Arbitrum Sepolia
npx hardhat run scripts/verify-contract.js --network arbitrumSepolia

# Ethereum Sepolia
npx hardhat run scripts/verify-contract.js --network sepolia
```

### Option 3: Interact with Contract

Test that the contract is working:

```bash
# Set environment variables
export REGISTRY_EVVM=0xYourContractAddress

# Arbitrum Sepolia
npx hardhat run scripts/record-telemetry-evvm.js --network arbitrumSepolia

# Ethereum Sepolia
npx hardhat run scripts/record-telemetry-evvm.js --network sepolia
```

## Step 7: Configure Gateway Addresses

After deployment, authorize your gateway addresses:

```bash
# Using Hardhat console
npx hardhat console --network arbitrumSepolia
# or
npx hardhat console --network sepolia

# In the console:
const Registry = await ethers.getContractFactory("ShipmentRegistryEVVM");
const registry = Registry.attach("0xYourContractAddress");
const [deployer] = await ethers.getSigners();

// Authorize a gateway
await registry.setGateway("0xGatewayAddress", true);

// Verify
await registry.authorizedGateways("0xGatewayAddress"); // Should return true
```

## Step 8: Update Your Application

Update your application configuration with:

### For Arbitrum Sepolia

```env
REGISTRY_EVVM=0xYourContractAddress
DOMAIN_SEPARATOR=0xYourDomainSeparator
NETWORK=arbitrumSepolia
CHAIN_ID=421614
RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### For Ethereum Sepolia

```env
REGISTRY_EVVM=0xYourContractAddress
DOMAIN_SEPARATOR=0xYourDomainSeparator
NETWORK=sepolia
CHAIN_ID=11155111
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

## Network Information

### Arbitrum Sepolia

-   **Network Name**: Arbitrum Sepolia Testnet
-   **Chain ID**: 421614
-   **Block Explorer**: https://sepolia.arbiscan.io/
-   **Currency**: ETH (testnet)
-   **RPC Endpoints**:
    -   Alchemy: `https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
    -   Infura: `https://arbitrum-sepolia.infura.io/v3/YOUR_PROJECT_ID`
    -   Public: `https://sepolia-rollup.arbitrum.io/rpc`

### Ethereum Sepolia

-   **Network Name**: Ethereum Sepolia Testnet
-   **Chain ID**: 11155111
-   **Block Explorer**: https://sepolia.etherscan.io/
-   **Currency**: ETH (testnet)
-   **RPC Endpoints**:
    -   Alchemy: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
    -   Infura: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
    -   Public: `https://rpc.sepolia.org`

## Security Checklist

Before deploying:

-   [ ] Test thoroughly on local network first
-   [ ] Verify contract source code on block explorer
-   [ ] Test all functions (recordTelemetry, setGateway, etc.)
-   [ ] Verify gateway addresses are correct
-   [ ] Ensure deployer account has sufficient ETH
-   [ ] Keep private keys secure
-   [ ] Document all contract addresses and configurations
-   [ ] Set up monitoring/alerting for contract events

## Troubleshooting

### "Insufficient funds for gas"

-   Add more ETH to your deployer account from faucet
-   Check you have at least 0.01 ETH

### "Contract verification failed"

-   Ensure optimizer settings match (runs: 200)
-   Check that constructor arguments are correct
-   Try manual verification on block explorer

### "Nonce too high"

-   Reset your account nonce or wait for pending transactions

### "Network not found"

-   Check your `.env` file has correct RPC URLs
-   Verify network name matches: `arbitrumSepolia` or `sepolia`

### "Invalid API key"

-   Verify your API key is correct for the network
-   Check API key is active on block explorer dashboard

## Next Steps

1. **Monitor Contract**: Set up event listeners for `TelemetryRecorded` and `AccessGranted`
2. **Gateway Setup**: Configure IoT gateways to sign and submit telemetry
3. **Integration**: Connect your frontend/backend to the deployed contract
4. **Documentation**: Document contract addresses and ABIs for your team

## Useful Links

### Arbitrum Sepolia

-   **Arbiscan**: https://sepolia.arbiscan.io/
-   **Alchemy Faucet**: https://www.alchemy.com/faucets/arbitrum-sepolia
-   **Arbitrum Docs**: https://docs.arbitrum.io/

### Ethereum Sepolia

-   **Etherscan**: https://sepolia.etherscan.io/
-   **Alchemy Faucet**: https://www.alchemy.com/faucets/ethereum-sepolia
-   **Sepolia Faucet**: https://sepoliafaucet.com/

## Support

For issues or questions:

-   Check contract on block explorer
-   Review transaction receipts for errors
-   Test on local network before deploying
