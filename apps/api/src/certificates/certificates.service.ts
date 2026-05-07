import { uploadCertificateSchema, reviewCertificateSchema } from "@halal/shared";
import { buildCertificateId } from "../lib/ids.js";
import { sha256FromBuffer } from "../lib/hash.js";
import { storeUploadedFile } from "../storage/storage.service.js";
import { runAiVerification } from "../ai/ai.service.js";
import {
  createCertificateRecord,
  findCertificateById,
  findCertificateDocumentById,
  listCertificates,
  updateCertificateRecord,
  deleteCertificateById
} from "../repositories/certificate.repository.js";
import { attachCertificateToProduct, getProduct, getProductByCertificateRef } from "../products/products.service.js";
import { recordCertificateDecisionOnChain } from "../blockchain/blockchain.service.js";

// ── AI verification using GPT-4o vision ──────────────────────────────────────
async function runInlineAIVerification(certificateId: string, certData: {
  certNumber: string;
  certType: string;
  authority: string;
  issueDate: Date;
  expiryDate: Date;
  imageDataUrl: string | null;
  healthImageDataUrl?: string | null;
}) {
  try {
    const result = await runAiVerification(certData);

    await updateCertificateRecord(certificateId, {
      AICheckedAt: result.checkedAt,
      AIReason: result.reason,
      AIScore: result.score,
      AIVerdict: result.verdict,
      Status: "UNDER_AUTHORITY_REVIEW",
    });

    console.log(`[api] AI check complete for ${certificateId}: ${result.verdict} (${result.score}/100)`);
  } catch (err) {
    console.error(`[api] AI check failed for ${certificateId}:`, err);
  }
}

export async function uploadCertificate(file: Express.Multer.File, input: unknown, healthFile?: Express.Multer.File) {
  const payload = uploadCertificateSchema.parse(input);
  const product = await getProduct(payload.productId);
  if (!product) {
    throw new Error("Product not found.");
  }

  const storedFile = await storeUploadedFile(file);
  const certificateId = buildCertificateId(payload.certNumber);
  const certificateHash = sha256FromBuffer(file.buffer);

  // Store health certificate if provided
  let healthImagePath: string | undefined;
  let healthImageData: string | undefined;
  if (healthFile) {
    const storedHealthFile = await storeUploadedFile(healthFile);
    healthImagePath = storedHealthFile.publicPath;
    healthImageData = storedHealthFile.dataUrl ?? undefined;
  }

  const certificate = await createCertificateRecord({
    id: certificateId,
    certNumber: payload.certNumber,
    certType: payload.certType,
    authority: payload.authority,
    imagePath: storedFile.publicPath,
    imageHash: certificateHash,
    imageData: storedFile.dataUrl ?? undefined,
    issueDate: new Date(payload.issueDate),
    expiryDate: new Date(payload.expiryDate),
    ...(healthImagePath && { healthImagePath }),
    ...(healthImageData && { healthImageData }),
  });

  await attachCertificateToProduct(payload.productId, certificate.id);

  // ── Trigger AI verification immediately with the actual image ───────────
  setImmediate(() => {
    runInlineAIVerification(certificate.id, {
      certNumber: payload.certNumber,
      certType: payload.certType,
      authority: payload.authority,
      issueDate: new Date(payload.issueDate),
      expiryDate: new Date(payload.expiryDate),
      imageDataUrl: storedFile.dataUrl ?? null,
      healthImageDataUrl: healthImageData ?? null,
    });
  });

  return certificate;
}

export async function getCertificates() {
  return listCertificates();
}

export async function getCertificate(id: string) {
  return findCertificateById(id);
}

export async function reviewCertificate(input: unknown) {
  const payload = reviewCertificateSchema.parse(input);
  const certificateDoc = await findCertificateDocumentById(payload.certificateId);
  if (!certificateDoc) {
    throw new Error("Certificate not found.");
  }

  const product = await getProductByCertificateRef(payload.certificateId);
  if (!product) {
    throw new Error("Product linked by HalalRef not found.");
  }

  const issueDate = new Date(certificateDoc.IssueDate as Date).getTime();
  const expiryDate = new Date(certificateDoc.ExpiryDate as Date).getTime();

  // For rejected/expired certs, pass 0 as expiryDate so the contract
  // doesn't reject the transaction due to a past expiry timestamp.
  const safeExpiryDate = payload.approved ? (expiryDate ? Math.floor(expiryDate / 1000) : 0) : 0;

  // Try blockchain — but don't block the review if it fails
  let chainResult = { status: payload.approved ? "APPROVED" : "REJECTED", txHash: null as string|null, blockHash: null as string|null, timestamp: new Date().toISOString() };
  try {
    const result = await recordCertificateDecisionOnChain({
      certificateId: String(certificateDoc._id),
      batchId: product.batchNumber,
      productId: product.productId,
      productName: product.productName,
      authority: String(certificateDoc.Authority),
      certificateHash: String(certificateDoc.ImageHash),
      issueDate: Math.floor(issueDate / 1000),
      expiryDate: safeExpiryDate,
      approved: payload.approved
    });
    chainResult = result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isAlreadyRecorded = msg.includes("Decision already recorded");
    if (isAlreadyRecorded) {
      console.log("[api] Certificate already recorded on blockchain — skipping duplicate write.");
    } else {
      console.error("[api] Blockchain recording failed:", msg);
      if (err && typeof err === "object" && "reason" in err) {
        console.error("[api] Contract revert reason:", (err as { reason: string }).reason);
      }
    }
  }

  const normalizedStatus = payload.approved ? "APPROVED" : "REJECTED";

  return updateCertificateRecord(payload.certificateId, {
    ApprovedAt: new Date(chainResult.timestamp),
    ApprovedBy: payload.approvedBy,
    BlockchainHash: chainResult.blockHash,
    BlockchainTimestamp: new Date(chainResult.timestamp),
    BlockchainTxID: chainResult.txHash,
    Status: normalizedStatus
  });
}

export async function getCertificateByProduct(productId: string) {
  const product = await getProduct(productId);
  if (!product || !product.halalRef || product.halalRef === "PENDING_CERTIFICATE") {
    return null;
  }
  return findCertificateById(product.halalRef);
}

export async function deleteCertificate(id: string) {
  return deleteCertificateById(id);
}
