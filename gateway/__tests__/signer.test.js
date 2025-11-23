const { ethers } = require('ethers');
const { computeShipmentKey, createSignature } = require('../signer');

describe('Signer Functions', () => {
  describe('computeShipmentKey', () => {
    test('should compute shipment key correctly', () => {
      const key = computeShipmentKey('SHIPMENT-001', 'BATCH-0001');
      expect(key).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should produce same key for same inputs', () => {
      const key1 = computeShipmentKey('SHIPMENT-001', 'BATCH-0001');
      const key2 = computeShipmentKey('SHIPMENT-001', 'BATCH-0001');
      expect(key1).toBe(key2);
    });

    test('should produce different keys for different inputs', () => {
      const key1 = computeShipmentKey('SHIPMENT-001', 'BATCH-0001');
      const key2 = computeShipmentKey('SHIPMENT-002', 'BATCH-0001');
      expect(key1).not.toBe(key2);
    });

    test('should handle empty strings', () => {
      const key = computeShipmentKey('', '');
      expect(key).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should handle special characters', () => {
      const key = computeShipmentKey('SHIPMENT-001!@#', 'BATCH-0001$%^');
      expect(key).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('createSignature', () => {
    let signer;
    let provider;

    beforeAll(() => {
      // Use a mock provider for testing
      provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
      signer = new ethers.Wallet(
        '0x' + '1'.repeat(64), // Dummy private key for testing
        provider
      );
    });

    test('should create signature with correct structure', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const domainSeparator = '0x' + '2'.repeat(64);
      const shipmentKey = '0x' + '3'.repeat(64);
      const merkleRoot = '0x' + '4'.repeat(64);
      const cid = 'bafybeiexample';
      const temperature = 2550;
      const humidity = 7025;
      const rfidTag = 'RFID-123';
      const nonce = 0;
      const isAsync = false;

      // Mock the signTypedData method
      // Mock a valid signature serialized format
      // ethers v6 Signature.serialized is a hex string: 0x + r (64) + s (64) + v (2)
      // v is 00 or 01 (recovery id), then 1b or 1c is added
      const mockR = '0x' + '1'.repeat(64);
      const mockS = '0x' + '2'.repeat(64);
      // Create a proper canonical signature (s must be <= secp256k1n/2)
      // Use a small value that's definitely canonical
      const canonicalS = '0x' + '1'.padStart(64, '0');
      const mockSerialized = mockR.slice(2) + canonicalS.slice(2) + '1b'; // v=27 = 0x1b

      signer.signTypedData = jest.fn().mockResolvedValue('0x' + mockSerialized);

      signer.provider = {
        getNetwork: jest.fn().mockResolvedValue({ chainId: 421614n }),
      };

      const signature = await createSignature(
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
      );

      expect(signature).toHaveProperty('v');
      expect(signature).toHaveProperty('r');
      expect(signature).toHaveProperty('s');
      expect(typeof signature.v).toBe('number');
      expect(signature.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(signature.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should handle negative temperatures', async () => {
      const contractAddress = '0x' + '1'.repeat(40);
      const domainSeparator = '0x' + '2'.repeat(64);
      const shipmentKey = '0x' + '3'.repeat(64);
      const merkleRoot = '0x' + '4'.repeat(64);
      const cid = 'bafybeiexample';
      const temperature = -500; // -5.00°C
      const humidity = 7025;
      const rfidTag = 'RFID-123';
      const nonce = 0;
      const isAsync = false;

      // Mock a valid signature serialized format
      const mockR = '0x' + '1'.repeat(64);
      const canonicalS = '0x' + '1'.padStart(64, '0');
      const mockSerialized = mockR.slice(2) + canonicalS.slice(2) + '1b'; // v=27 = 0x1b

      signer.signTypedData = jest.fn().mockResolvedValue('0x' + mockSerialized);

      signer.provider = {
        getNetwork: jest.fn().mockResolvedValue({ chainId: 421614n }),
      };

      const signature = await createSignature(
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
      );

      expect(signature).toHaveProperty('v');
      expect(signature).toHaveProperty('r');
      expect(signature).toHaveProperty('s');
    });
  });
});

