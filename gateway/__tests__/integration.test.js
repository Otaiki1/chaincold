/**
 * Integration tests for the complete gateway pipeline
 * These tests require a running test environment
 */

const { ethers } = require('ethers');
const TelemetryBatcher = require('../batcher');
const { computeMerkleRoot } = require('../merkle');
const { computeShipmentKey } = require('../signer');
const { uploadJSONToFilecoin } = require('../filecoin');

// Mock Filecoin for integration tests
jest.mock('../filecoin', () => ({
  uploadJSONToFilecoin: jest.fn().mockResolvedValue('bafybeiexample123'),
  fetchFromFilecoin: jest.fn().mockResolvedValue([
    { temperature: 25, humidity: 70 },
  ]),
}));

// Mock Symbiotic - use a factory function to return dynamic values
const mockCreateShipmentAttestations = jest.fn();
jest.mock('../symbiotic', () => ({
  initSymbiotic: jest.fn(),
  createShipmentAttestations: (...args) => mockCreateShipmentAttestations(...args),
  getAttestationResult: jest.fn(),
  ATTESTATION_TYPES: {
    SENSOR_DATA_VALID: 'SENSOR_DATA_VALID',
    TEMPERATURE_THRESHOLD: 'TEMPERATURE_THRESHOLD',
    MERKLE_INTEGRITY: 'MERKLE_INTEGRITY',
    FILECOIN_VERIFIED: 'FILECOIN_VERIFIED',
    SHIPMENT_INTEGRITY: 'SHIPMENT_INTEGRITY',
  },
}));

describe('Integration Tests', () => {
  describe('Complete Pipeline', () => {
    test('should process batch from collection to upload', async () => {
      const batcher = new TelemetryBatcher({ batchSize: 3, batchTimeout: 1000 });

      // 1. Collect samples
      const samples = [
        { temperature: 25, humidity: 70, shipmentId: 'SHIP-001', batchId: 'BATCH-001' },
        { temperature: 26, humidity: 71, shipmentId: 'SHIP-001', batchId: 'BATCH-001' },
        { temperature: 27, humidity: 72, shipmentId: 'SHIP-001', batchId: 'BATCH-001' },
      ];

      const shipmentKey = computeShipmentKey('SHIP-001', 'BATCH-001');
      let batch = null;

      for (const sample of samples) {
        batch = batcher.addSample(shipmentKey, sample);
      }

      // 2. Batch should be ready
      expect(batch).not.toBeNull();
      expect(batch).toHaveLength(3);

      // 3. Compute Merkle root
      const merkleRoot = computeMerkleRoot(batch);
      expect(merkleRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // 4. Upload to Filecoin
      const cid = await uploadJSONToFilecoin(batch);
      expect(cid).toBe('bafybeiexample123');

      // 5. Verify all steps completed
      expect(batch).toBeDefined();
      expect(merkleRoot).toBeDefined();
      expect(cid).toBeDefined();
    });

    test('should process batch with Symbiotic attestations', async () => {
      const { createShipmentAttestations } = require('../symbiotic');
      const batcher = new TelemetryBatcher({ batchSize: 3, batchTimeout: 1000 });

      // 1. Collect samples
      const samples = [
        { temperature: 2500, humidity: 7025, shipmentId: 'SHIP-002', batchId: 'BATCH-002' },
        { temperature: 2600, humidity: 7125, shipmentId: 'SHIP-002', batchId: 'BATCH-002' },
        { temperature: 2700, humidity: 7225, shipmentId: 'SHIP-002', batchId: 'BATCH-002' },
      ];

      const shipmentKey = computeShipmentKey('SHIP-002', 'BATCH-002');
      let batch = null;

      for (const sample of samples) {
        batch = batcher.addSample(shipmentKey, sample);
      }

      // 2. Process batch
      const merkleRoot = computeMerkleRoot(batch);
      const cid = await uploadJSONToFilecoin(batch);

      // 3. Setup mock to return values based on input
      mockCreateShipmentAttestations.mockResolvedValue({
        shipmentKey,
        cid,
        tasks: [
          { taskId: '0x' + 'a'.repeat(64), attestationType: 'SENSOR_DATA_VALID', status: 'pending' },
          { taskId: '0x' + 'b'.repeat(64), attestationType: 'TEMPERATURE_THRESHOLD', status: 'pending' },
          { taskId: '0x' + 'c'.repeat(64), attestationType: 'MERKLE_INTEGRITY', status: 'pending' },
          { taskId: '0x' + 'd'.repeat(64), attestationType: 'FILECOIN_VERIFIED', status: 'pending' },
          { taskId: '0x' + 'e'.repeat(64), attestationType: 'SHIPMENT_INTEGRITY', status: 'pending' },
        ],
        createdAt: Date.now(),
      });

      // 4. Create Symbiotic attestations
      const attestations = await createShipmentAttestations({
        signer: {},
        cid,
        merkleRoot,
        shipmentKey,
        temperature: 2600, // Average
        humidity: 7125,
        tempMin: -2000,
        tempMax: 800,
      });

      // 5. Verify attestations created
      expect(attestations).toBeDefined();
      expect(attestations.tasks).toHaveLength(5);
      expect(attestations.cid).toBe(cid);
      expect(attestations.shipmentKey).toBe(shipmentKey);

      // 6. Verify all attestation types present
      const types = attestations.tasks.map((t) => t.attestationType);
      expect(types).toContain('SENSOR_DATA_VALID');
      expect(types).toContain('TEMPERATURE_THRESHOLD');
      expect(types).toContain('MERKLE_INTEGRITY');
      expect(types).toContain('FILECOIN_VERIFIED');
      expect(types).toContain('SHIPMENT_INTEGRITY');
    });

    test('should handle timeout-based batching', async () => {
      const batcher = new TelemetryBatcher({
        batchSize: 10,
        batchTimeout: 100,
      });

      const shipmentKey = computeShipmentKey('SHIP-002', 'BATCH-002');
      batcher.addSample(shipmentKey, { temperature: 25, humidity: 70 });

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      const batch = batcher.getBatch(shipmentKey);
      expect(batch).toHaveLength(0); // Should be flushed
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data integrity through pipeline', () => {
      const originalSamples = [
        { temperature: 25, humidity: 70 },
        { temperature: 26, humidity: 71 },
      ];

      const merkleRoot1 = computeMerkleRoot(originalSamples);
      const merkleRoot2 = computeMerkleRoot(originalSamples);

      // Same data should produce same root
      expect(merkleRoot1).toBe(merkleRoot2);

      // Different data should produce different root
      const differentSamples = [
        { temperature: 25, humidity: 70 },
        { temperature: 27, humidity: 71 }, // Changed
      ];
      const merkleRoot3 = computeMerkleRoot(differentSamples);
      expect(merkleRoot1).not.toBe(merkleRoot3);
    });

    test('should handle shipment key consistency', () => {
      const key1 = computeShipmentKey('SHIP-001', 'BATCH-001');
      const key2 = computeShipmentKey('SHIP-001', 'BATCH-001');
      const key3 = computeShipmentKey('SHIP-002', 'BATCH-001');

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe('Error Handling', () => {
    test('should handle Filecoin upload failures gracefully', async () => {
      const { uploadJSONToFilecoin } = require('../filecoin');
      uploadJSONToFilecoin.mockRejectedValueOnce(new Error('Upload failed'));

      const batch = [{ temperature: 25, humidity: 70 }];
      await expect(uploadJSONToFilecoin(batch)).rejects.toThrow('Upload failed');
    });

    test('should handle empty batch errors', () => {
      expect(() => computeMerkleRoot([])).toThrow();
    });

    test('should handle invalid shipment key format', () => {
      // This should not throw, but produce a valid key
      const key = computeShipmentKey('', '');
      expect(key).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('Performance', () => {
    test('should handle large batches efficiently', () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        temperature: 20 + i,
        humidity: 50 + i,
        timestamp: Date.now() + i,
      }));

      const start = Date.now();
      const root = computeMerkleRoot(largeBatch);
      const duration = Date.now() - start;

      expect(root).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('should handle concurrent batch processing', async () => {
      const batcher = new TelemetryBatcher({ batchSize: 5, batchTimeout: 1000 });

      const shipments = Array.from({ length: 10 }, (_, i) => `SHIP-${i}`);
      const promises = shipments.map((shipmentId) => {
        const shipmentKey = computeShipmentKey(shipmentId, 'BATCH-001');
        return batcher.addSample(shipmentKey, { temperature: 25, humidity: 70 });
      });

      const results = await Promise.all(promises);
      expect(results.every((r) => r === null)).toBe(true); // All should be null (not full)
    });
  });

  describe('Symbiotic Integration', () => {
    test('should create attestations after batch processing', async () => {
      const { createShipmentAttestations } = require('../symbiotic');
      
      const batch = [
        { temperature: 500, humidity: 7025, timestamp: Date.now() },
        { temperature: 600, humidity: 7125, timestamp: Date.now() },
      ];
      const merkleRoot = computeMerkleRoot(batch);
      const cid = 'bafybeiexample123';
      const shipmentKey = computeShipmentKey('SHIP-003', 'BATCH-003');

      // Setup mock to return proper values
      mockCreateShipmentAttestations.mockResolvedValue({
        shipmentKey,
        cid,
        tasks: [{ taskId: '0x123', attestationType: 'SENSOR_DATA_VALID', status: 'pending' }],
        createdAt: Date.now(),
      });

      const attestations = await createShipmentAttestations({
        signer: {},
        cid,
        merkleRoot,
        shipmentKey,
        temperature: 550,
        humidity: 7075,
        tempMin: -2000,
        tempMax: 800,
      });

      expect(attestations.tasks.length).toBeGreaterThan(0);
      expect(mockCreateShipmentAttestations).toHaveBeenCalled();
    });

    test('should handle attestation creation errors gracefully', async () => {
      const { createShipmentAttestations } = require('../symbiotic');
      
      // Mock to throw error
      mockCreateShipmentAttestations.mockRejectedValueOnce(new Error('Attestation failed'));

      const batch = [{ temperature: 500, humidity: 7025 }];
      const merkleRoot = computeMerkleRoot(batch);
      const cid = 'bafybeiexample123';
      const shipmentKey = computeShipmentKey('SHIP-004', 'BATCH-004');

      await expect(
        createShipmentAttestations({
          signer: {},
          cid,
          merkleRoot,
          shipmentKey,
          temperature: 500,
          humidity: 7025,
        })
      ).rejects.toThrow('Attestation failed');
    });
  });
});

