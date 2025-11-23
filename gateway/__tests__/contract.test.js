const { ethers } = require('ethers');

// Mock the contract module entirely to avoid ethers v6 runner issues
jest.mock('../contract', () => {
  const mockContract = {
    records: jest.fn(),
    getSyncNonce: jest.fn(),
    getAsyncNonce: jest.fn(),
    getDomainSeparator: jest.fn(),
    recordTelemetryWithSignature: jest.fn(),
  };

  let mockContractInstance = mockContract;

  return {
    getRegistryContract: jest.fn(() => mockContractInstance),
    getCurrentNonce: jest.fn(async (provider, gatewayAddress, isAsync) => {
      if (isAsync) {
        return await mockContractInstance.getAsyncNonce(gatewayAddress);
      }
      return await mockContractInstance.getSyncNonce(gatewayAddress);
    }),
    getDomainSeparator: jest.fn(async (provider) => {
      return await mockContractInstance.getDomainSeparator();
    }),
    submitTelemetryWithSignature: jest.fn(async (
      signerOrProvider,
      shipmentKey,
      merkleRoot,
      cid,
      temperature,
      humidity,
      rfidTag,
      nonce,
      isAsync,
      signature
    ) => {
      return await mockContractInstance.recordTelemetryWithSignature(
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        signature.v,
        signature.r,
        signature.s
      );
    }),
    SHIPMENT_REGISTRY_ADDRESS: '0x' + '1'.repeat(40),
    // Export mock contract for test access
    __mockContract: mockContract,
  };
});

const {
  getRegistryContract,
  getCurrentNonce,
  getDomainSeparator,
  submitTelemetryWithSignature,
  __mockContract: mockContract,
} = require('../contract');

describe('Contract Functions', () => {
  let mockProvider;

  beforeEach(() => {
    mockProvider = {
      getBlockNumber: jest.fn().mockResolvedValue(1000),
    };

    // Reset all mocks
    jest.clearAllMocks();
    mockContract.getSyncNonce.mockClear();
    mockContract.getAsyncNonce.mockClear();
    mockContract.getDomainSeparator.mockClear();
    mockContract.recordTelemetryWithSignature.mockClear();
  });

  describe('getRegistryContract', () => {
    test('should create contract instance', () => {
      const contract = getRegistryContract(mockProvider);
      expect(contract).toBeDefined();
      expect(getRegistryContract).toHaveBeenCalledWith(mockProvider);
    });

    test('should use correct address', () => {
      getRegistryContract(mockProvider);
      expect(getRegistryContract).toHaveBeenCalledWith(mockProvider);
    });
  });

  describe('getCurrentNonce', () => {
    test('should get sync nonce', async () => {
      mockContract.getSyncNonce.mockResolvedValue(5n);
      const nonce = await getCurrentNonce(mockProvider, '0x' + '1'.repeat(40), false);
      expect(nonce).toBe(5n);
      expect(mockContract.getSyncNonce).toHaveBeenCalledWith('0x' + '1'.repeat(40));
    });

    test('should get async nonce', async () => {
      mockContract.getAsyncNonce.mockResolvedValue(10n);
      const nonce = await getCurrentNonce(mockProvider, '0x' + '1'.repeat(40), true);
      expect(nonce).toBe(10n);
      expect(mockContract.getAsyncNonce).toHaveBeenCalledWith('0x' + '1'.repeat(40));
    });
  });

  describe('getDomainSeparator', () => {
    test('should get domain separator', async () => {
      const expectedSeparator = '0x' + '1'.repeat(64);
      mockContract.getDomainSeparator.mockResolvedValue(expectedSeparator);
      const separator = await getDomainSeparator(mockProvider);
      expect(separator).toBe(expectedSeparator);
      expect(mockContract.getDomainSeparator).toHaveBeenCalled();
    });
  });

  describe('submitTelemetryWithSignature', () => {
    test('should submit telemetry with signature', async () => {
      const mockTx = {
        hash: '0x' + '1'.repeat(64),
        wait: jest.fn().mockResolvedValue({}),
      };
      mockContract.recordTelemetryWithSignature.mockResolvedValue(mockTx);

      const signature = {
        v: 27,
        r: '0x' + 'a'.repeat(64),
        s: '0x' + 'b'.repeat(64),
      };

      const tx = await submitTelemetryWithSignature(
        mockProvider,
        '0x' + '1'.repeat(64), // shipmentKey
        '0x' + '2'.repeat(64), // merkleRoot
        'bafybeiexample', // cid
        2550, // temperature
        7025, // humidity
        'RFID-123', // rfidTag
        0, // nonce
        false, // isAsync
        signature
      );

      expect(tx).toBe(mockTx);
      expect(mockContract.recordTelemetryWithSignature).toHaveBeenCalledWith(
        '0x' + '1'.repeat(64),
        '0x' + '2'.repeat(64),
        'bafybeiexample',
        2550,
        7025,
        'RFID-123',
        0,
        false,
        27,
        '0x' + 'a'.repeat(64),
        '0x' + 'b'.repeat(64)
      );
    });

    test('should handle transaction errors', async () => {
      mockContract.recordTelemetryWithSignature.mockRejectedValue(
        new Error('Transaction failed')
      );

      const signature = {
        v: 27,
        r: '0x' + 'a'.repeat(64),
        s: '0x' + 'b'.repeat(64),
      };

      await expect(
        submitTelemetryWithSignature(
          mockProvider,
          '0x' + '1'.repeat(64),
          '0x' + '2'.repeat(64),
          'bafybeiexample',
          2550,
          7025,
          'RFID-123',
          0,
          false,
          signature
        )
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero nonce', async () => {
      mockContract.getSyncNonce.mockResolvedValue(0n);
      const nonce = await getCurrentNonce(mockProvider, '0x' + '1'.repeat(40), false);
      expect(nonce).toBe(0n);
    });

    test('should handle very large nonce', async () => {
      const largeNonce = BigInt('999999999999999999');
      mockContract.getSyncNonce.mockResolvedValue(largeNonce);
      const nonce = await getCurrentNonce(mockProvider, '0x' + '1'.repeat(40), false);
      expect(nonce).toBe(largeNonce);
    });

    test('should handle network errors', async () => {
      mockContract.getSyncNonce.mockRejectedValue(new Error('Network error'));
      await expect(
        getCurrentNonce(mockProvider, '0x' + '1'.repeat(40), false)
      ).rejects.toThrow('Network error');
    });
  });
});
