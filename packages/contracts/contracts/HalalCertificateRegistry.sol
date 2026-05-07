// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HalalCertificateRegistry {
    enum HalalStatus {
        Approved,
        Rejected,
        Expired
    }

    struct CertificateRecord {
        string certificateId;
        string batchID;
        string productID;
        string productName;
        string authority;
        string certificateHash;
        uint256 issueDate;
        uint256 expiryDate;
        HalalStatus status;
        uint256 decisionTimestamp;
        bool exists;
    }

    struct TraceabilityRecord {
        string traceId;
        string productID;
        string batchID;
        string stage;
        string actorName;
        string recordHash;
        uint256 eventTimestamp;
        uint256 anchoredAt;
        bool exists;
    }

    address public admin;
    mapping(address => bool) public authorities;
    mapping(string => CertificateRecord) private certificatesById;
    mapping(string => string) private certificateIdByProductId;
    mapping(string => TraceabilityRecord) private traceabilityById;
    mapping(string => string[]) private traceabilityIdsByProductId;

    event AuthorityUpdated(address indexed authorityAddress, bool allowed);
    event CertificateDecisionRecorded(
        string indexed certificateId,
        string indexed productID,
        HalalStatus status,
        string certificateHash,
        uint256 decisionTimestamp
    );
    event TraceabilityRecorded(
        string indexed traceId,
        string indexed productID,
        string recordHash,
        uint256 eventTimestamp,
        uint256 anchoredAt
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyAuthority() {
        require(authorities[msg.sender], "Only authority");
        _;
    }

    constructor(address initialAuthority) {
        admin = msg.sender;
        authorities[initialAuthority] = true;
    }

    function setAuthority(address account, bool allowed) external onlyAdmin {
        authorities[account] = allowed;
        emit AuthorityUpdated(account, allowed);
    }

    function recordCertificateDecision(
        string memory certificateId,
        string memory batchID,
        string memory productID,
        string memory productName,
        string memory authority,
        string memory certificateHash,
        uint256 issueDate,
        uint256 expiryDate,
        bool approved
    ) external onlyAuthority {
        require(bytes(certificateId).length > 0, "certificateId required");
        require(bytes(productID).length > 0, "productID required");
        require(bytes(certificateHash).length > 0, "certificateHash required");
        require(!certificatesById[certificateId].exists, "Decision already recorded");
        require(issueDate > 0, "issueDate required");

        HalalStatus finalStatus = approved ? HalalStatus.Approved : HalalStatus.Rejected;
        if (expiryDate > 0 && block.timestamp > expiryDate) {
            finalStatus = HalalStatus.Expired;
        }

        certificatesById[certificateId] = CertificateRecord({
            certificateId: certificateId,
            batchID: batchID,
            productID: productID,
            productName: productName,
            authority: authority,
            certificateHash: certificateHash,
            issueDate: issueDate,
            expiryDate: expiryDate,
            status: finalStatus,
            decisionTimestamp: block.timestamp,
            exists: true
        });

        certificateIdByProductId[productID] = certificateId;

        emit CertificateDecisionRecorded(
            certificateId,
            productID,
            finalStatus,
            certificateHash,
            block.timestamp
        );
    }

    function recordTraceability(
        string memory traceId,
        string memory productID,
        string memory batchID,
        string memory stage,
        string memory actorName,
        string memory recordHash,
        uint256 eventTimestamp
    ) external onlyAuthority {
        require(bytes(traceId).length > 0, "traceId required");
        require(bytes(productID).length > 0, "productID required");
        require(bytes(recordHash).length > 0, "recordHash required");
        require(!traceabilityById[traceId].exists, "Traceability already recorded");
        require(eventTimestamp > 0, "eventTimestamp required");

        traceabilityById[traceId] = TraceabilityRecord({
            traceId: traceId,
            productID: productID,
            batchID: batchID,
            stage: stage,
            actorName: actorName,
            recordHash: recordHash,
            eventTimestamp: eventTimestamp,
            anchoredAt: block.timestamp,
            exists: true
        });

        traceabilityIdsByProductId[productID].push(traceId);

        emit TraceabilityRecorded(
            traceId,
            productID,
            recordHash,
            eventTimestamp,
            block.timestamp
        );
    }

    function getCertificateById(
        string memory certificateId
    )
        external
        view
        returns (
            string memory returnedCertificateId,
            string memory batchID,
            string memory productID,
            string memory productName,
            string memory authority,
            string memory certificateHash,
            uint256 issueDate,
            uint256 expiryDate,
            string memory halalStatus,
            uint256 decisionTimestamp
        )
    {
        require(certificatesById[certificateId].exists, "Certificate not found");

        CertificateRecord memory record = certificatesById[certificateId];
        return (
            record.certificateId,
            record.batchID,
            record.productID,
            record.productName,
            record.authority,
            record.certificateHash,
            record.issueDate,
            record.expiryDate,
            statusToString(record.status),
            record.decisionTimestamp
        );
    }

    function getCertificateByProductId(
        string memory productID
    )
        external
        view
        returns (
            string memory returnedCertificateId,
            string memory batchID,
            string memory returnedProductID,
            string memory productName,
            string memory authority,
            string memory certificateHash,
            uint256 issueDate,
            uint256 expiryDate,
            string memory halalStatus,
            uint256 decisionTimestamp
        )
    {
        string memory certificateId = certificateIdByProductId[productID];
        require(bytes(certificateId).length > 0, "Certificate not found");
        CertificateRecord memory record = certificatesById[certificateId];
        return (
            record.certificateId,
            record.batchID,
            record.productID,
            record.productName,
            record.authority,
            record.certificateHash,
            record.issueDate,
            record.expiryDate,
            statusToString(record.status),
            record.decisionTimestamp
        );
    }

    function getTraceabilityById(
        string memory traceId
    )
        external
        view
        returns (
            string memory returnedTraceId,
            string memory productID,
            string memory batchID,
            string memory stage,
            string memory actorName,
            string memory recordHash,
            uint256 eventTimestamp,
            uint256 anchoredAt
        )
    {
        require(traceabilityById[traceId].exists, "Traceability not found");

        TraceabilityRecord memory record = traceabilityById[traceId];
        return (
            record.traceId,
            record.productID,
            record.batchID,
            record.stage,
            record.actorName,
            record.recordHash,
            record.eventTimestamp,
            record.anchoredAt
        );
    }

    function getTraceabilityIdsByProductId(
        string memory productID
    ) external view returns (string[] memory) {
        return traceabilityIdsByProductId[productID];
    }

    function statusToString(HalalStatus status) internal pure returns (string memory) {
        if (status == HalalStatus.Approved) return "Approved";
        if (status == HalalStatus.Rejected) return "Rejected";
        return "Expired";
    }
}
