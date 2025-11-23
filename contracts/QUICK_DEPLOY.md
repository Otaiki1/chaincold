# Quick Deployment - Arbitrum Sepolia & Ethereum Sepolia

## Quick Start (5 Steps)

### 1. Install Dependencies
```bash
cd contracts
npm install
npm install --save-dev dotenv @nomiclabs/hardhat-etherscan
```

### 2. Create `.env` File
```bash
# In contracts/.env
PRIVATE_KEY=your_private_key_here

# RPC URLs (choose one or both)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Block Explorer API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
```

**Get RPC URL**: 
- Sign up at https://www.alchemy.com/
- Create a new app
- Select "Ethereum" → "Sepolia" OR "Arbitrum" → "Sepolia"
- Copy the HTTP URL

**Get API Keys**: 
- Etherscan: https://etherscan.io/apis
- Arbiscan: https://arbiscan.io/apis

### 3. Get Test ETH

**Ethereum Sepolia:**
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepoliafaucet.com/

**Arbitrum Sepolia:**
- https://www.alchemy.com/faucets/arbitrum-sepolia
- https://faucet.quicknode.com/arbitrum/sepolia

### 4. Deploy

**Arbitrum Sepolia (Recommended - Lower Gas):**
```bash
npx hardhat run scripts/deploy-evvm.js --network arbitrumSepolia
```

**Ethereum Sepolia:**
```bash
npx hardhat run scripts/deploy-evvm.js --network sepolia
```

**Save the output!** You'll get:
- Contract address
- Domain separator
- Gateway addresses

### 5. Verify Contract is Live

**Arbitrum Sepolia:**
```bash
export REGISTRY_EVVM=0xYourContractAddress
npx hardhat run scripts/verify-contract.js --network arbitrumSepolia
```

**Ethereum Sepolia:**
```bash
export REGISTRY_EVVM=0xYourContractAddress
npx hardhat run scripts/verify-contract.js --network sepolia
```

## Network Details

### Arbitrum Sepolia (Recommended)
- **Chain ID**: 421614
- **Block Explorer**: https://sepolia.arbiscan.io/
- **Gas Cost**: Very low
- **Speed**: Fast

### Ethereum Sepolia
- **Chain ID**: 11155111
- **Block Explorer**: https://sepolia.etherscan.io/
- **Gas Cost**: Low
- **Speed**: Standard

## Verify Source Code

**Arbitrum Sepolia:**
```bash
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>
```

**Ethereum Sepolia:**
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Full Documentation

See `DEPLOYMENT.md` for complete instructions including troubleshooting and security checklist.
