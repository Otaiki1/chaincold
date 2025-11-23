# Setting Up Your .env File

The error "Must be authenticated!" means your RPC URL needs a valid API key. Follow these steps:

## Quick Fix

### Option 1: Use Public RPC (No API Key Required)

The config now uses public RPCs by default, but they may be rate-limited. Create a `.env` file with just your private key:

```bash
# In contracts/.env
PRIVATE_KEY=your_private_key_here
```

Then deploy:
```bash
npx hardhat run scripts/deploy-evvm.js --network arbitrumSepolia
```

### Option 2: Get Free API Key (Recommended)

For better reliability, get a free API key:

1. **Sign up at Alchemy**: https://www.alchemy.com/
2. **Create a new app**:
   - For Arbitrum Sepolia: Select "Arbitrum" → "Sepolia"
   - For Ethereum Sepolia: Select "Ethereum" → "Sepolia"
3. **Copy the HTTP URL** (it includes your API key)

Then create `.env` file:

```bash
# In contracts/.env
PRIVATE_KEY=your_private_key_here
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_ACTUAL_API_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ACTUAL_API_KEY
```

## Step-by-Step Setup

1. **Copy the example file**:
   ```bash
   cd contracts
   cp .env.example .env
   ```

2. **Edit `.env` and replace**:
   - `your_private_key_here` → Your actual private key (without 0x)
   - `YOUR_API_KEY` → Your Alchemy API key (in the RPC URL)

3. **Get your private key**:
   - From MetaMask: Account details → Export Private Key
   - Or from your wallet software
   - ⚠️ **NEVER share or commit this key!**

4. **Get RPC URL with API key**:
   - Go to https://www.alchemy.com/
   - Create app → Select network → Copy HTTP URL

## Example .env File

```bash
PRIVATE_KEY=abc123def4567890123456789012345678901234567890123456789012345678
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/abc123xyz789
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/abc123xyz789
ARBISCAN_API_KEY=your_arbiscan_key_here
ETHERSCAN_API_KEY=your_etherscan_key_here
```

## Verify Setup

Check that your `.env` is being read:

```bash
cd contracts
node -e "require('dotenv').config(); console.log('RPC URL:', process.env.ARBITRUM_SEPOLIA_RPC_URL ? 'Set ✓' : 'Missing ✗')"
```

## Quick Setup Script

You can use the interactive script to create your `.env` file:

```bash
cd contracts
./CREATE_ENV.sh
```

Or create it manually:

```bash
cd contracts
echo "PRIVATE_KEY=your_private_key_here" > .env
```

## Common Issues

### "Cannot read properties of undefined (reading 'address')"
- **Cause**: No PRIVATE_KEY set in `.env` file
- **Fix**: Create `.env` file with your private key:
  ```bash
  echo "PRIVATE_KEY=your_private_key_here" > .env
  ```

### "Must be authenticated!"
- Your RPC URL has `YOUR_API_KEY` placeholder instead of real key
- Or `.env` file is missing/not being read

### "Invalid private key"
- Make sure private key doesn't have `0x` prefix
- Should be 64 hex characters

### "Insufficient funds"
- Get test ETH from faucets:
  - Arbitrum Sepolia: https://www.alchemy.com/faucets/arbitrum-sepolia
  - Ethereum Sepolia: https://www.alchemy.com/faucets/ethereum-sepolia

