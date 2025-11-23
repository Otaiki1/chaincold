// Set NODE_ENV to test before any imports
process.env.NODE_ENV = 'test';
process.env.FILECOIN_PRIVATE_KEY = '0x' + '1'.repeat(64);

// Mock the Synapse SDK BEFORE importing filecoin module
const mockSynapseInstance = {
  storage: {
    upload: jest.fn().mockResolvedValue({
      pieceCid: 'bafybeiexample123',
      size: 100,
    }),
    download: jest.fn().mockResolvedValue(new Uint8Array([116, 101, 115, 116, 32, 100, 97, 116, 97])), // "test data" as Uint8Array
  },
  getWarmStorageAddress: jest.fn().mockReturnValue('0x' + '1'.repeat(40)),
  payments: {
    walletBalance: jest.fn().mockResolvedValue(BigInt('2500000000000000000')), // 2.5 USDFC
    depositWithPermitAndApproveOperator: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({}),
    }),
  },
  provider: {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 314159n }),
  },
};

jest.mock('@filoz/synapse-sdk', () => {
  return {
    Synapse: {
      create: jest.fn().mockResolvedValue(mockSynapseInstance),
    },
    RPC_URLS: {
      calibration: {
        http: 'https://api.calibration.node.glif.io/rpc/v1',
      },
    },
    TOKENS: {
      USDFC: '0x' + '2'.repeat(40),
    },
    TIME_CONSTANTS: {
      EPOCHS_PER_MONTH: 720,
    },
  };
}, { virtual: true });

// Import functions will be re-required in each test after resetModules
let uploadToFilecoin, uploadJSONToFilecoin, fetchFromFilecoin;

beforeEach(() => {
  // Re-require after resetModules
  const filecoinModule = require('../filecoin');
  uploadToFilecoin = filecoinModule.uploadToFilecoin;
  uploadJSONToFilecoin = filecoinModule.uploadJSONToFilecoin;
  fetchFromFilecoin = filecoinModule.fetchFromFilecoin;
});

describe('Filecoin Functions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset the synapse instance by re-requiring the module
    // This clears the cached synapse variable
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.FILECOIN_PRIVATE_KEY = '0x' + '1'.repeat(64);
    // Disable telemetry in tests
    process.env.SYNAPSE_TELEMETRY_DISABLED = 'true';
    
    // Re-require the mocked SDK
    jest.doMock('@filoz/synapse-sdk', () => ({
      Synapse: {
        create: jest.fn().mockResolvedValue(mockSynapseInstance),
      },
      RPC_URLS: {
        calibration: {
          http: 'https://api.calibration.node.glif.io/rpc/v1',
        },
      },
      TOKENS: {
        USDFC: '0x' + '2'.repeat(40),
      },
      TIME_CONSTANTS: {
        EPOCHS_PER_MONTH: 720,
      },
    }));
    
    // Re-require filecoin module
    const filecoinModule = require('../filecoin');
    uploadToFilecoin = filecoinModule.uploadToFilecoin;
    uploadJSONToFilecoin = filecoinModule.uploadJSONToFilecoin;
    fetchFromFilecoin = filecoinModule.fetchFromFilecoin;
  });

  afterEach(() => {
    // Clear any remaining timers
    jest.clearAllTimers();
  });

  describe('uploadToFilecoin', () => {
    test('should upload buffer to Filecoin', async () => {
      const data = Buffer.from('test data'.repeat(20)); // Ensure > 127 bytes
      const cid = await uploadToFilecoin(data);
      expect(cid).toBe('bafybeiexample123');
    });

    test('should handle different buffer sizes', async () => {
      const smallData = Buffer.alloc(127, 'a'); // Exactly 127 bytes (minimum)
      const largeData = Buffer.alloc(10000, 'a');

      const cid1 = await uploadToFilecoin(smallData);
      const cid2 = await uploadToFilecoin(largeData);

      expect(cid1).toBeDefined();
      expect(cid2).toBeDefined();
    });

    test('should handle upload errors', async () => {
      // Override the mock for this test
      const { Synapse } = require('@filoz/synapse-sdk');
      Synapse.create = jest.fn().mockResolvedValue({
        ...mockSynapseInstance,
        storage: {
          ...mockSynapseInstance.storage,
          upload: jest.fn().mockRejectedValue(new Error('Upload failed')),
        },
      });
      
      // Clear the synapse cache
      const filecoinModule = require('../filecoin');
      // Force re-initialization
      jest.resetModules();
      jest.doMock('@filoz/synapse-sdk', () => ({
        Synapse: {
          create: jest.fn().mockResolvedValue({
            ...mockSynapseInstance,
            storage: {
              ...mockSynapseInstance.storage,
              upload: jest.fn().mockRejectedValue(new Error('Upload failed')),
            },
          }),
        },
        RPC_URLS: {
          calibration: {
            http: 'https://api.calibration.node.glif.io/rpc/v1',
          },
        },
        TOKENS: {
          USDFC: '0x' + '2'.repeat(40),
        },
        TIME_CONSTANTS: {
          EPOCHS_PER_MONTH: 720,
        },
      }));
      
      const { uploadToFilecoin: uploadToFilecoinNew } = require('../filecoin');
      const data = Buffer.alloc(200, 'a'); // > 127 bytes
      await expect(uploadToFilecoinNew(data)).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadJSONToFilecoin', () => {
    test('should upload JSON data', async () => {
      const jsonData = { 
        temperature: 25, 
        humidity: 70,
        // Add enough data to meet minimum size
        metadata: 'x'.repeat(100)
      };
      const cid = await uploadJSONToFilecoin(jsonData);
      expect(cid).toBe('bafybeiexample123');
    });

    test('should handle complex nested objects', async () => {
      const complexData = {
        samples: [
          { temperature: 25, humidity: 70 },
          { temperature: 26, humidity: 71 },
        ],
        metadata: {
          location: 'A1',
          timestamp: Date.now(),
        },
      };

      const cid = await uploadJSONToFilecoin(complexData);
      expect(cid).toBeDefined();
    });

    test('should handle empty objects (auto-padded)', async () => {
      const emptyData = {};
      const cid = await uploadJSONToFilecoin(emptyData);
      expect(cid).toBeDefined();
      // Should be padded to 127 bytes minimum
    });
  });

  describe('fetchFromFilecoin', () => {
    test('should fetch data from Filecoin', async () => {
      const cid = 'bafybeiexample123';
      const data = await fetchFromFilecoin(cid);
      expect(data).toBeDefined();
      // Should parse JSON if possible
    });

    test('should handle fetch errors with IPFS fallback', async () => {
      const failingMock = {
        ...mockSynapseInstance,
        storage: {
          ...mockSynapseInstance.storage,
          download: jest.fn().mockRejectedValue(new Error('SDK error')),
        },
      };
      
      jest.resetModules();
      process.env.NODE_ENV = 'test';
      process.env.FILECOIN_PRIVATE_KEY = '0x' + '1'.repeat(64);
      jest.doMock('@filoz/synapse-sdk', () => ({
        Synapse: {
          create: jest.fn().mockResolvedValue(failingMock),
        },
        RPC_URLS: {
          calibration: {
            http: 'https://api.calibration.node.glif.io/rpc/v1',
          },
        },
        TOKENS: {
          USDFC: '0x' + '2'.repeat(40),
        },
        TIME_CONSTANTS: {
          EPOCHS_PER_MONTH: 720,
        },
      }));
      
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const filecoinModule = require('../filecoin');
      await expect(filecoinModule.fetchFromFilecoin('invalid-cid')).rejects.toThrow();
    });

    test('should handle invalid CID with IPFS fallback', async () => {
      const failingMock = {
        ...mockSynapseInstance,
        storage: {
          ...mockSynapseInstance.storage,
          download: jest.fn().mockRejectedValue(new Error('SDK error')),
        },
      };
      
      jest.resetModules();
      process.env.NODE_ENV = 'test';
      process.env.FILECOIN_PRIVATE_KEY = '0x' + '1'.repeat(64);
      jest.doMock('@filoz/synapse-sdk', () => ({
        Synapse: {
          create: jest.fn().mockResolvedValue(failingMock),
        },
        RPC_URLS: {
          calibration: {
            http: 'https://api.calibration.node.glif.io/rpc/v1',
          },
        },
        TOKENS: {
          USDFC: '0x' + '2'.repeat(40),
        },
        TIME_CONSTANTS: {
          EPOCHS_PER_MONTH: 720,
        },
      }));
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const filecoinModule = require('../filecoin');
      await expect(filecoinModule.fetchFromFilecoin('invalid-cid')).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle minimum size requirement (127 bytes)', async () => {
      // Filecoin requires minimum 127 bytes
      const minSizeData = Buffer.alloc(127, 'a');
      const cid = await uploadToFilecoin(minSizeData);
      expect(cid).toBeDefined();
    });

    test('should reject data smaller than 127 bytes', async () => {
      const smallData = Buffer.alloc(100, 'a'); // < 127 bytes
      await expect(uploadToFilecoin(smallData)).rejects.toThrow();
    });

    test('should handle very large files', async () => {
      const largeData = Buffer.alloc(10 * 1024 * 1024, 'a'); // 10MB
      const cid = await uploadToFilecoin(largeData);
      expect(cid).toBeDefined();
      // Verify upload was called
      const { Synapse } = require('@filoz/synapse-sdk');
      expect(Synapse.create).toHaveBeenCalled();
    });

    test('should handle special characters in JSON', async () => {
      const specialData = {
        text: 'Hello "World" & <Special> Characters',
        unicode: '测试 🚀',
      };
      const cid = await uploadJSONToFilecoin(specialData);
      expect(cid).toBeDefined();
    });
  });
});

