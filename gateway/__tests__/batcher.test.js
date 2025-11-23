const TelemetryBatcher = require('../batcher');

describe('TelemetryBatcher', () => {
  afterEach(() => {
    // Clear all timers after each test to prevent leaks
    jest.clearAllTimers();
  });
  let batcher;

  beforeEach(() => {
    batcher = new TelemetryBatcher({
      batchSize: 3,
      batchTimeout: 1000,
    });
  });

  afterEach(() => {
    // Clear any pending timers
    batcher.flushAll();
  });

  describe('addSample', () => {
    test('should add sample to batch', () => {
      const sample = { temperature: 25, humidity: 70 };
      const result = batcher.addSample('shipment-1', sample);
      expect(result).toBeNull(); // Batch not full yet
      expect(batcher.getBatch('shipment-1')).toHaveLength(1);
    });

    test('should return batch when full', () => {
      const samples = [
        { temperature: 25, humidity: 70 },
        { temperature: 26, humidity: 71 },
        { temperature: 27, humidity: 72 },
      ];

      let batch = null;
      for (const sample of samples) {
        batch = batcher.addSample('shipment-1', sample);
      }

      expect(batch).not.toBeNull();
      expect(batch).toHaveLength(3);
      expect(batcher.getBatch('shipment-1')).toHaveLength(0); // Batch flushed
    });

    test('should handle multiple shipments independently', () => {
      batcher.addSample('shipment-1', { temperature: 25 });
      batcher.addSample('shipment-2', { temperature: 26 });
      batcher.addSample('shipment-1', { temperature: 27 });

      expect(batcher.getBatch('shipment-1')).toHaveLength(2);
      expect(batcher.getBatch('shipment-2')).toHaveLength(1);
    });

    test('should add timestamp to samples', () => {
      const sample = { temperature: 25, humidity: 70 };
      batcher.addSample('shipment-1', sample);
      const batch = batcher.getBatch('shipment-1');
      expect(batch[0]).toHaveProperty('timestamp');
      expect(typeof batch[0].timestamp).toBe('number');
    });
  });

  describe('flushBatch', () => {
    test('should flush batch and return samples', () => {
      batcher.addSample('shipment-1', { temperature: 25 });
      batcher.addSample('shipment-1', { temperature: 26 });
      const batch = batcher.flushBatch('shipment-1');
      expect(batch).toHaveLength(2);
      expect(batcher.getBatch('shipment-1')).toHaveLength(0);
    });

    test('should return null for empty batch', () => {
      const batch = batcher.flushBatch('shipment-1');
      expect(batch).toBeNull();
    });

    test('should clear timer when flushing', () => {
      batcher.addSample('shipment-1', { temperature: 25 });
      expect(batcher.timers.has('shipment-1')).toBe(true);
      batcher.flushBatch('shipment-1');
      expect(batcher.timers.has('shipment-1')).toBe(false);
    });
  });

  describe('timeout behavior', () => {
    test('should flush batch after timeout', (done) => {
      const batcherWithShortTimeout = new TelemetryBatcher({
        batchSize: 10,
        batchTimeout: 100,
      });

      batcherWithShortTimeout.addSample('shipment-1', { temperature: 25 });
      expect(batcherWithShortTimeout.getBatch('shipment-1')).toHaveLength(1);

      setTimeout(() => {
        expect(batcherWithShortTimeout.getBatch('shipment-1')).toHaveLength(0);
        done();
      }, 150);
    }, 200);
  });

  describe('flushAll', () => {
    test('should flush all batches', () => {
      batcher.addSample('shipment-1', { temperature: 25 });
      batcher.addSample('shipment-2', { temperature: 26 });
      batcher.addSample('shipment-3', { temperature: 27 });

      const allBatches = batcher.flushAll();
      expect(allBatches).toHaveLength(3);
      expect(batcher.batches.size).toBe(0);
    });

    test('should return empty array when no batches', () => {
      const allBatches = batcher.flushAll();
      expect(allBatches).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle very large batch size', () => {
      const largeBatcher = new TelemetryBatcher({ batchSize: 1000 });
      // Add 999 items (one less than batchSize to avoid auto-flush)
      for (let i = 0; i < 999; i++) {
        largeBatcher.addSample('shipment-1', { temperature: i });
      }
      const batch = largeBatcher.getBatch('shipment-1');
      expect(batch).toHaveLength(999);
      
      // Adding the 1000th item should trigger flush and return the batch
      const flushedBatch = largeBatcher.addSample('shipment-1', { temperature: 999 });
      expect(flushedBatch).toHaveLength(1000);
      // After flush, batch should be empty
      expect(largeBatcher.getBatch('shipment-1')).toHaveLength(0);
    });

    test('should handle rapid additions', () => {
      for (let i = 0; i < 100; i++) {
        batcher.addSample('shipment-1', { temperature: i });
      }
      // Should have flushed multiple times
      const currentBatch = batcher.getBatch('shipment-1');
      expect(currentBatch.length).toBeLessThan(3);
    });

    test('should handle concurrent shipments', () => {
      for (let i = 0; i < 10; i++) {
        batcher.addSample(`shipment-${i}`, { temperature: i });
      }
      expect(batcher.batches.size).toBe(10);
    });
  });
});

