const { ethers } = require('ethers');

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
    inputs: [
      { internalType: 'bytes32', name: 'shipmentKey', type: 'bytes32' },
      { internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32' },
      { internalType: 'string', name: 'cid', type: 'string' },
      { internalType: 'int256', name: 'temperature', type: 'int256' },
      { internalType: 'uint256', name: 'humidity', type: 'uint256' },
      { internalType: 'string', name: 'rfidTag', type: 'string' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
      { internalType: 'bool', name: 'isAsync', type: 'bool' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'recordTelemetryWithSignature',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'gateway', type: 'address' }],
    name: 'getSyncNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'gateway', type: 'address' }],
    name: 'getAsyncNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDomainSeparator',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const SHIPMENT_REGISTRY_ADDRESS =
  process.env.REGISTRY_EVVM || '0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C';

/**
 * Get contract instance
 */
function getRegistryContract(providerOrSigner) {
  return new ethers.Contract(
    SHIPMENT_REGISTRY_ADDRESS,
    SHIPMENT_REGISTRY_ABI,
    providerOrSigner
  );
}

/**
 * Get current nonce for a gateway
 */
async function getCurrentNonce(provider, gatewayAddress, isAsync = false) {
  const contract = getRegistryContract(provider);
  if (isAsync) {
    return await contract.getAsyncNonce(gatewayAddress);
  }
  return await contract.getSyncNonce(gatewayAddress);
}

/**
 * Get domain separator from contract
 */
async function getDomainSeparator(provider) {
  const contract = getRegistryContract(provider);
  return await contract.getDomainSeparator();
}

/**
 * Submit signed telemetry to contract
 * This can be called by anyone (EVVM/Fisher) - the gateway doesn't need to pay gas
 * For demo purposes, we use a signer, but in production EVVM would submit
 */
async function submitTelemetryWithSignature(
  signerOrProvider,
  shipmentKey,
  merkleRoot,
  cid,
  temperature,
  humidity,
  rfidTag,
  nonce,
  isAsync,
  signature
) {
  const contract = getRegistryContract(signerOrProvider);
  const tx = await contract.recordTelemetryWithSignature(
    shipmentKey,
    merkleRoot,
    cid,
    temperature,
    humidity,
    rfidTag,
    nonce,
    isAsync,
    signature.v,
    signature.r,
    signature.s
  );
  return tx;
}

module.exports = {
  getRegistryContract,
  getCurrentNonce,
  getDomainSeparator,
  submitTelemetryWithSignature,
  SHIPMENT_REGISTRY_ADDRESS,
};

