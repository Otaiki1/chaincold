const { ethers } = require('ethers');

/**
 * Create EIP-712 signature for recordTelemetry
 * Matches the contract's signature format
 */
async function createSignature(
  signer,
  contractAddress,
  domainSeparator,
  shipmentKey,
  merkleRoot,
  cid,
  temperature,
  humidity,
  rfidTag,
  nonce,
  isAsync
) {
  // Get network info
  const network = await signer.provider.getNetwork();

  // Use signTypedData for proper EIP-712 signing (ethers v6)
  const signature = await signer.signTypedData(
    {
      name: 'ShipmentRegistryEVVM',
      version: '1',
      chainId: Number(network.chainId),
      verifyingContract: contractAddress,
    },
    {
      RecordTelemetry: [
        { name: 'shipmentKey', type: 'bytes32' },
        { name: 'merkleRoot', type: 'bytes32' },
        { name: 'cid', type: 'string' },
        { name: 'temperature', type: 'int256' },
        { name: 'humidity', type: 'uint256' },
        { name: 'rfidTag', type: 'string' },
        { name: 'nonce', type: 'uint256' },
        { name: 'isAsync', type: 'bool' },
      ],
    },
    {
      shipmentKey,
      merkleRoot,
      cid,
      temperature,
      humidity,
      rfidTag,
      nonce,
      isAsync,
    }
  );

  // Split signature into v, r, s (ethers v6)
  const sig = ethers.Signature.from(signature);

  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
  };
}

/**
 * Compute shipmentKey from shipmentId and batchId
 * Matches on-chain: keccak256(abi.encode(shipmentId, batchId))
 */
function computeShipmentKey(shipmentId, batchId) {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string'],
    [shipmentId, batchId]
  );
  return ethers.keccak256(encoded);
}

module.exports = {
  createSignature,
  computeShipmentKey,
};

