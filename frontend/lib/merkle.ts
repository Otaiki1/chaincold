import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

/**
 * Compute Merkle leaves from sample data
 * Each sample is hashed using keccak256
 */
export function computeLeavesFromSamples(samples: any[]): Buffer[] {
  return samples.map((sample) => {
    // Use consistent JSON serialization (sorted keys)
    const serialized = JSON.stringify(sample, Object.keys(sample).sort());
    return keccak256(serialized);
  });
}

/**
 * Compute Merkle root from sample data
 * Returns hex string with 0x prefix
 */
export function computeMerkleRoot(samples: any[]): string {
  if (samples.length === 0) {
    throw new Error('Cannot compute Merkle root from empty array');
  }

  const leaves = computeLeavesFromSamples(samples);
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getRoot();
  return '0x' + root.toString('hex');
}

/**
 * Verify a sample against a Merkle root
 */
export function verifyMerkleProof(
  sample: any,
  root: string,
  proof: Buffer[]
): boolean {
  const leaf = keccak256(JSON.stringify(sample, Object.keys(sample).sort()));
  return MerkleTree.verify(proof, leaf, Buffer.from(root.slice(2), 'hex'), keccak256, { sortPairs: true });
}

