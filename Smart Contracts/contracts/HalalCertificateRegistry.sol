// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HalalCertificateRegistry {
    enum HalalStatus {
        UnderProcess,
        Valid,
        NotValid,
        Expired
    }

    struct CertificateRecord {
        string batchID;
        string productID;
        string productName;
        string originCountry;
        string manufacturerName;
        string slaughterMethod;
        string certificateHash;
        uint256 issueDate;
        uint256 expiryDate;
        HalalStatus halalStatus;
        uint256 timestamp;
        bool exists;
    }

    struct TraceStep {
        string stepName;
        string location;
        string actor;
        uint256 timestamp;
    }

    address public admin;
    mapping(address => bool) public authorities;
    mapping(address => bool) public manufacturers;
    mapping(string => CertificateRecord) private certificates;
    mapping(string => TraceStep[]) private certificateTraceSteps;   
    
    event ManufacturerUpdated(address indexed account, bool allowed);
    event AuthorityUpdated(address indexed authorityAddress, bool allowed);
    event TraceStepAdded(string indexed batchID, string stepName, string location, string actor, uint256 timestamp);
    event CertificateAdded(string indexed batchID, string certificateHash, uint256 timestamp);
    event CertificateApproved(string indexed productID, HalalStatus status, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyAuthority() {
        require(authorities[msg.sender], "Only authority");
        _;
    }

    modifier onlyManufacturerOrAdmin() {
        require(manufacturers[msg.sender] || msg.sender == admin, "Only manufacturer or admin");
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

    function setManufacturer(address account, bool allowed) external onlyAdmin {
        manufacturers[account] = allowed;
        emit ManufacturerUpdated(account, allowed);
    }

    function addCertificate(
        string memory batchID,
        string memory productID,
        string memory productName,
        string memory originCountry,
        string memory manufacturerName,
        string memory slaughterMethod,
        string memory certificateHash,
        uint256 issueDate,
        uint256 expiryDate
    ) external onlyManufacturerOrAdmin {
        require(bytes(batchID).length > 0, "batchID required");
        require(bytes(productID).length > 0, "productID required");
        require(bytes(productName).length > 0, "productName required");
        require(bytes(certificateHash).length > 0, "certificateHash required");
        require(!certificates[batchID].exists, "Certificate already exists");
        require(expiryDate > issueDate, "Invalid expiry date");

        certificates[batchID] = CertificateRecord({
            batchID: batchID,
            productID: productID,
            productName: productName,
            originCountry: originCountry,
            manufacturerName: manufacturerName,
            slaughterMethod: slaughterMethod,
            certificateHash: certificateHash,
            issueDate: issueDate,
            expiryDate: expiryDate,
            halalStatus: HalalStatus.UnderProcess,
            timestamp: block.timestamp,
            exists: true
        });

        certificateTraceSteps[batchID].push(
            TraceStep("Certificate Submitted", originCountry, manufacturerName, block.timestamp)
        );

        emit CertificateAdded(batchID, certificateHash, block.timestamp);
    }

    function approveCertificate(
        string memory batchID,
        bool approved
    ) external onlyAuthority {
        require(certificates[batchID].exists, "Certificate not found");

        if (block.timestamp > certificates[batchID].expiryDate) {
            certificates[batchID].halalStatus = HalalStatus.Expired;
        } else {
            certificates[batchID].halalStatus = approved
                ? HalalStatus.Valid
                : HalalStatus.NotValid;
        }

        certificates[batchID].timestamp = block.timestamp;

        certificateTraceSteps[batchID].push(
            TraceStep(
                approved ? "Certificate Approved" : "Certificate Rejected",
                certificates[batchID].originCountry,
                "Authority",
                block.timestamp
            )
        );

        emit CertificateApproved(
            certificates[batchID].productID,
            certificates[batchID].halalStatus,
            block.timestamp
        );
    }

    function addTraceStep(
        string memory batchID,
        string memory stepName,
        string memory location,
        string memory actor
    ) external onlyAuthority {
        require(certificates[batchID].exists, "Certificate not found");

        certificateTraceSteps[batchID].push(
            TraceStep(stepName, location, actor, block.timestamp)
        );

        certificates[batchID].timestamp = block.timestamp;

        emit TraceStepAdded(batchID, stepName, location, actor, block.timestamp);
    }

    function getCertificateDetails(
        string memory batchID
    )
        external
        view
        returns (
            string memory returnedBatchID,
            string memory productID,
            string memory productName,
            string memory originCountry,
            string memory manufacturerName,
            string memory slaughterMethod,
            string memory certificateHash,
            uint256 issueDate,
            uint256 expiryDate,
            string memory halalStatus,
            uint256 timestamp
        )
    {
        require(certificates[batchID].exists, "Certificate not found");

        CertificateRecord memory record = certificates[batchID];

        return (
            record.batchID,
            record.productID,
            record.productName,
            record.originCountry,
            record.manufacturerName,
            record.slaughterMethod,
            record.certificateHash,
            record.issueDate,
            record.expiryDate,
            statusToString(
                block.timestamp > record.expiryDate ? HalalStatus.Expired : record.halalStatus
            ),
            record.timestamp
        );
    }
    
    function getTraceSteps(
        string memory batchID
    ) external view returns (TraceStep[] memory) {
        require(certificates[batchID].exists, "Certificate not found");
        return certificateTraceSteps[batchID];
    }

    function statusToString(HalalStatus status) internal pure returns (string memory) {
        if (status == HalalStatus.UnderProcess) return "Under Process";
        if (status == HalalStatus.Valid) return "Valid";
        if (status == HalalStatus.NotValid) return "Not Valid";
        return "Expired";
    }
}
