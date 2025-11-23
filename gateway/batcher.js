/**
 * Batcher - collects telemetry samples and batches them for processing
 */

class TelemetryBatcher {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10; // Default: 10 samples per batch
    this.batchTimeout = options.batchTimeout || 30000; // Default: 30 seconds
    this.batches = new Map(); // shipmentKey -> batch
    this.timers = new Map(); // shipmentKey -> timeout
  }

  /**
   * Add a telemetry sample to a batch
   * Returns batch if it's ready to process, null otherwise
   */
  addSample(shipmentKey, sample) {
    if (!this.batches.has(shipmentKey)) {
      this.batches.set(shipmentKey, []);
      this.startTimer(shipmentKey);
    }

    const batch = this.batches.get(shipmentKey);
    batch.push({
      ...sample,
      timestamp: Date.now(),
    });

    // Check if batch is full
    if (batch.length >= this.batchSize) {
      return this.flushBatch(shipmentKey);
    }

    return null;
  }

  /**
   * Start timeout timer for a batch
   */
  startTimer(shipmentKey) {
    // Clear existing timer
    if (this.timers.has(shipmentKey)) {
      clearTimeout(this.timers.get(shipmentKey));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.flushBatch(shipmentKey);
    }, this.batchTimeout);

    // Unref timer to prevent it from keeping the process alive (for testing)
    if (timer.unref) {
      timer.unref();
    }

    this.timers.set(shipmentKey, timer);
  }

  /**
   * Flush a batch (process and clear it)
   */
  flushBatch(shipmentKey) {
    const batch = this.batches.get(shipmentKey);
    if (!batch || batch.length === 0) {
      return null;
    }

    // Clear timer
    if (this.timers.has(shipmentKey)) {
      clearTimeout(this.timers.get(shipmentKey));
      this.timers.delete(shipmentKey);
    }

    // Remove batch
    this.batches.delete(shipmentKey);

    return batch;
  }

  /**
   * Get current batch for a shipment (without flushing)
   */
  getBatch(shipmentKey) {
    return this.batches.get(shipmentKey) || [];
  }

  /**
   * Force flush all batches
   */
  flushAll() {
    const allBatches = [];
    for (const shipmentKey of this.batches.keys()) {
      const batch = this.flushBatch(shipmentKey);
      if (batch) {
        allBatches.push({ shipmentKey, batch });
      }
    }
    return allBatches;
  }
}

module.exports = TelemetryBatcher;

