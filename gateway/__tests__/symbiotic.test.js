/**
 * Tests for Symbiotic Relay integration
 */

const {
  initSymbiotic,
  createAttestationTask,
  createShipmentAttestations,
  getAttestationResult,
  verifySensorDataValidity,
  verifyTemperatureThreshold,
  verifyMerkleIntegrity,
  verifyFilecoinDataset,
  verifyShipmentIntegrity,
  ATTESTATION_TYPES,
  DEFAULT_TEMP_MIN,
  DEFAULT_TEMP_MAX,
} = require('../symbiotic');

const { computeMerkleRoot } = require('../merkle');

// Mock Filecoin
jest.mock('../filecoin', () => ({
  fetchFromFilecoin: jest.fn(),
}));

// Mock ethers
jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers');
  return {
    ...actualEthers,
    Contract: jest.fn(),
  };
});

const { fetchFromFilecoin } = require('../filecoin');
const { ethers } = require('ethers');

describe('Symbiotic Integration', () => {
  let mockProvider;
  let mockContract;

  beforeEach(() => {
    // Set environment variable FIRST, before any module operations
    process.env.SYMBIOTIC_RELAY_ADDRESS = '0x4826533B4897376654Bb4d4AD88B7faFD0C98528';
    
    // Reset mocks
    jest.clearAllMocks();

    // Mock provider
    mockProvider = {
      network: { name: 'testnet' },
    };

    // Mock contract
    mockContract = {
      responses: jest.fn(),
    };

    // Ensure Contract mock returns our mock contract
    ethers.Contract = jest.fn(() => mockContract);
  });

  afterEach(() => {
    delete process.env.SYMBIOTIC_RELAY_ADDRESS;
  });

  describe('initSymbiotic', () => {
    test('should initialize Symbiotic Relay with valid address', () => {
      const contract = initSymbiotic(mockProvider);
      expect(contract).toBeDefined();
      expect(contract).not.toBeNull();
      // Verify it's a contract-like object (has responses method or is an ethers Contract)
      expect(contract).toHaveProperty('target');
    });

    test('should return null when address not set', () => {
      const originalEnv = process.env.SYMBIOTIC_RELAY_ADDRESS;
      delete process.env.SYMBIOTIC_RELAY_ADDRESS;
      
      // Need to reload module to get fresh constant
      jest.resetModules();
      const { initSymbiotic: freshInit } = require('../symbiotic');
      const contract = freshInit(mockProvider);
      expect(contract).toBeNull();
      
      // Restore
      process.env.SYMBIOTIC_RELAY_ADDRESS = originalEnv;
    });

    test('should warn when address not set', () => {
      const originalEnv = process.env.SYMBIOTIC_RELAY_ADDRESS;
      delete process.env.SYMBIOTIC_RELAY_ADDRESS;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Need to reload module to get fresh constant
      jest.resetModules();
      const { initSymbiotic: freshInit } = require('../symbiotic');
      freshInit(mockProvider);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SYMBIOTIC_RELAY_ADDRESS not set')
      );
      consoleSpy.mockRestore();
      
      // Restore
      process.env.SYMBIOTIC_RELAY_ADDRESS = originalEnv;
    });
  });

  describe('verifySensorDataValidity', () => {
    test('should verify valid sensor data', async () => {
      const batchData = [
        { temperature: 2500, humidity: 7025, timestamp: Date.now() },
        { temperature: 2600, humidity: 7125, timestamp: Date.now() },
      ];
      const merkleRoot = computeMerkleRoot(batchData);

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifySensorDataValidity('bafy123', merkleRoot);

      expect(result.valid).toBe(true);
      expect(result.batchSize).toBe(2);
      expect(result.merkleRoot).toBe(merkleRoot);
    });

    test('should fail when Merkle root mismatch', async () => {
      const batchData = [
        { temperature: 2500, humidity: 7025, timestamp: Date.now() },
      ];
      const wrongRoot = '0x' + '1'.repeat(64);

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifySensorDataValidity('bafy123', wrongRoot);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Merkle root mismatch');
    });

    test('should fail when data structure invalid', async () => {
      const invalidData = [{ invalid: 'data' }];
      // Use the actual merkle root of the invalid data
      const merkleRoot = computeMerkleRoot(invalidData);

      fetchFromFilecoin.mockResolvedValue(invalidData);

      const result = await verifySensorDataValidity('bafy123', merkleRoot);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid sample structure');
    });

    test('should handle Filecoin fetch errors', async () => {
      fetchFromFilecoin.mockRejectedValue(new Error('Fetch failed'));

      const result = await verifySensorDataValidity('bafy123', '0x123');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Verification error');
    });
  });

  describe('verifyTemperatureThreshold', () => {
    test('should verify temperature within threshold', async () => {
      const batchData = [
        { temperature: 500, humidity: 70 }, // 5°C
        { temperature: 600, humidity: 71 }, // 6°C
        { temperature: 700, humidity: 72 }, // 7°C
      ];

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifyTemperatureThreshold('bafy123', -2000, 800);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.violationCount).toBe(0);
    });

    test('should detect temperature violations', async () => {
      const batchData = [
        { temperature: 500, humidity: 70 },  // 5°C - OK
        { temperature: 1000, humidity: 71 }, // 10°C - VIOLATION (max is 8°C)
        { temperature: -2500, humidity: 72 }, // -25°C - VIOLATION (min is -20°C)
      ];

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifyTemperatureThreshold('bafy123', -2000, 800);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violationCount).toBe(2);
    });

    test('should handle empty batch', async () => {
      fetchFromFilecoin.mockResolvedValue([]);

      const result = await verifyTemperatureThreshold('bafy123', -2000, 800);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('verifyMerkleIntegrity', () => {
    test('should verify matching Merkle root', async () => {
      const batchData = [
        { temperature: 2500, humidity: 7025, timestamp: Date.now() },
      ];
      const merkleRoot = computeMerkleRoot(batchData);

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifyMerkleIntegrity('bafy123', merkleRoot);

      expect(result.valid).toBe(true);
      expect(result.match).toBe(true);
      expect(result.expectedRoot).toBe(merkleRoot);
      expect(result.computedRoot).toBe(merkleRoot);
    });

    test('should detect Merkle root mismatch', async () => {
      const batchData = [
        { temperature: 2500, humidity: 7025, timestamp: Date.now() },
      ];
      const wrongRoot = '0x' + '1'.repeat(64);

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifyMerkleIntegrity('bafy123', wrongRoot);

      expect(result.valid).toBe(false);
      expect(result.match).toBe(false);
    });
  });

  describe('verifyFilecoinDataset', () => {
    test('should verify accessible dataset', async () => {
      const batchData = [{ temperature: 2500, humidity: 7025 }];
      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifyFilecoinDataset('bafy123');

      expect(result.valid).toBe(true);
      expect(result.accessible).toBe(true);
      expect(result.cid).toBe('bafy123');
    });

    test('should handle inaccessible dataset', async () => {
      fetchFromFilecoin.mockRejectedValue(new Error('Not found'));

      const result = await verifyFilecoinDataset('bafy123');

      expect(result.valid).toBe(false);
      expect(result.accessible).toBe(false);
      expect(result.reason).toContain('Filecoin fetch error');
    });
  });

  describe('verifyShipmentIntegrity', () => {
    test('should verify complete shipment integrity', async () => {
      const batchData = [
        { temperature: 500, humidity: 7025, timestamp: Date.now() },
        { temperature: 600, humidity: 7125, timestamp: Date.now() },
      ];
      const merkleRoot = computeMerkleRoot(batchData);

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifyShipmentIntegrity({
        cid: 'bafy123',
        merkleRoot,
        shipmentKey: '0x' + '1'.repeat(64),
        temperature: 550,
        tempMin: -2000,
        tempMax: 800,
      });

      expect(result.overallValid).toBe(true);
      expect(result.checks.filecoin.valid).toBe(true);
      expect(result.checks.merkle.valid).toBe(true);
      expect(result.checks.temperature.valid).toBe(true);
      expect(result.checks.sensorData.valid).toBe(true);
    });

    test('should detect integrity failures', async () => {
      const batchData = [
        { temperature: 1000, humidity: 7025, timestamp: Date.now() }, // Violation
      ];
      const wrongRoot = '0x' + '1'.repeat(64);

      fetchFromFilecoin.mockResolvedValue(batchData);

      const result = await verifyShipmentIntegrity({
        cid: 'bafy123',
        merkleRoot: wrongRoot,
        shipmentKey: '0x' + '1'.repeat(64),
        temperature: 1000,
        tempMin: -2000,
        tempMax: 800,
      });

      expect(result.overallValid).toBe(false);
      expect(result.checks.temperature.valid).toBe(false); // Temperature violation
      expect(result.checks.merkle.valid).toBe(false); // Merkle mismatch
    });
  });

  describe('createAttestationTask', () => {
    test('should create attestation task', async () => {
      // Initialize first
      const contract = initSymbiotic(mockProvider);
      expect(contract).toBeDefined();

      const mockSigner = {};
      const taskData = '0x' + '1'.repeat(128);

      const result = await createAttestationTask(
        mockSigner,
        ATTESTATION_TYPES.SENSOR_DATA_VALID,
        taskData
      );

      expect(result).toBeDefined();
      expect(result.taskId).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.attestationType).toBe(ATTESTATION_TYPES.SENSOR_DATA_VALID);
      expect(result.status).toBe('pending');
    });

    test('should throw error when Symbiotic not initialized', async () => {
      const originalEnv = process.env.SYMBIOTIC_RELAY_ADDRESS;
      delete process.env.SYMBIOTIC_RELAY_ADDRESS;
      
      jest.resetModules();
      const { initSymbiotic: freshInit, createAttestationTask: freshCreateTask, ATTESTATION_TYPES: freshTypes } = require('../symbiotic');
      freshInit(mockProvider);

      const mockSigner = {};
      const taskData = '0x' + '1'.repeat(128);

      await expect(
        freshCreateTask(mockSigner, freshTypes.SENSOR_DATA_VALID, taskData)
      ).rejects.toThrow('Symbiotic Relay not initialized');
      
      // Restore
      process.env.SYMBIOTIC_RELAY_ADDRESS = originalEnv;
    });
  });

  describe('createShipmentAttestations', () => {
    test('should create all attestation tasks', async () => {
      // Initialize first
      const contract = initSymbiotic(mockProvider);
      expect(contract).toBeDefined();

      const mockSigner = {};
      const result = await createShipmentAttestations({
        signer: mockSigner,
        cid: 'bafy123',
        merkleRoot: '0x' + '2'.repeat(64),
        shipmentKey: '0x' + '1'.repeat(64),
        temperature: 550,
        humidity: 7025,
        tempMin: -2000,
        tempMax: 800,
      });

      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(5);
      expect(result.cid).toBe('bafy123');
      expect(result.shipmentKey).toBe('0x' + '1'.repeat(64));

      // Check all attestation types are created
      const types = result.tasks.map((t) => t.attestationType);
      expect(types).toContain(ATTESTATION_TYPES.SENSOR_DATA_VALID);
      expect(types).toContain(ATTESTATION_TYPES.TEMPERATURE_THRESHOLD);
      expect(types).toContain(ATTESTATION_TYPES.MERKLE_INTEGRITY);
      expect(types).toContain(ATTESTATION_TYPES.FILECOIN_VERIFIED);
      expect(types).toContain(ATTESTATION_TYPES.SHIPMENT_INTEGRITY);
    });
  });

  describe('getAttestationResult', () => {
    test('should get completed attestation result', async () => {
      // Initialize first - this creates the contract
      const contract = initSymbiotic(mockProvider);
      expect(contract).toBeDefined();
      
      // The contract instance should have responses method
      // Since ethers.Contract is mocked, the returned contract should be our mockContract
      // But we need to ensure the symbioticContract variable is set
      // Let's directly mock the responses on the contract that was created
      if (contract && contract.responses) {
        contract.responses = jest.fn().mockResolvedValue({
          timestamp: 1234567890n,
          result: 1n,
        });
      }

      const taskId = '0x' + '1'.repeat(64);
      
      // Also ensure mockContract has the method
      mockContract.responses.mockResolvedValue({
        timestamp: 1234567890n,
        result: 1n,
      });

      const result = await getAttestationResult(taskId);

      expect(result.completed).toBe(true);
      expect(result.timestamp).toBe(1234567890);
      expect(result.result).toBe('1');
    });

    test('should handle incomplete task', async () => {
      // Initialize first
      const contract = initSymbiotic(mockProvider);
      expect(contract).toBeDefined();

      const taskId = '0x' + '1'.repeat(64);
      mockContract.responses.mockRejectedValue(new Error('Task not found'));

      const result = await getAttestationResult(taskId);

      expect(result.completed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Constants', () => {
    test('should have correct attestation types', () => {
      expect(ATTESTATION_TYPES.SENSOR_DATA_VALID).toBe('SENSOR_DATA_VALID');
      expect(ATTESTATION_TYPES.TEMPERATURE_THRESHOLD).toBe('TEMPERATURE_THRESHOLD');
      expect(ATTESTATION_TYPES.MERKLE_INTEGRITY).toBe('MERKLE_INTEGRITY');
      expect(ATTESTATION_TYPES.FILECOIN_VERIFIED).toBe('FILECOIN_VERIFIED');
      expect(ATTESTATION_TYPES.SHIPMENT_INTEGRITY).toBe('SHIPMENT_INTEGRITY');
    });

    test('should have correct default temperature thresholds', () => {
      expect(DEFAULT_TEMP_MIN).toBe(-2000); // -20°C
      expect(DEFAULT_TEMP_MAX).toBe(800);   // 8°C
    });
  });
});

