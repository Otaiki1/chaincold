'use client';

import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

// Create a provider for Arbitrum Sepolia
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

let cachedProvider: ethers.Provider | null = null;

export function useProvider() {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);

  useEffect(() => {
    if (cachedProvider) {
      setProvider(cachedProvider);
      return;
    }

    // Create a JsonRpcProvider for read-only access
    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
    cachedProvider = rpcProvider;
    setProvider(rpcProvider);
  }, []);

  return provider;
}

export function getProvider(): ethers.Provider {
  if (cachedProvider) {
    return cachedProvider;
  }
  cachedProvider = new ethers.JsonRpcProvider(RPC_URL);
  return cachedProvider;
}

