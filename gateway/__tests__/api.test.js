const request = require('supertest');
const express = require('express');

// Mock dependencies before importing index.js
jest.mock('../filecoin', () => ({
  uploadJSONToFilecoin: jest.fn().mockResolvedValue('bafybeiexample123'),
  fetchFromFilecoin: jest.fn().mockResolvedValue([
    { temperature: 25, humidity: 70 },
  ]),
}));

// Create a mock contract instance that can be modified
const mockContractInstance = {
  records: jest.fn().mockResolvedValue({
    gateway: '0x' + '1'.repeat(40),
    merkleRoot: '0x' + '2'.repeat(64),
    cid: 'bafybeiexample',
    timestamp: 1234567890n,
    temperature: 2550n,
    humidity: 7025n,
    rfidTag: 'RFID-123',
  }),
  getSyncNonce: jest.fn().mockResolvedValue(0n),
  getDomainSeparator: jest.fn().mockResolvedValue('0x' + '3'.repeat(64)),
  recordTelemetryWithSignature: jest.fn().mockResolvedValue({
    hash: '0x' + '4'.repeat(64),
    wait: jest.fn().mockResolvedValue({}),
  }),
};

jest.mock('../contract', () => {
  const { ethers } = require('ethers');
  return {
    getRegistryContract: jest.fn(() => mockContractInstance),
    getCurrentNonce: jest.fn().mockResolvedValue(0n),
    getDomainSeparator: jest.fn().mockResolvedValue('0x' + '3'.repeat(64)),
    submitTelemetryWithSignature: jest.fn().mockResolvedValue({
      hash: '0x' + '4'.repeat(64),
      wait: jest.fn().mockResolvedValue({}),
    }),
    SHIPMENT_REGISTRY_ADDRESS: '0x' + '1'.repeat(40),
  };
});

// Set environment variables before importing
process.env.NODE_ENV = 'test';
process.env.GATEWAY_PRIVATE_KEY = '0x' + '1'.repeat(64);
process.env.RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
process.env.REGISTRY_EVVM = '0x' + '1'.repeat(40);
process.env.PORT = '3001';

let app;

beforeAll(() => {
  // Clear module cache to ensure fresh import
  jest.resetModules();
  app = require('../index');
});

describe('Gateway API', () => {
  describe('POST /telemetry', () => {
    test('should accept valid telemetry data', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          batchId: 'BATCH-0001',
          temperature: 25.50,
          humidity: 70.25,
          rfidTag: 'RFID-123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('shipmentKey');
      expect(response.body).toHaveProperty('batchSize');
    });

    test('should reject missing shipmentId', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          batchId: 'BATCH-0001',
          temperature: 25.50,
          humidity: 70.25,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('shipmentId');
    });

    test('should reject missing batchId', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          temperature: 25.50,
          humidity: 70.25,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('batchId');
    });

    test('should reject missing temperature', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          batchId: 'BATCH-0001',
          humidity: 70.25,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('temperature');
    });

    test('should reject missing humidity', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          batchId: 'BATCH-0001',
          temperature: 25.50,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('humidity');
    });

    test('should handle negative temperatures', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          batchId: 'BATCH-0001',
          temperature: -5.0,
          humidity: 70.25,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should handle optional rfidTag', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          batchId: 'BATCH-0001',
          temperature: 25.50,
          humidity: 70.25,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should handle optional metadata', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          batchId: 'BATCH-0001',
          temperature: 25.50,
          humidity: 70.25,
          metadata: { location: 'A1', sensor: 'S1' },
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send('invalid json')
        .expect(400);
    });

    test('should handle very large values', async () => {
      const response = await request(app)
        .post('/telemetry')
        .send({
          shipmentId: 'SHIPMENT-001',
          batchId: 'BATCH-0001',
          temperature: 1000.0,
          humidity: 200.0,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /shipment/:shipmentKey', () => {
    test('should return shipment data', async () => {
      const shipmentKey = '0x' + '1'.repeat(64);
      const response = await request(app)
        .get(`/shipment/${shipmentKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('shipmentKey');
      expect(response.body).toHaveProperty('onChain');
      expect(response.body.onChain).toHaveProperty('gateway');
      expect(response.body.onChain).toHaveProperty('cid');
    });

    test('should return 404 for non-existent shipment', async () => {
      const { ethers } = require('ethers');
      // Override the mock to return zero address
      mockContractInstance.records.mockResolvedValueOnce({
        gateway: ethers.ZeroAddress, // Use ethers.ZeroAddress for consistency
        merkleRoot: '0x' + '0'.repeat(64),
        cid: '',
        timestamp: 0n,
        temperature: 0n,
        humidity: 0n,
        rfidTag: '',
      });

      const shipmentKey = '0x' + '2'.repeat(64);
      const response = await request(app)
        .get(`/shipment/${shipmentKey}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle invalid shipmentKey format', async () => {
      const response = await request(app)
        .get('/shipment/invalid-key')
        .expect(500);
    });
  });

  describe('GET /batch/:shipmentKey', () => {
    test('should return batch status', async () => {
      const shipmentKey = '0x' + '1'.repeat(64);
      const response = await request(app)
        .get(`/batch/${shipmentKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('shipmentKey');
      expect(response.body).toHaveProperty('batchSize');
      expect(response.body).toHaveProperty('samples');
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('gateway');
      expect(response.body).toHaveProperty('contract');
    });
  });
});

