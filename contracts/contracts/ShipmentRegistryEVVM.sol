// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShipmentRegistryEVVM
 * @notice EVVM-compatible version of ShipmentRegistry supporting gasless transactions
 * via EIP-191 signatures and nonce-based replay protection
 */
contract ShipmentRegistryEVVM {
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
    
    // Nonce management for EVVM replay protection
    // syncNonces: for synchronous operations (immediate execution)
    // asyncNonces: for asynchronous operations (queued execution)
    mapping(address => uint256) public syncNonces;
    mapping(address => uint256) public asyncNonces;

    // EIP-712 domain separator for signature verification
    bytes32 public immutable DOMAIN_SEPARATOR;

    // Type hash for recordTelemetry function
    bytes32 public constant RECORD_TELEMETRY_TYPEHASH = keccak256(
        "RecordTelemetry(bytes32 shipmentKey,bytes32 merkleRoot,string cid,int256 temperature,uint256 humidity,string rfidTag,uint256 nonce,bool isAsync)"
    );

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
        
        // Compute EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("ShipmentRegistryEVVM"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Set gateway authorization status
     * @param gateway Address of the gateway
     * @param allowed Whether the gateway is authorized
     */
    function setGateway(address gateway, bool allowed) external onlyAdmin {
        authorizedGateways[gateway] = allowed;
    }

    /**
     * @notice Record telemetry using direct call (backward compatibility)
     * @param shipmentKey keccak256(shipmentId, batchId)
     * @param merkleRoot merkle root of the batch of samples
     * @param cid IPFS/Filecoin CID where batch JSON/objects live
     * @param temperature Temperature in Celsius (scaled by 100, e.g., 2500 = 25.00°C)
     * @param humidity Humidity percentage (scaled by 100, e.g., 6500 = 65.00%)
     * @param rfidTag RFID tag identifier for access control
     */
    function recordTelemetry(
        bytes32 shipmentKey,
        bytes32 merkleRoot,
        string calldata cid,
        int256 temperature,
        uint256 humidity,
        string calldata rfidTag
    ) external onlyGateway {
        _recordTelemetry(shipmentKey, merkleRoot, cid, temperature, humidity, rfidTag, msg.sender);
    }

    /**
     * @notice Record telemetry using EIP-191 signature (EVVM gasless transaction)
     * @param shipmentKey keccak256(shipmentId, batchId)
     * @param merkleRoot merkle root of the batch of samples
     * @param cid IPFS/Filecoin CID where batch JSON/objects live
     * @param temperature Temperature in Celsius (scaled by 100, e.g., 2500 = 25.00°C)
     * @param humidity Humidity percentage (scaled by 100, e.g., 6500 = 65.00%)
     * @param rfidTag RFID tag identifier for access control
     * @param nonce Nonce for replay protection (should match gateway's current nonce)
     * @param isAsync Whether this is an async operation (uses asyncNonce) or sync (uses syncNonce)
     * @param v ECDSA signature component
     * @param r ECDSA signature component
     * @param s ECDSA signature component
     */
    function recordTelemetryWithSignature(
        bytes32 shipmentKey,
        bytes32 merkleRoot,
        string calldata cid,
        int256 temperature,
        uint256 humidity,
        string calldata rfidTag,
        uint256 nonce,
        bool isAsync,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        address signer = _verifySignature(
            shipmentKey,
            merkleRoot,
            cid,
            temperature,
            humidity,
            rfidTag,
            nonce,
            isAsync,
            v,
            r,
            s
        );
        
        _verifyAndIncrementNonce(signer, nonce, isAsync);
        _recordTelemetry(shipmentKey, merkleRoot, cid, temperature, humidity, rfidTag, signer);
    }

    /**
     * @notice Verify EIP-712 signature and return signer address
     */
    function _verifySignature(
        bytes32 shipmentKey,
        bytes32 merkleRoot,
        string calldata cid,
        int256 temperature,
        uint256 humidity,
        string calldata rfidTag,
        uint256 nonce,
        bool isAsync,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                RECORD_TELEMETRY_TYPEHASH,
                shipmentKey,
                merkleRoot,
                keccak256(bytes(cid)),
                temperature,
                humidity,
                keccak256(bytes(rfidTag)),
                nonce,
                isAsync
            )
        );

        bytes32 hash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0), "invalid signature");
        require(authorizedGateways[signer], "not gateway");
        return signer;
    }

    /**
     * @notice Verify nonce and increment it
     */
    function _verifyAndIncrementNonce(address signer, uint256 nonce, bool isAsync) internal {
        if (isAsync) {
            require(nonce == asyncNonces[signer], "invalid async nonce");
            asyncNonces[signer]++;
        } else {
            require(nonce == syncNonces[signer], "invalid sync nonce");
            syncNonces[signer]++;
        }
    }

    /**
     * @notice Internal function to record telemetry data
     */
    function _recordTelemetry(
        bytes32 shipmentKey,
        bytes32 merkleRoot,
        string calldata cid,
        int256 temperature,
        uint256 humidity,
        string calldata rfidTag,
        address gateway
    ) internal {
        TelemetryRecord memory r = TelemetryRecord({
            gateway: gateway,
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
            gateway,
            merkleRoot,
            cid,
            block.timestamp,
            temperature,
            humidity,
            rfidTag
        );
        emit AccessGranted(shipmentKey, rfidTag, gateway, block.timestamp);
    }

    /**
     * @notice Admin flags a breach for an onchain record (can be called after verification)
     * @param shipmentKey The shipment key to flag
     * @param code Breach code
     * @param reason Reason for the breach
     */
    function flagBreach(bytes32 shipmentKey, uint256 code, string calldata reason) external onlyAdmin {
        breached[shipmentKey] = true;
        emit BreachDetected(shipmentKey, code, reason);
    }

    /**
     * @notice Get the current sync nonce for a gateway
     * @param gateway Address of the gateway
     * @return Current sync nonce
     */
    function getSyncNonce(address gateway) external view returns (uint256) {
        return syncNonces[gateway];
    }

    /**
     * @notice Get the current async nonce for a gateway
     * @param gateway Address of the gateway
     * @return Current async nonce
     */
    function getAsyncNonce(address gateway) external view returns (uint256) {
        return asyncNonces[gateway];
    }

    /**
     * @notice Get the domain separator for EIP-712 signature verification
     * @return The domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }
}

