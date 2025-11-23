#!/bin/bash
# Quick fix: Comment out RPC URLs with placeholder API keys to use public endpoints

if [ -f .env ]; then
    # Backup original
    cp .env .env.backup
    
    # Comment out RPC URLs that contain placeholder API keys
    # This handles cases like: YOUR_API_KEY, your_api_key, YOUR-API-KEY, etc.
    sed -i.bak -E 's/^SEPOLIA_RPC_URL=.*(YOUR[_-]?API[_-]?KEY|your[_-]?api[_-]?key|placeholder).*/#&/' .env
    sed -i.bak -E 's/^ARBITRUM_SEPOLIA_RPC_URL=.*(YOUR[_-]?API[_-]?KEY|your[_-]?api[_-]?key|placeholder).*/#&/' .env
    
    # Also comment out any RPC URLs that look like they have placeholder keys
    # (URLs that end with /v2/ or contain obvious placeholders)
    sed -i.bak -E '/^SEPOLIA_RPC_URL=.*\/v2\/[A-Z_]+$/s/^/#/' .env
    sed -i.bak -E '/^ARBITRUM_SEPOLIA_RPC_URL=.*\/v2\/[A-Z_]+$/s/^/#/' .env
    
    # Remove .bak files created by sed on macOS
    rm -f .env.bak
    
    echo "✓ Fixed .env file"
    echo "✓ Commented out RPC URLs with placeholder API keys"
    echo "✓ Will use public RPC endpoints now"
    echo ""
    echo "Your .env backup is saved as .env.backup"
    echo ""
    echo "To use custom RPC URLs, update .env with real API keys from:"
    echo "  - Alchemy: https://www.alchemy.com/"
    echo "  - Infura: https://www.infura.io/"
else
    echo "❌ .env file not found"
    echo "Create one with: PRIVATE_KEY=your_private_key_here"
fi
