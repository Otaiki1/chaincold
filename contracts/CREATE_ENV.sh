#!/bin/bash
# Quick script to create .env file

echo "Creating .env file..."
echo ""
echo "Enter your private key (without 0x prefix):"
read -s PRIVATE_KEY

echo ""
echo "Do you have an Alchemy API key? (y/n)"
read HAS_API_KEY

if [ "$HAS_API_KEY" = "y" ] || [ "$HAS_API_KEY" = "Y" ]; then
    echo "Enter Arbitrum Sepolia RPC URL (from Alchemy):"
    read ARB_RPC
    echo "Enter Ethereum Sepolia RPC URL (from Alchemy):"
    read ETH_RPC
    echo "Enter Arbiscan API key (optional, for verification):"
    read ARBISCAN_KEY
    echo "Enter Etherscan API key (optional, for verification):"
    read ETHERSCAN_KEY
    
    cat > .env << EOF
PRIVATE_KEY=$PRIVATE_KEY
ARBITRUM_SEPOLIA_RPC_URL=$ARB_RPC
SEPOLIA_RPC_URL=$ETH_RPC
ARBISCAN_API_KEY=$ARBISCAN_KEY
ETHERSCAN_API_KEY=$ETHERSCAN_KEY
EOF
else
    cat > .env << EOF
PRIVATE_KEY=$PRIVATE_KEY
EOF
    echo ""
    echo "✓ Created .env with private key only (using public RPC endpoints)"
fi

echo ""
echo "✓ .env file created!"
echo ""
echo "⚠️  IMPORTANT: Never commit .env to git!"
echo ""

