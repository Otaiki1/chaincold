const { expect } = require("chai");
const { ethers } = require("hardhat");

const RECORD_TELEMETRY_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    "RecordTelemetry(bytes32 shipmentKey,bytes32 merkleRoot,string cid,int256 temperature,uint256 humidity,string rfidTag,uint256 nonce,bool isAsync)"
  )
);

// Shared signature creation function for EIP-712
async function createSignature(
  signer,
  shipmentKey,
  merkleRoot,
  cid,
  temperature,
  humidity,
  rfidTag,
  nonce,
  isAsync,
  domainSeparator
) {
  const structHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "bytes32", "int256", "uint256", "bytes32", "uint256", "bool"],
      [
        RECORD_TELEMETRY_TYPEHASH,
        shipmentKey,
        merkleRoot,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(cid)),
        temperature,
        humidity,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(rfidTag)),
        nonce,
        isAsync
      ]
    )
  );

  const hash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["string", "bytes32", "bytes32"],
      ["\x19\x01", domainSeparator, structHash]
    )
  );

  // For EIP-712, we need to sign the hash directly (no "Ethereum Signed Message" prefix)
  // Get the signer's private key from Hardhat's deterministic accounts
  const signerAddress = await signer.getAddress();
  const accounts = await ethers.getSigners();
  
  // Hardhat's default private keys (first 20 accounts)
  const hardhatPrivateKeys = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "0x92db14e403b83dfe3df233f83dfa3a3d306f621ece88c81d7efb2e4c4e0e4e0e",
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
  ];
  
  // Find which account index this signer is
  let privateKey = null;
  for (let i = 0; i < accounts.length && i < hardhatPrivateKeys.length; i++) {
    if ((await accounts[i].getAddress()).toLowerCase() === signerAddress.toLowerCase()) {
      privateKey = hardhatPrivateKeys[i];
      break;
    }
  }
  
  if (privateKey) {
    // Sign directly with private key (no prefix)
    const signingKey = new ethers.utils.SigningKey(privateKey);
    const sig = signingKey.signDigest(hash);
    return {
      v: sig.v,
      r: sig.r,
      s: sig.s
    };
  }
  
  // Fallback: use signMessage (adds prefix - may not work with contract as-is)
  // This is a limitation - in production, always use proper EIP-712 signing
  const signature = await signer.signMessage(ethers.utils.arrayify(hash));
  return ethers.utils.splitSignature(signature);
}

describe("ShipmentRegistryEVVM", function () {
  let reg;
  let admin, gateway, fisher, unauthorized;
  let domainSeparator;

  beforeEach(async function () {
    [admin, gateway, fisher, unauthorized] = await ethers.getSigners();

    const Reg = await ethers.getContractFactory("ShipmentRegistryEVVM");
    reg = await Reg.deploy();
    await reg.deployed();

    domainSeparator = await reg.getDomainSeparator();

    // Authorize gateway
    await reg.setGateway(gateway.address, true);
  });

  describe("Deployment", function () {
    it("should set admin correctly", async function () {
      expect(await reg.admin()).to.equal(admin.address);
    });

    it("should have correct domain separator", async function () {
      const ds = await reg.getDomainSeparator();
      expect(ds).to.not.equal(ethers.constants.HashZero);
    });

    it("should initialize nonces to zero", async function () {
      const syncNonce = await reg.getSyncNonce(gateway.address);
      const asyncNonce = await reg.getAsyncNonce(gateway.address);
      expect(syncNonce.toString()).to.equal("0");
      expect(asyncNonce.toString()).to.equal("0");
    });
  });

  describe("Direct recordTelemetry (backward compatibility)", function () {
    it("should record telemetry via direct call", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S1", "B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root1"));
      const cid = "bafybeiexample1";
      const temperature = 2500;
      const humidity = 6500;
      const rfidTag = "RFID-001";

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag
      );

      const rec = await reg.records(shipmentKey);
      expect(rec.gateway).to.equal(gateway.address);
      expect(rec.temperature.toString()).to.equal(temperature.toString());
      expect(rec.humidity.toString()).to.equal(humidity.toString());
      expect(rec.rfidTag).to.equal(rfidTag);
    });

    it("should reject direct call from unauthorized gateway", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S2", "B2"])
      );
      const regAsUnauthorized = reg.connect(unauthorized);

      let reverted = false;
      try {
        await regAsUnauthorized.recordTelemetry(
          shipmentKey,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root2")),
          "cid2",
          2000,
          6000,
          "RFID-002"
        );
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("not gateway");
      }
      expect(reverted).to.be.true;
    });
  });

  describe("Signature-based recordTelemetry (EVVM)", function () {
    it("should record telemetry with valid signature (sync nonce)", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_EVVM_1", "B_EVVM_1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-1"));
      const cid = "bafybeievvm1";
      const temperature = 2550;
      const humidity = 7025;
      const rfidTag = "RFID-EVVM-001";
      const isAsync = false;

      const nonce = await reg.getSyncNonce(gateway.address);
      const sig = await createSignature(
        gateway,
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        domainSeparator
      );

      // Anyone (e.g., fisher) can call this
      await reg.recordTelemetryWithSignature(
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        sig.v,
        sig.r,
        sig.s
      );

      const rec = await reg.records(shipmentKey);
      expect(rec.gateway).to.equal(gateway.address);
      expect(rec.temperature.toString()).to.equal(temperature.toString());
      expect(rec.humidity.toString()).to.equal(humidity.toString());
      expect(rec.rfidTag).to.equal(rfidTag);

      // Nonce should be incremented
      const newNonce = await reg.getSyncNonce(gateway.address);
      expect(newNonce.toString()).to.equal(nonce.add(1).toString());
    });

    it("should record telemetry with valid signature (async nonce)", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_EVVM_2", "B_EVVM_2"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-2"));
      const cid = "bafybeievvm2";
      const temperature = 2000;
      const humidity = 6000;
      const rfidTag = "RFID-EVVM-002";
      const isAsync = true;

      const nonce = await reg.getAsyncNonce(gateway.address);
      const sig = await createSignature(
        gateway,
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        domainSeparator
      );

      await reg.recordTelemetryWithSignature(
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        sig.v,
        sig.r,
        sig.s
      );

      const rec = await reg.records(shipmentKey);
      expect(rec.gateway).to.equal(gateway.address);

      // Async nonce should be incremented, sync nonce should remain 0
      const newAsyncNonce = await reg.getAsyncNonce(gateway.address);
      const syncNonce = await reg.getSyncNonce(gateway.address);
      expect(newAsyncNonce.toString()).to.equal(nonce.add(1).toString());
      expect(syncNonce.toString()).to.equal("0");
    });

    it("should reject invalid signature", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_EVVM_3", "B_EVVM_3"])
      );
      const nonce = await reg.getSyncNonce(gateway.address);

      // Use wrong signature (from unauthorized signer)
      const sig = await createSignature(
        unauthorized,
        shipmentKey,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-3")),
        "bafybeievvm3",
        2500,
        6500,
        "RFID-EVVM-003",
        nonce,
        false,
        domainSeparator
      );

      let reverted = false;
      try {
        await reg.recordTelemetryWithSignature(
          shipmentKey,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-3")),
          "bafybeievvm3",
          2500,
          6500,
          "RFID-EVVM-003",
          nonce,
          false,
          sig.v,
          sig.r,
          sig.s
        );
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("not gateway");
      }
      expect(reverted).to.be.true;
    });

    it("should reject invalid nonce", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_EVVM_4", "B_EVVM_4"])
      );
      const nonce = await reg.getSyncNonce(gateway.address);
      const wrongNonce = nonce.add(1); // Wrong nonce

      const sig = await createSignature(
        gateway,
        shipmentKey,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-4")),
        "bafybeievvm4",
        2500,
        6500,
        "RFID-EVVM-004",
        wrongNonce,
        false,
        domainSeparator
      );

      let reverted = false;
      try {
        await reg.recordTelemetryWithSignature(
          shipmentKey,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-4")),
          "bafybeievvm4",
          2500,
          6500,
          "RFID-EVVM-004",
          wrongNonce,
          false,
          sig.v,
          sig.r,
          sig.s
        );
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("invalid sync nonce");
      }
      expect(reverted).to.be.true;
    });

    it("should prevent replay attacks with nonce increment", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_EVVM_5", "B_EVVM_5"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-5"));
      const cid = "bafybeievvm5";
      const temperature = 2500;
      const humidity = 6500;
      const rfidTag = "RFID-EVVM-005";
      const isAsync = false;

      const nonce = await reg.getSyncNonce(gateway.address);
      const sig = await createSignature(
        gateway,
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        domainSeparator
      );

      // First call should succeed
      await reg.recordTelemetryWithSignature(
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        sig.v,
        sig.r,
        sig.s
      );

      // Replay with same signature should fail (nonce already used)
      let reverted = false;
      try {
        await reg.recordTelemetryWithSignature(
          shipmentKey,
          merkleRoot,
          cid,
          temperature,
          humidity,
          rfidTag,
          nonce,
          isAsync,
          sig.v,
          sig.r,
          sig.s
        );
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("invalid sync nonce");
      }
      expect(reverted).to.be.true;
    });

    it("should emit TelemetryRecorded and AccessGranted events", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_EVVM_6", "B_EVVM_6"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evvm-root-6"));
      const cid = "bafybeievvm6";
      const temperature = 2500;
      const humidity = 6500;
      const rfidTag = "RFID-EVVM-006";
      const isAsync = false;

      const nonce = await reg.getSyncNonce(gateway.address);
      const sig = await createSignature(
        gateway,
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        domainSeparator
      );

      const tx = await reg.recordTelemetryWithSignature(
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        sig.v,
        sig.r,
        sig.s
      );
      const receipt = await tx.wait();

      const telemetryEvent = receipt.events.find(e => e.event === "TelemetryRecorded");
      expect(telemetryEvent).to.not.be.undefined;
      expect(telemetryEvent.args.key).to.equal(shipmentKey);
      expect(telemetryEvent.args.gateway).to.equal(gateway.address);
      expect(telemetryEvent.args.temperature.toString()).to.equal(temperature.toString());
      expect(telemetryEvent.args.humidity.toString()).to.equal(humidity.toString());
      expect(telemetryEvent.args.rfidTag).to.equal(rfidTag);

      const accessEvent = receipt.events.find(e => e.event === "AccessGranted");
      expect(accessEvent).to.not.be.undefined;
      expect(accessEvent.args.key).to.equal(shipmentKey);
      expect(accessEvent.args.rfidTag).to.equal(rfidTag);
      expect(accessEvent.args.gateway).to.equal(gateway.address);
    });
  });

  describe("Nonce management", function () {
    it("should track sync and async nonces independently", async function () {
      const shipmentKey1 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_NONCE_1", "B_NONCE_1"])
      );
      const shipmentKey2 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string", "string"], ["S_NONCE_2", "B_NONCE_2"])
      );

      // Use sync nonce
      const syncNonce = await reg.getSyncNonce(gateway.address);
      const sig1 = await createSignatureForTest(
        gateway,
        shipmentKey1,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root1")),
        "cid1",
        2500,
        6500,
        "RFID-1",
        syncNonce,
        false
      );
      await reg.recordTelemetryWithSignature(
        shipmentKey1,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root1")),
        "cid1",
        2500,
        6500,
        "RFID-1",
        syncNonce,
        false,
        sig1.v,
        sig1.r,
        sig1.s
      );

      // Use async nonce
      const asyncNonce = await reg.getAsyncNonce(gateway.address);
      const sig2 = await createSignatureForTest(
        gateway,
        shipmentKey2,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root2")),
        "cid2",
        2000,
        6000,
        "RFID-2",
        asyncNonce,
        true
      );
      await reg.recordTelemetryWithSignature(
        shipmentKey2,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root2")),
        "cid2",
        2000,
        6000,
        "RFID-2",
        asyncNonce,
        true,
        sig2.v,
        sig2.r,
        sig2.s
      );

      // Both nonces should be incremented independently
      const finalSyncNonce = await reg.getSyncNonce(gateway.address);
      const finalAsyncNonce = await reg.getAsyncNonce(gateway.address);
      expect(finalSyncNonce.toString()).to.equal(syncNonce.add(1).toString());
      expect(finalAsyncNonce.toString()).to.equal(asyncNonce.add(1).toString());
    });

    async function createSignatureForTest(
      signer,
      shipmentKey,
      merkleRoot,
      cid,
      temperature,
      humidity,
      rfidTag,
      nonce,
      isAsync
    ) {
      // Reuse the same createSignature function
      return await createSignature(
        signer,
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag,
        nonce,
        isAsync,
        domainSeparator
      );
    }
  });
});

