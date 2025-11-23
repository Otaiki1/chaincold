import { ethers } from 'ethers';

// Contract ABI - minimal version for the functions we need
const SHIPMENT_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'records',
    outputs: [
      { internalType: 'address', name: 'gateway', type: 'address' },
      { internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32' },
      { internalType: 'string', name: 'cid', type: 'string' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'int256', name: 'temperature', type: 'int256' },
      { internalType: 'uint256', name: 'humidity', type: 'uint256' },
      { internalType: 'string', name: 'rfidTag', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'key', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'gateway', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'cid', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { indexed: false, internalType: 'int256', name: 'temperature', type: 'int256' },
      { indexed: false, internalType: 'uint256', name: 'humidity', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'rfidTag', type: 'string' },
    ],
    name: 'TelemetryRecorded',
    type: 'event',
  },
];

export const SHIPMENT_REGISTRY_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C';

/**
 * Get contract instance
 */
export function getRegistryContract(providerOrSigner: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(
    SHIPMENT_REGISTRY_ADDRESS,
    SHIPMENT_REGISTRY_ABI,
    providerOrSigner
  );
}
