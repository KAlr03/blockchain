import { ethers } from "ethers";
import { config } from "../config.js";

const registryAbi = [
  "function addCertificate(string batchID, string productID, string productName, string originCountry, string manufacturerName, string slaughterMethod, string certificateHash, uint256 issueDate, uint256 expiryDate) external",
  "function approveCertificate(string batchID, bool approved) external",
  "function addTraceStep(string batchID, string stepName, string location, string actor) external",
  "function getCertificateDetails(string batchID) external view returns (string returnedBatchID, string productID, string productName, string originCountry, string manufacturerName, string slaughterMethod, string certificateHash, uint256 issueDate, uint256 expiryDate, string halalStatus, uint256 timestamp)"
];

function getContract() {
  if (!config.blockchainRpcUrl || !config.blockchainPrivateKey || !config.contractAddress) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(config.blockchainRpcUrl);
  const wallet = new ethers.Wallet(config.blockchainPrivateKey, provider);
  return new ethers.Contract(config.contractAddress, registryAbi, wallet);
}

export async function addCertificateOnChain(data) {
  const contract = getContract();
  if (!contract) {
    return { txHash: `mock-add-${data.batchID}` };
  }

  const tx = await contract.addCertificate(
    data.batchID,
    data.productID,
    data.productName,
    data.originCountry,
    data.manufacturerName,
    data.slaughterMethod,
    data.certificateHash,
    data.issueDate,
    data.expiryDate
  );

  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function approveCertificateOnChain(batchID, approved) {
  const contract = getContract();
  if (!contract) {
    const status = approved ? "valid" : "not-valid";
    return { txHash: `mock-approve-${batchID}-${status}` };
  }

  const tx = await contract.approveCertificate(batchID, approved);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function addTraceStepOnChain(batchID, stepName, location, actor) {
  const contract = getContract();
  if (!contract) {
    return { txHash: `mock-trace-${batchID}-${stepName}` };
  }

  const tx = await contract.addTraceStep(batchID, stepName, location, actor);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function getCertificateDetailsOnChain(batchID) {
  const contract = getContract();
  if (!contract) {
    return null;
  }

  const result = await contract.getCertificateDetails(batchID);

  return {
    batchID: result[0],
    productID: result[1],
    productName: result[2],
    originCountry: result[3],
    manufacturerName: result[4],
    slaughterMethod: result[5],
    certificateHash: result[6],
    issueDate: Number(result[7]),
    expiryDate: Number(result[8]),
    halalStatus: result[9],
    timestamp: Number(result[10])
  };
}
