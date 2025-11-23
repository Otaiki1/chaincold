import { ethers } from 'ethers';

/**
 * Compute shipmentKey from shipmentId and batchId
 * Matches on-chain: keccak256(abi.encode(shipmentId, batchId))
 * Note: Using abi.encode to match the contract's implementation
 */
export function computeShipmentKey(shipmentId: string, batchId: string): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string'],
    [shipmentId, batchId]
  );
  return ethers.keccak256(encoded);
}

/**
 * Format temperature from scaled int256 to Celsius
 * Contract stores: 2550 = 25.50°C
 */
export function formatTemperature(temperature: bigint | number): string {
  const num = typeof temperature === 'bigint' ? Number(temperature) : temperature;
  return (num / 100).toFixed(2);
}

/**
 * Format humidity from scaled uint256 to percentage
 * Contract stores: 7025 = 70.25%
 */
export function formatHumidity(humidity: bigint | number): string {
  const num = typeof humidity === 'bigint' ? Number(humidity) : humidity;
  return (num / 100).toFixed(2);
}

/**
 * Format timestamp from Unix timestamp to readable date
 */
export function formatTimestamp(timestamp: bigint | number): string {
  const num = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  return new Date(num * 1000).toLocaleString();
}

