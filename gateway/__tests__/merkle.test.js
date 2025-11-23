const { computeMerkleRoot, computeLeavesFromSamples, verifyMerkleProof } = require('../merkle');

describe('Merkle Tree Functions', () => {
  describe('computeMerkleRoot', () => {
    test('should compute root from single sample', () => {
      const samples = [{ temperature: 25, humidity: 70 }];
      const root = computeMerkleRoot(samples);
      expect(root).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should compute root from multiple samples', () => {
      const samples = [
        { temperature: 25, humidity: 70 },
        { temperature: 26, humidity: 71 },
        { temperature: 27, humidity: 72 },
      ];
      const root = computeMerkleRoot(samples);
      expect(root).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should produce same root for same samples in same order', () => {
      const samples = [
        { temperature: 25, humidity: 70 },
        { temperature: 26, humidity: 71 },
      ];
      const root1 = computeMerkleRoot(samples);
      const root2 = computeMerkleRoot(samples);
      expect(root1).toBe(root2);
    });

    test('should produce different root for different samples', () => {
      const samples1 = [{ temperature: 25, humidity: 70 }];
      const samples2 = [{ temperature: 26, humidity: 71 }];
      const root1 = computeMerkleRoot(samples1);
      const root2 = computeMerkleRoot(samples2);
      expect(root1).not.toBe(root2);
    });

    test('should handle samples with different key orders (sorted)', () => {
      const samples1 = [{ temperature: 25, humidity: 70 }];
      const samples2 = [{ humidity: 70, temperature: 25 }];
      const root1 = computeMerkleRoot(samples1);
      const root2 = computeMerkleRoot(samples2);
      expect(root1).toBe(root2); // Should be same due to sorted keys
    });

    test('should throw error for empty array', () => {
      expect(() => computeMerkleRoot([])).toThrow('Cannot compute Merkle root from empty array');
    });

    test('should handle large batches', () => {
      const samples = Array.from({ length: 100 }, (_, i) => ({
        temperature: 20 + i,
        humidity: 50 + i,
        timestamp: Date.now() + i,
      }));
      const root = computeMerkleRoot(samples);
      expect(root).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should handle complex nested objects', () => {
      const samples = [
        {
          temperature: 25,
          humidity: 70,
          metadata: { location: 'A1', sensor: 'S1' },
        },
        {
          temperature: 26,
          humidity: 71,
          metadata: { location: 'A2', sensor: 'S2' },
        },
      ];
      const root = computeMerkleRoot(samples);
      expect(root).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('computeLeavesFromSamples', () => {
    test('should compute leaves correctly', () => {
      const samples = [
        { temperature: 25, humidity: 70 },
        { temperature: 26, humidity: 71 },
      ];
      const leaves = computeLeavesFromSamples(samples);
      expect(leaves).toHaveLength(2);
      leaves.forEach((leaf) => {
        expect(Buffer.isBuffer(leaf)).toBe(true);
        expect(leaf.length).toBe(32); // keccak256 produces 32 bytes
      });
    });
  });

  describe('verifyMerkleProof', () => {
    test('should verify valid proof', () => {
      const samples = [
        { temperature: 25, humidity: 70 },
        { temperature: 26, humidity: 71 },
      ];
      const root = computeMerkleRoot(samples);
      const sample = samples[0];
      
      // Get proof (simplified - in real implementation you'd get proof from tree)
      const { MerkleTree } = require('merkletreejs');
      const keccak256 = require('keccak256');
      const leaves = computeLeavesFromSamples(samples);
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const leaf = keccak256(JSON.stringify(sample, Object.keys(sample).sort()));
      const proof = tree.getProof(leaf);
      
      const isValid = verifyMerkleProof(sample, root, proof);
      expect(isValid).toBe(true);
    });
  });
});

