const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShipmentRegistry flow", function () {
  let reg, mock;
  let deployer, gateway, unauthorized, gateway2;

  beforeEach(async function () {
    [deployer, gateway, unauthorized, gateway2] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    mock = await Mock.deploy("Mock USDC", "mUSDC");
    await mock.deployed();

    const Reg = await ethers.getContractFactory("ShipmentRegistry");
    reg = await Reg.deploy();
    await reg.deployed();
  });

  describe("Basic functionality", function () {
    it("deploys and accepts telemetry", async function () {
      await reg.setGateway(gateway.address, true);
      expect(await reg.authorizedGateways(gateway.address)).to.equal(true);

      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );

      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsGateway = reg.connect(gateway);
      const tx = await regAsGateway.recordTelemetry(
        shipmentKey,
        merkleRoot,
        "bafyCIDexample",
        2500, // temperature: 25.00°C
        6500, // humidity: 65.00%
        "RFID-001"
      );
      const rc = await tx.wait();

      const rec = await reg.records(shipmentKey);
      expect(rec.merkleRoot).to.equal(merkleRoot);
      expect(rec.gateway).to.equal(gateway.address);
      expect(rec.cid).to.equal("bafyCIDexample");
      expect(rec.timestamp.gt(0)).to.be.true;
      expect(rec.temperature.toString()).to.equal("2500");
      expect(rec.humidity.toString()).to.equal("6500");
      expect(rec.rfidTag).to.equal("RFID-001");
    });

    it("emits TelemetryRecorded event correctly", async function () {
      await reg.setGateway(gateway.address, true);

      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));
      const cid = "bafybeibackupcidexample";

      const regAsGateway = reg.connect(gateway);
      const temperature = 2500;
      const humidity = 6500;
      const rfidTag = "RFID-001";
      const tx = await regAsGateway.recordTelemetry(
        shipmentKey,
        merkleRoot,
        cid,
        temperature,
        humidity,
        rfidTag
      );
      const receipt = await tx.wait();

      const event = receipt.events.find(e => e.event === "TelemetryRecorded");
      expect(event).to.not.be.undefined;
      expect(event.args.key).to.equal(shipmentKey);
      expect(event.args.gateway).to.equal(gateway.address);
      expect(event.args.merkleRoot).to.equal(merkleRoot);
      expect(event.args.cid).to.equal(cid);
      expect(event.args.temperature.toString()).to.equal(temperature.toString());
      expect(event.args.humidity.toString()).to.equal(humidity.toString());
      expect(event.args.rfidTag).to.equal(rfidTag);
    });
  });

  describe("Access control - Gateway authorization", function () {
    it("reverts when unauthorized gateway tries to record telemetry", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsUnauthorized = reg.connect(unauthorized);
      let reverted = false;
      try {
        await regAsUnauthorized.recordTelemetry(shipmentKey, merkleRoot, "bafyCIDexample", 2500, 6500, "RFID-001");
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("not gateway");
      }
      expect(reverted).to.be.true;
    });

    it("reverts when admin tries to record without gateway authorization", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      let reverted = false;
      try {
        await reg.recordTelemetry(shipmentKey, merkleRoot, "bafyCIDexample", 2500, 6500, "RFID-001");
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("not gateway");
      }
      expect(reverted).to.be.true;
    });

    it("allows admin to authorize and revoke gateways", async function () {
      expect(await reg.authorizedGateways(gateway.address)).to.equal(false);
      
      await reg.setGateway(gateway.address, true);
      expect(await reg.authorizedGateways(gateway.address)).to.equal(true);

      await reg.setGateway(gateway.address, false);
      expect(await reg.authorizedGateways(gateway.address)).to.equal(false);
    });

    it("reverts when non-admin tries to set gateway", async function () {
      const regAsUnauthorized = reg.connect(unauthorized);
      let reverted = false;
      try {
        await regAsUnauthorized.setGateway(gateway.address, true);
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("only admin");
      }
      expect(reverted).to.be.true;
    });

    it("prevents revoked gateway from recording telemetry", async function () {
      // Authorize and record
      await reg.setGateway(gateway.address, true);
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(shipmentKey, merkleRoot, "bafyCIDexample", 2500, 6500, "RFID-001");

      // Revoke and try to record again
      await reg.setGateway(gateway.address, false);
      const shipmentKey2 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S2","B2"])
      );

      let reverted = false;
      try {
        await regAsGateway.recordTelemetry(shipmentKey2, merkleRoot, "bafyCIDexample2", 2500, 6500, "RFID-002");
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("not gateway");
      }
      expect(reverted).to.be.true;
    });
  });

  describe("Access control - Admin functions", function () {
    it("reverts when non-admin tries to flag breach", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );

      const regAsUnauthorized = reg.connect(unauthorized);
      let reverted = false;
      try {
        await regAsUnauthorized.flagBreach(shipmentKey, 1, "Temperature breach");
      } catch (error) {
        reverted = true;
        expect(error.message).to.include("only admin");
      }
      expect(reverted).to.be.true;
    });

    it("allows admin to flag breach", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(shipmentKey, merkleRoot, "bafyCIDexample", 2500, 6500, "RFID-001");

      expect(await reg.breached(shipmentKey)).to.equal(false);

      const tx = await reg.flagBreach(shipmentKey, 1001, "Temperature exceeded threshold");
      const receipt = await tx.wait();

      expect(await reg.breached(shipmentKey)).to.equal(true);

      const event = receipt.events.find(e => e.event === "BreachDetected");
      expect(event).to.not.be.undefined;
      expect(event.args.key).to.equal(shipmentKey);
      expect(event.args.breachCode.toString()).to.equal("1001");
      expect(event.args.reason).to.equal("Temperature exceeded threshold");
    });
  });

  describe("Record management", function () {
    it("allows overwriting existing records with same shipmentKey", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root1"));
      const merkleRoot2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root2"));

      const regAsGateway = reg.connect(gateway);
      
      // First record
      await regAsGateway.recordTelemetry(shipmentKey, merkleRoot1, "cid1", 2500, 6500, "RFID-001");
      let rec = await reg.records(shipmentKey);
      expect(rec.merkleRoot).to.equal(merkleRoot1);
      expect(rec.cid).to.equal("cid1");
      const timestamp1 = rec.timestamp;

      // Overwrite with new data
      await regAsGateway.recordTelemetry(shipmentKey, merkleRoot2, "cid2", 2600, 7000, "RFID-002");
      rec = await reg.records(shipmentKey);
      expect(rec.merkleRoot).to.equal(merkleRoot2);
      expect(rec.cid).to.equal("cid2");
      expect(rec.timestamp.gte(timestamp1)).to.be.true;
    });

    it("handles multiple different shipmentKeys", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey1 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const shipmentKey2 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S2","B2"])
      );
      const merkleRoot1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root1"));
      const merkleRoot2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root2"));

      const regAsGateway = reg.connect(gateway);
      
      await regAsGateway.recordTelemetry(shipmentKey1, merkleRoot1, "cid1", 2500, 6500, "RFID-001");
      await regAsGateway.recordTelemetry(shipmentKey2, merkleRoot2, "cid2", 2600, 7000, "RFID-002");

      const rec1 = await reg.records(shipmentKey1);
      const rec2 = await reg.records(shipmentKey2);

      expect(rec1.merkleRoot).to.equal(merkleRoot1);
      expect(rec1.cid).to.equal("cid1");
      expect(rec2.merkleRoot).to.equal(merkleRoot2);
      expect(rec2.cid).to.equal("cid2");
    });

    it("handles empty CID string", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(shipmentKey, merkleRoot, "", 2500, 6500, "RFID-001");

      const rec = await reg.records(shipmentKey);
      expect(rec.cid).to.equal("");
      expect(rec.merkleRoot).to.equal(merkleRoot);
    });

    it("handles zero merkle root", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const zeroRoot = ethers.constants.HashZero;

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(shipmentKey, zeroRoot, "bafyCIDexample", 2500, 6500, "RFID-001");

      const rec = await reg.records(shipmentKey);
      expect(rec.merkleRoot).to.equal(zeroRoot);
    });

    it("returns empty record for non-existent shipmentKey", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["NONEXISTENT","B1"])
      );

      const rec = await reg.records(shipmentKey);
      expect(rec.gateway).to.equal(ethers.constants.AddressZero);
      expect(rec.merkleRoot).to.equal(ethers.constants.HashZero);
      expect(rec.cid).to.equal("");
      expect(rec.timestamp.toString()).to.equal("0");
    });
  });

  describe("Multiple gateways", function () {
    it("allows multiple authorized gateways to record telemetry", async function () {
      await reg.setGateway(gateway.address, true);
      await reg.setGateway(gateway2.address, true);

      const shipmentKey1 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const shipmentKey2 = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S2","B2"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsGateway1 = reg.connect(gateway);
      const regAsGateway2 = reg.connect(gateway2);

      await regAsGateway1.recordTelemetry(shipmentKey1, merkleRoot, "cid1", 2500, 6500, "RFID-001");
      await regAsGateway2.recordTelemetry(shipmentKey2, merkleRoot, "cid2", 2600, 7000, "RFID-002");

      const rec1 = await reg.records(shipmentKey1);
      const rec2 = await reg.records(shipmentKey2);

      expect(rec1.gateway).to.equal(gateway.address);
      expect(rec2.gateway).to.equal(gateway2.address);
    });

    it("tracks which gateway recorded each shipment", async function () {
      await reg.setGateway(gateway.address, true);
      await reg.setGateway(gateway2.address, true);

      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsGateway1 = reg.connect(gateway);
      await regAsGateway1.recordTelemetry(shipmentKey, merkleRoot, "cid1", 2500, 6500, "RFID-001");

      let rec = await reg.records(shipmentKey);
      expect(rec.gateway).to.equal(gateway.address);

      // Gateway2 overwrites
      const regAsGateway2 = reg.connect(gateway2);
      await regAsGateway2.recordTelemetry(shipmentKey, merkleRoot, "cid2", 2600, 7000, "RFID-002");

      rec = await reg.records(shipmentKey);
      expect(rec.gateway).to.equal(gateway2.address);
    });
  });

  describe("Breach detection", function () {
    it("allows flagging breach for non-existent shipmentKey", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["NONEXISTENT","B1"])
      );

      await reg.flagBreach(shipmentKey, 2001, "Pre-emptive breach flag");
      expect(await reg.breached(shipmentKey)).to.equal(true);
    });

    it("allows multiple breach flags for same shipmentKey", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(shipmentKey, merkleRoot, "bafyCIDexample", 2500, 6500, "RFID-001");

      await reg.flagBreach(shipmentKey, 1001, "First breach");
      expect(await reg.breached(shipmentKey)).to.equal(true);

      // Flagging again should still work (idempotent)
      await reg.flagBreach(shipmentKey, 1002, "Second breach");
      expect(await reg.breached(shipmentKey)).to.equal(true);
    });

    it("emits BreachDetected event with correct parameters", async function () {
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const breachCode = 3001;
      const reason = "Humidity breach detected";

      const tx = await reg.flagBreach(shipmentKey, breachCode, reason);
      const receipt = await tx.wait();

      const event = receipt.events.find(e => e.event === "BreachDetected");
      expect(event).to.not.be.undefined;
      expect(event.args.key).to.equal(shipmentKey);
      expect(event.args.breachCode.toString()).to.equal(breachCode.toString());
      expect(event.args.reason).to.equal(reason);
    });
  });

  describe("Admin management", function () {
    it("sets deployer as admin", async function () {
      expect(await reg.admin()).to.equal(deployer.address);
    });

    it("allows admin to authorize multiple gateways", async function () {
      await reg.setGateway(gateway.address, true);
      await reg.setGateway(gateway2.address, true);
      await reg.setGateway(unauthorized.address, true);

      expect(await reg.authorizedGateways(gateway.address)).to.equal(true);
      expect(await reg.authorizedGateways(gateway2.address)).to.equal(true);
      expect(await reg.authorizedGateways(unauthorized.address)).to.equal(true);
    });
  });

  describe("IoT Data Collection", function () {
    it("records temperature and humidity data correctly", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));
      const temperature = 2500; // 25.00°C
      const humidity = 6500; // 65.00%
      const rfidTag = "RFID-TEMP-001";

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(
        shipmentKey,
        merkleRoot,
        "bafyCIDexample",
        temperature,
        humidity,
        rfidTag
      );

      const rec = await reg.records(shipmentKey);
      expect(rec.temperature.toString()).to.equal("2500");
      expect(rec.humidity.toString()).to.equal("6500");
      expect(rec.rfidTag).to.equal(rfidTag);
    });

    it("handles negative temperatures", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));
      const temperature = -500; // -5.00°C (freezing)
      const humidity = 3000; // 30.00%
      const rfidTag = "RFID-FREEZE-001";

      const regAsGateway = reg.connect(gateway);
      await regAsGateway.recordTelemetry(
        shipmentKey,
        merkleRoot,
        "bafyCIDexample",
        temperature,
        humidity,
        rfidTag
      );

      const rec = await reg.records(shipmentKey);
      expect(rec.temperature.toString()).to.equal("-500");
      expect(rec.humidity.toString()).to.equal("3000");
    });

    it("emits AccessGranted event with RFID tag", async function () {
      await reg.setGateway(gateway.address, true);
      
      const shipmentKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string","string"], ["S1","B1"])
      );
      const merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("root"));
      const rfidTag = "RFID-ACCESS-001";

      const regAsGateway = reg.connect(gateway);
      const tx = await regAsGateway.recordTelemetry(
        shipmentKey,
        merkleRoot,
        "bafyCIDexample",
        2500,
        6500,
        rfidTag
      );
      const receipt = await tx.wait();

      const accessEvent = receipt.events.find(e => e.event === "AccessGranted");
      expect(accessEvent).to.not.be.undefined;
      expect(accessEvent.args.key).to.equal(shipmentKey);
      expect(accessEvent.args.rfidTag).to.equal(rfidTag);
      expect(accessEvent.args.gateway).to.equal(gateway.address);
    });
  });
});

