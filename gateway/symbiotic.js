/**
 * Symbiotic Relay Attestation Integration
 * 
 * Creates attestation tasks for Symbiotic Relay network to verify:
 * - Sensor data validity from batch CID
 * - Temperature threshold compliance
 * - Shipment integrity using Merkle tree + Filecoin CID
 * - Filecoin Onchain Cloud dataset verification
 * 
 * Documentation: https://docs.symbiotic.fi/relay-sdk/
 */

const { ethers } = require('ethers');
const { fetchFromFilecoin } = require('./filecoin');
const { computeMerkleRoot, verifyMerkleProof } = require('./merkle');

// Symbiotic Relay contract addresses (configure via env)
// These are example addresses - replace with actual Symbiotic Relay contract addresses
// Read from env at runtime to support testing
function getSymbioticRelayAddress() {
  return process.env.SYMBIOTIC_RELAY_ADDRESS;
}
function getSymbioticSettlementAddress() {
  return process.env.SYMBIOTIC_SETTLEMENT_ADDRESS;
}

// Attestation type constants
const ATTESTATION_TYPES = {
  SENSOR_DATA_VALID: 'SENSOR_DATA_VALID',
  TEMPERATURE_THRESHOLD: 'TEMPERATURE_THRESHOLD',
  MERKLE_INTEGRITY: 'MERKLE_INTEGRITY',
  FILECOIN_VERIFIED: 'FILECOIN_VERIFIED',
  SHIPMENT_INTEGRITY: 'SHIPMENT_INTEGRITY',
};

// Temperature thresholds (in Celsius, scaled by 100 to match contract)
const DEFAULT_TEMP_MIN = -20 * 100; // -20°C
const DEFAULT_TEMP_MAX = 8 * 100;   // 8°C (cold chain standard)

/**
 * Symbiotic Relay Task ABI
 * Based on the example from Symbiotic docs
 */
const SYMBIOTIC_TASK_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'a', type: 'uint256' },
      { internalType: 'uint256', name: 'b', type: 'uint256' },
    ],
    name: 'createTask',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'responses',
    outputs: [
      { internalType: 'uint48', name: 'timestamp', type: 'uint48' },
      { internalType: 'uint256', name: 'result', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

let symbioticContract = null;
let provider = null;

/**
 * Initialize Symbiotic Relay connection
 */
function initSymbiotic(rpcProvider) {
  provider = rpcProvider;
  
  const relayAddress = getSymbioticRelayAddress();
  if (!relayAddress) {
    console.warn('⚠️  SYMBIOTIC_RELAY_ADDRESS not set - Symbiotic attestations disabled');
    symbioticContract = null; // Explicitly set to null
    return null;
  }

  symbioticContract = new ethers.Contract(
    relayAddress,
    SYMBIOTIC_TASK_ABI,
    provider
  );

  console.log(`✅ Symbiotic Relay initialized: ${relayAddress}`);
  return symbioticContract;
}

/**
 * Create attestation task data structure
 * This encodes the verification requirements for the relay
 */
function createAttestationTaskData({
  cid,
  merkleRoot,
  shipmentKey,
  temperature,
  humidity,
  tempMin = DEFAULT_TEMP_MIN,
  tempMax = DEFAULT_TEMP_MAX,
  attestationType,
}) {
  // Encode task data as bytes
  // Format: [type][cid][merkleRoot][shipmentKey][temp][tempMin][tempMax]
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const taskData = abiCoder.encode(
    ['string', 'string', 'bytes32', 'bytes32', 'int256', 'int256', 'int256'],
    [attestationType, cid, merkleRoot, shipmentKey, temperature, tempMin, tempMax]
  );

  return {
    attestationType,
    cid,
    merkleRoot,
    shipmentKey,
    temperature,
    humidity,
    tempMin,
    tempMax,
    taskData,
  };
}

/**
 * Verify sensor data validity from Filecoin CID
 * This is what the Symbiotic Relay validators will execute
 */
async function verifySensorDataValidity(cid, expectedMerkleRoot) {
  try {
    // 1. Fetch data from Filecoin
    const batchData = await fetchFromFilecoin(cid);
    
    if (!Array.isArray(batchData) || batchData.length === 0) {
      return {
        valid: false,
        reason: 'Invalid batch data format',
      };
    }

    // 2. Verify Merkle root matches
    const computedRoot = computeMerkleRoot(batchData);
    if (computedRoot.toLowerCase() !== expectedMerkleRoot.toLowerCase()) {
      return {
        valid: false,
        reason: `Merkle root mismatch: expected ${expectedMerkleRoot}, got ${computedRoot}`,
      };
    }

    // 3. Validate data structure
    for (const sample of batchData) {
      if (
        !sample.hasOwnProperty('temperature') ||
        !sample.hasOwnProperty('humidity') ||
        !sample.hasOwnProperty('timestamp')
      ) {
        return {
          valid: false,
          reason: 'Invalid sample structure',
        };
      }
    }

    return {
      valid: true,
      batchSize: batchData.length,
      merkleRoot: computedRoot,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Verification error: ${error.message}`,
    };
  }
}

/**
 * Verify temperature stayed within threshold
 */
async function verifyTemperatureThreshold(cid, tempMin, tempMax) {
  try {
    const batchData = await fetchFromFilecoin(cid);
    
    if (!Array.isArray(batchData)) {
      return {
        valid: false,
        reason: 'Invalid batch data',
      };
    }

    const violations = [];
    for (const sample of batchData) {
      const temp = sample.temperature;
      if (temp < tempMin || temp > tempMax) {
        violations.push({
          sample: sample,
          temperature: temp,
          threshold: { min: tempMin, max: tempMax },
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations: violations,
      totalSamples: batchData.length,
      violationCount: violations.length,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Temperature verification error: ${error.message}`,
    };
  }
}

/**
 * Verify Merkle integrity
 */
async function verifyMerkleIntegrity(cid, expectedMerkleRoot) {
  try {
    const batchData = await fetchFromFilecoin(cid);
    const computedRoot = computeMerkleRoot(batchData);
    
    const valid = computedRoot.toLowerCase() === expectedMerkleRoot.toLowerCase();
    
    return {
      valid,
      expectedRoot: expectedMerkleRoot,
      computedRoot: computedRoot,
      match: valid,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Merkle verification error: ${error.message}`,
    };
  }
}

/**
 * Verify Filecoin dataset is accessible and valid
 */
async function verifyFilecoinDataset(cid) {
  try {
    const data = await fetchFromFilecoin(cid);
    
    return {
      valid: true,
      cid,
      accessible: true,
      dataSize: JSON.stringify(data).length,
    };
  } catch (error) {
    return {
      valid: false,
      cid,
      accessible: false,
      reason: `Filecoin fetch error: ${error.message}`,
    };
  }
}

/**
 * Verify complete shipment integrity
 * Combines all verification checks
 */
async function verifyShipmentIntegrity({
  cid,
  merkleRoot,
  shipmentKey,
  temperature,
  tempMin = DEFAULT_TEMP_MIN,
  tempMax = DEFAULT_TEMP_MAX,
}) {
  const results = {
    cid,
    merkleRoot,
    shipmentKey,
    checks: {},
    overallValid: true,
  };

  // Check 1: Filecoin accessibility
  const filecoinCheck = await verifyFilecoinDataset(cid);
  results.checks.filecoin = filecoinCheck;
  if (!filecoinCheck.valid) {
    results.overallValid = false;
  }

  // Check 2: Merkle integrity
  const merkleCheck = await verifyMerkleIntegrity(cid, merkleRoot);
  results.checks.merkle = merkleCheck;
  if (!merkleCheck.valid) {
    results.overallValid = false;
  }

  // Check 3: Temperature threshold
  const tempCheck = await verifyTemperatureThreshold(cid, tempMin, tempMax);
  results.checks.temperature = tempCheck;
  if (!tempCheck.valid) {
    results.overallValid = false;
  }

  // Check 4: Sensor data validity
  const sensorCheck = await verifySensorDataValidity(cid, merkleRoot);
  results.checks.sensorData = sensorCheck;
  if (!sensorCheck.valid) {
    results.overallValid = false;
  }

  return results;
}

/**
 * Create Symbiotic attestation task
 * Submits a task to the Symbiotic Relay network
 * 
 * Note: This is a simplified version. In production, you'd use the actual
 * Symbiotic Relay SDK or contract interface to create tasks.
 */
async function createAttestationTask(
  signer,
  attestationType,
  taskData,
  options = {}
) {
  // Try to initialize if not already done
  if (!symbioticContract) {
    if (provider) {
      initSymbiotic(provider);
    } else {
      throw new Error('Symbiotic Relay not initialized. Set SYMBIOTIC_RELAY_ADDRESS in .env');
    }
  }

  if (!symbioticContract) {
    throw new Error('Symbiotic Relay not initialized. Set SYMBIOTIC_RELAY_ADDRESS in .env');
  }

  // For now, we'll create a task identifier and log it
  // In production, this would interact with the actual Symbiotic Relay contract
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const taskId = ethers.keccak256(
    abiCoder.encode(
      ['string', 'bytes', 'uint256'],
      [attestationType, taskData, BigInt(Date.now())]
    )
  );

  console.log(`📋 Created Symbiotic attestation task: ${taskId}`);
  console.log(`   Type: ${attestationType}`);
  console.log(`   Task data: ${taskData}`);

  // TODO: In production, submit actual task to Symbiotic Relay contract
  // Example (from docs):
  // const tx = await symbioticContract.createTask(...);
  // await tx.wait();

  return {
    taskId,
    attestationType,
    status: 'pending',
    createdAt: Date.now(),
  };
}

/**
 * Create multiple attestation tasks for a shipment batch
 */
async function createShipmentAttestations({
  signer,
  cid,
  merkleRoot,
  shipmentKey,
  temperature,
  humidity,
  tempMin = DEFAULT_TEMP_MIN,
  tempMax = DEFAULT_TEMP_MAX,
}) {
  const tasks = [];

  // Task 1: Sensor data validity
  const sensorTaskData = createAttestationTaskData({
    cid,
    merkleRoot,
    shipmentKey,
    temperature,
    humidity,
    tempMin,
    tempMax,
    attestationType: ATTESTATION_TYPES.SENSOR_DATA_VALID,
  });

  const sensorTask = await createAttestationTask(
    signer,
    ATTESTATION_TYPES.SENSOR_DATA_VALID,
    sensorTaskData.taskData,
    {
      description: `Verify all sensor data from batch CID ${cid} is valid`,
    }
  );
  tasks.push(sensorTask);

  // Task 2: Temperature threshold
  const tempTaskData = createAttestationTaskData({
    cid,
    merkleRoot,
    shipmentKey,
    temperature,
    humidity,
    tempMin,
    tempMax,
    attestationType: ATTESTATION_TYPES.TEMPERATURE_THRESHOLD,
  });

  const tempTask = await createAttestationTask(
    signer,
    ATTESTATION_TYPES.TEMPERATURE_THRESHOLD,
    tempTaskData.taskData,
    {
      description: `Verify temperature stayed within threshold (${tempMin / 100}°C - ${tempMax / 100}°C)`,
    }
  );
  tasks.push(tempTask);

  // Task 3: Merkle integrity
  const merkleTaskData = createAttestationTaskData({
    cid,
    merkleRoot,
    shipmentKey,
    temperature,
    humidity,
    tempMin,
    tempMax,
    attestationType: ATTESTATION_TYPES.MERKLE_INTEGRITY,
  });

  const merkleTask = await createAttestationTask(
    signer,
    ATTESTATION_TYPES.MERKLE_INTEGRITY,
    merkleTaskData.taskData,
    {
      description: `Verify shipment integrity using Merkle tree + Filecoin CID`,
    }
  );
  tasks.push(merkleTask);

  // Task 4: Filecoin verification
  const filecoinTaskData = createAttestationTaskData({
    cid,
    merkleRoot,
    shipmentKey,
    temperature,
    humidity,
    tempMin,
    tempMax,
    attestationType: ATTESTATION_TYPES.FILECOIN_VERIFIED,
  });

  const filecoinTask = await createAttestationTask(
    signer,
    ATTESTATION_TYPES.FILECOIN_VERIFIED,
    filecoinTaskData.taskData,
    {
      description: `Verify stored dataset using Filecoin Onchain Cloud`,
    }
  );
  tasks.push(filecoinTask);

  // Task 5: Complete shipment integrity
  const integrityTaskData = createAttestationTaskData({
    cid,
    merkleRoot,
    shipmentKey,
    temperature,
    humidity,
    tempMin,
    tempMax,
    attestationType: ATTESTATION_TYPES.SHIPMENT_INTEGRITY,
  });

  const integrityTask = await createAttestationTask(
    signer,
    ATTESTATION_TYPES.SHIPMENT_INTEGRITY,
    integrityTaskData.taskData,
    {
      description: `Complete shipment integrity verification`,
    }
  );
  tasks.push(integrityTask);

  return {
    shipmentKey,
    cid,
    tasks,
    createdAt: Date.now(),
  };
}

/**
 * Get attestation task result
 * Queries the Symbiotic Relay for task completion status
 */
async function getAttestationResult(taskId) {
  if (!symbioticContract) {
    throw new Error('Symbiotic Relay not initialized');
  }

  try {
    // Query the contract for task result
    // This is based on the example from Symbiotic docs
    const result = await symbioticContract.responses(taskId);
    
    return {
      taskId,
      timestamp: Number(result.timestamp),
      result: result.result.toString(),
      completed: true,
    };
  } catch (error) {
    // Task might not exist or not completed yet
    return {
      taskId,
      completed: false,
      error: error.message,
    };
  }
}

module.exports = {
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
};

