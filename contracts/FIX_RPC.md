# Fix "Must be authenticated!" Error

This error means your RPC URL has a placeholder API key instead of a real one.

## Quick Fix: Use Public RPC (No API Key Needed)

Remove or comment out the RPC URLs from your `.env` file to use the public endpoints:

```bash
cd contracts
nano .env
```

Comment out or remove these lines:
```bash
# ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

Keep only:
```bash
PRIVATE_KEY=your_private_key_here
```

The config will automatically use public RPC endpoints:
- Arbitrum Sepolia: `https://sepolia-rollup.arbitrum.io/rpc`
- Ethereum Sepolia: `https://rpc.sepolia.org`

## Alternative: Get Real API Key

If you want better reliability, get a free API key:

1. **Sign up at Alchemy**: https://www.alchemy.com/
2. **Create a new app**:
   - For Arbitrum Sepolia: Select "Arbitrum" → "Sepolia"
   - For Ethereum Sepolia: Select "Ethereum" → "Sepolia"
3. **Copy the HTTP URL** (includes your API key)
4. **Update `.env`** with the real URL:
   ```bash
   ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_REAL_API_KEY_HERE
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_REAL_API_KEY_HERE
   ```

## Verify Your Fix

After updating, test the connection:
```bash
npx hardhat run scripts/deploy-evvm.js --network arbitrumSepolia
```

If it works, you'll see:
```
Deployer: 0x...
Gateway (sample): 0x...
```

