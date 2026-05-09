// SPDX-License-Identifier: MIT     // means allowed to use for the public 
pragma solidity ^0.8.24;            // version

contract HalalCertificateRegistry {         // enum is a list of what’s only allowed

    enum HalalStatus {                      //UnderProcess=0, Valid=1, NotValid=2, Expired=3. 
        UnderProcess,                        // Every certificate starts as UnderProcess
        Valid,
        NotValid,
        Expired
    }

// A struct is a template — like a form with labeled fields. 
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
//Multiple TraceSteps are stored as an array per certificate,
    struct TraceStep {
        string stepName;
        string location;
        string actor;
        uint256 timestamp;
    }
//These five variables are the permanent storage of the contract 
//— they live on the blockchain forever.

    address public admin;           // Ethereum wallet address — a 42-character code like 0x1A2B3C.... It identifies who is who on the blockchain.
    mapping(address => bool) public authorities;
    mapping(address => bool) public manufacturers;
    mapping(string => CertificateRecord) private certificates;
    mapping(string => TraceStep[]) private certificateTraceSteps;  


    //Events are notifications that get logged to the blockchain when something happens. They do not store data inside the contract — they are more like a receipt. Tools like Etherscan read these events and display them publicly.
indexed on a field means it can be searched and filtered efficiently — like putting an index on a database column.
When approveCertificate() runs, it fires CertificateApproved — anyone watching the blockchain sees it immediately.


    event ManufacturerUpdated(address indexed account, bool allowed);
    event AuthorityUpdated(address indexed authorityAddress, bool allowed);
    event TraceStepAdded(string indexed batchID, string stepName, string location, string actor, uint256 timestamp);
    event CertificateAdded(string indexed batchID, string certificateHash, uint256 timestamp);
    event CertificateApproved(string indexed productID, HalalStatus status, uint256 timestamp);


// modifier is a security check that runs before any function it is attached to.


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


//The constructor runs exactly once — when the contract is deployed to the blockchain. Never again. 

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


//This is the moment data is permanently written to the blockchain. We fill in every field of the CertificateRecord struct and store it in the certificates mapping under the batchID key.

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
