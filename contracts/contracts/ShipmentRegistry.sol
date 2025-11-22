// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ShipmentRegistry {
    struct TelemetryRecord {
        address gateway;
        bytes32 merkleRoot;
        string cid; // IPFS/Filecoin CID
        uint256 timestamp;
        int256 temperature; // Temperature in Celsius (scaled, e.g., 2500 = 25.00°C)
        uint256 humidity; // Humidity percentage (scaled, e.g., 6500 = 65.00%)
        string rfidTag; // RFID tag identifier for access control
    }

    // key = keccak256(abi.encodePacked(shipmentId, batchId))
    mapping(bytes32 => TelemetryRecord) public records;
    mapping(bytes32 => bool) public breached;

    event TelemetryRecorded(
        bytes32 indexed key,
        address indexed gateway,
        bytes32 merkleRoot,
        string cid,
        uint256 timestamp,
        int256 temperature,
        uint256 humidity,
        string rfidTag
    );
    event BreachDetected(bytes32 indexed key, uint256 breachCode, string reason);
    event AccessGranted(bytes32 indexed key, string rfidTag, address indexed gateway, uint256 timestamp);

    address public admin;
    mapping(address => bool) public authorizedGateways;

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    modifier onlyGateway() {
        require(authorizedGateways[msg.sender], "not gateway");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setGateway(address gateway, bool allowed) external onlyAdmin {
        authorizedGateways[gateway] = allowed;
    }

    /// @notice Record a telemetry batch. Only authorized gateways may call.
    /// @param shipmentKey keccak256(shipmentId, batchId)
    /// @param merkleRoot merkle root of the batch of samples
    /// @param cid IPFS/Filecoin CID where batch JSON/objects live
    /// @param temperature Temperature in Celsius (scaled by 100, e.g., 2500 = 25.00°C)
    /// @param humidity Humidity percentage (scaled by 100, e.g., 6500 = 65.00%)
    /// @param rfidTag RFID tag identifier for access control
    function recordTelemetry(
        bytes32 shipmentKey,
        bytes32 merkleRoot,
        string calldata cid,
        int256 temperature,
        uint256 humidity,
        string calldata rfidTag
    ) external onlyGateway {
        TelemetryRecord memory r = TelemetryRecord({
            gateway: msg.sender,
            merkleRoot: merkleRoot,
            cid: cid,
            timestamp: block.timestamp,
            temperature: temperature,
            humidity: humidity,
            rfidTag: rfidTag
        });

        records[shipmentKey] = r;
        emit TelemetryRecorded(
            shipmentKey,
            msg.sender,
            merkleRoot,
            cid,
            block.timestamp,
            temperature,
            humidity,
            rfidTag
        );
        emit AccessGranted(shipmentKey, rfidTag, msg.sender, block.timestamp);
    }

    /// @notice Admin flags a breach for an onchain record (can be called after verification)
    function flagBreach(bytes32 shipmentKey, uint256 code, string calldata reason) external onlyAdmin {
        breached[shipmentKey] = true;
        emit BreachDetected(shipmentKey, code, reason);
    }
}

