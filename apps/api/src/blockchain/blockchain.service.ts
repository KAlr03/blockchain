import { ethers } from "ethers";
import { env } from "@halal/config";

const registryAbi = [
  "function recordCertificateDecision(string certificateId, string batchID, string productID, string productName, string authority, string certificateHash, uint256 issueDate, uint256 expiryDate, bool approved) external",
  "function getCertificateByProductId(string productID) external view returns (string returnedCertificateId, string batchID, string returnedProductID, string productName, string authority, string certificateHash, uint256 issueDate, uint256 expiryDate, string halalStatus, uint256 decisionTimestamp)",
  "function recordTraceability(string traceId, string productID, string batchID, string stage, string actorName, string recordHash, uint256 eventTimestamp) external",
  "function getTraceabilityById(string traceId) external view returns (string returnedTraceId, string productID, string batchID, string stage, string actorName, string recordHash, uint256 eventTimestamp, uint256 anchoredAt)"
];

function getContract() {
  if (!env.BLOCKCHAIN_PRIVATE_KEY || !env.CONTRACT_ADDRESS) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
  const wallet = new ethers.Wallet(env.BLOCKCHAIN_PRIVATE_KEY, provider);
  return {
    contract: new ethers.Contract(env.CONTRACT_ADDRESS, registryAbi, wallet),
    provider
  };
}

export async function recordCertificateDecisionOnChain(input: {
  certificateId: string;
  batchId: string;
  productId: string;
  productName: string;
  authority: string;
  certificateHash: string;
  issueDate: number;
  expiryDate: number;
  approved: boolean;
}) {
  const connected = getContract();
  if (!connected) {
    const timestamp = new Date().toISOString();
    const isExpired = input.expiryDate > 0 && Math.floor(new Date(timestamp).getTime() / 1000) > input.expiryDate;

    return {
      txHash: `mock-chain-${input.certificateId}-${input.approved ? "approved" : "rejected"}`,
      blockHash: `mock-block-${input.certificateId}`,
      timestamp,
      certificateHash: input.certificateHash,
      status: isExpired ? "Expired" : input.approved ? "Approved" : "Rejected"
    };
  }

  const { contract, provider } = connected;

  const tx = await contract.recordCertificateDecision(
    input.certificateId,
    input.batchId,
    input.productId,
    input.productName,
    input.authority,
    input.certificateHash,
    input.issueDate,
    input.expiryDate,
    input.approved
  );

  const receipt = await tx.wait();
  let timestamp = new Date().toISOString();

  if (receipt?.blockNumber !== undefined && receipt?.blockNumber !== null) {
    const block = await provider.getBlock(receipt.blockNumber);
    if (block?.timestamp) {
      timestamp = new Date(block.timestamp * 1000).toISOString();
    }
  }

  const isExpired = input.expiryDate > 0 && Math.floor(new Date(timestamp).getTime() / 1000) > input.expiryDate;

  return {
    txHash: receipt?.hash ?? tx.hash,
    blockHash: receipt?.blockHash ?? null,
    timestamp,
    certificateHash: input.certificateHash,
    status: isExpired ? "Expired" : input.approved ? "Approved" : "Rejected"
  };
}

export async function getCertificateDecisionFromChain(productId: string) {
  const connected = getContract();
  if (!connected) {
    return null;
  }

  try {
    const { contract } = connected;
    const result = await contract.getCertificateByProductId(productId);
    return {
      certificateId: result[0],
      batchId: result[1],
      productId: result[2],
      productName: result[3],
      authority: result[4],
      certificateHash: result[5],
      issueDate: Number(result[6]),
      expiryDate: Number(result[7]),
      status: result[8],
      timestamp: Number(result[9])
    };
  } catch {
    return null;
  }
}

export async function recordTraceabilityOnChain(input: {
  traceId: string;
  productId: string;
  batchNumber: string;
  stage: string;
  actorName: string;
  recordHash: string;
  eventTimestamp: number;
}) {
  const connected = getContract();
  if (!connected) {
    const timestamp = new Date().toISOString();

    return {
      txHash: `mock-trace-${input.traceId}`,
      blockHash: `mock-trace-block-${input.traceId}`,
      timestamp,
      recordHash: input.recordHash
    };
  }

  const { contract, provider } = connected;
  const tx = await contract.recordTraceability(
    input.traceId,
    input.productId,
    input.batchNumber,
    input.stage,
    input.actorName,
    input.recordHash,
    input.eventTimestamp
  );

  const receipt = await tx.wait();
  let timestamp = new Date().toISOString();

  if (receipt?.blockNumber !== undefined && receipt?.blockNumber !== null) {
    const block = await provider.getBlock(receipt.blockNumber);
    if (block?.timestamp) {
      timestamp = new Date(block.timestamp * 1000).toISOString();
    }
  }

  return {
    txHash: receipt?.hash ?? tx.hash,
    blockHash: receipt?.blockHash ?? null,
    timestamp,
    recordHash: input.recordHash
  };
}
