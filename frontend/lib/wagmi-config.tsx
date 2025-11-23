'use client';

import { createConfig, http } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { createConnector } from '@wagmi/core';

// For read-only access, we can use a public RPC
const publicRpc = 'https://sepolia-rollup.arbitrum.io/rpc';

// Create a read-only connector for public access
const publicConnector = createConnector(() => ({
  id: 'public',
  name: 'Public RPC',
  type: 'injected',
  async connect() {
    return { accounts: [], chainId: arbitrumSepolia.id };
  },
  async disconnect() {},
  async getAccounts() {
    return [];
  },
  async getChainId() {
    return arbitrumSepolia.id;
  },
  async isAuthorized() {
    return false;
  },
}));

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [],
  transports: {
    [arbitrumSepolia.id]: http(publicRpc),
  },
});

