import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { config } from "../config.js";
import { runPlaceholderAiVerification } from "../services/aiVerification.js";
import { sha256FromBuffer } from "../services/hash.js";
import {
  addCertificateOnChain,
  approveCertificateOnChain,
  getCertificateDetailsOnChain,
  addTraceStepOnChain
} from "../services/blockchain.js";
import {
  buildAuthorityStatusUpdate,
  buildVerificationMessage,
  deriveDisplayedStatus,
  isExpired
} from "../services/status.js";
import {
  createCertificate,
  getCertificateByProductID,
  listCertificates as listCertificatesFromStore,
  updateCertificate
} from "../store/certificateStore.js";

function buildProductId(batchID) {
  return `PROD-${batchID}-${Date.now()}`;
}

export async function uploadCertificate(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Certificate file is required." });
    }

    const { productName, batchID, manufacturer, origin, expiryDate, slaughterMethod } = req.body;
    if (!productName || !batchID || !manufacturer || !origin || !expiryDate || !slaughterMethod) {
      return res.status(400).json({ message: "Missing required product fields." });
    }

    const productID = buildProductId(batchID);
    const fileBuffer = fs.readFileSync(file.path);
    const certificateHash = sha256FromBuffer(fileBuffer);
    const aiResult = runPlaceholderAiVerification({
      originalName: file.originalname,
      mimeType: file.mimetype
    });

    const verifyUrl = `${config.verifyBaseUrl}/${encodeURIComponent(productID)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);
    const issueDateUnix = Math.floor(Date.now() / 1000);

    const expiryDateObj = new Date(expiryDate);
    if (Number.isNaN(expiryDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid expiry date." });
    }

    const expiryDateUnix = Math.floor(expiryDateObj.getTime() / 1000);
    if (expiryDateUnix <= issueDateUnix) {
      return res.status(400).json({ message: "Expiry date must be later than today." });
    }

    const chainResult = await addCertificateOnChain({
      batchID,
      productID,
      productName,
      originCountry: origin,
      manufacturerName: manufacturer,
      slaughterMethod,
      certificateHash,
      issueDate: issueDateUnix,
      expiryDate: expiryDateUnix
    });

    await addTraceStepOnChain(
      batchID,
      "Product Registered",
      origin,
      manufacturer
    );

    const record = await createCertificate({
      productID,
      productName,
      batchID,
      manufacturer,
      origin,
      slaughterMethod,
      expiryDate,
      certificateHash,
      certificateFileName: file.originalname,
      certificateStoragePath: path.resolve(file.path),
      aiCheckPassed: aiResult.passed,
      aiCheckNotes: aiResult.notes,
      halalStatus: "Under Process",
      blockchainTxHash: chainResult.txHash,
      qrCodeDataUrl
    });

    return res.status(201).json(record);
  } catch (error) {
    return res.status(500).json({ message: "Failed to upload certificate.", error: error.message });
  }
}

export async function approveCertificate(req, res) {
  try {
    const { productID } = req.params;
    const { approved, authorityDecisionNotes, approvedBy = "Authority" } = req.body;

    const record = await getCertificateByProductID(productID);
    if (!record) {
      return res.status(404).json({ message: "Certificate not found." });
    }

    const approvedFlag = approved === true || approved === "true";
    const nextStatus = buildAuthorityStatusUpdate(record, approvedFlag);
    const chainResult = await approveCertificateOnChain(
      record.batchID,
      approvedFlag
    );

    const updated = await updateCertificate(productID, {
      halalStatus: nextStatus.halalStatus,
      authorityDecisionNotes: authorityDecisionNotes || nextStatus.authorityDecisionNotes,
      approvedBy,
      blockchainTxHash: chainResult.txHash
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update approval.", error: error.message });
  }
}

export async function verifyCertificate(req, res) {
  try {
    const { productID } = req.params;
    const record = await getCertificateByProductID(productID);
    if (!record) {
      return res.status(404).json({ message: "Product not found." });
    }

    const chainRecord = await getCertificateDetailsOnChain(record.batchID);
    const displayedStatus = deriveDisplayedStatus(record);

    return res.json({
      productID: record.productID,
      productName: record.productName,
      batchID: record.batchID,
      manufacturer: record.manufacturer,
      origin: record.origin,
      slaughterMethod: record.slaughterMethod,
      expiryDate: record.expiryDate,
      halalStatus: displayedStatus,
      storedStatus: record.halalStatus,
      verificationResult: buildVerificationMessage(displayedStatus),
      certificateHash: record.certificateHash,
      qrCodeDataUrl: record.qrCodeDataUrl,
      aiCheckPassed: record.aiCheckPassed,
      aiCheckNotes: record.aiCheckNotes,
      authorityDecisionNotes: record.authorityDecisionNotes,
      isExpired: isExpired(record.expiryDate),
      blockchain: chainRecord || {
        certificateHash: record.certificateHash,
        productID: record.productID,
        halalStatus: displayedStatus,
        timestamp: new Date(record.updatedAt).getTime() / 1000
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify certificate.", error: error.message });
  }
}

export async function listCertificates(req, res) {
  const { status } = req.query;
  const records = await listCertificatesFromStore(status);
  res.json(records);
}

export async function addTraceStep(req, res) {
  try {
    const { productID } = req.params;
    const { stepName, location, actor } = req.body;

    if (!stepName || !location || !actor) {
      return res.status(400).json({ message: "stepName, location, and actor are required." });
    }

    const record = await getCertificateByProductID(productID);
    if (!record) {
      return res.status(404).json({ message: "Certificate not found." });
    }

    const chainResult = await addTraceStepOnChain(
      record.batchID,
      stepName,
      location,
      actor
    );

    return res.json({
      message: "Trace step added successfully.",
      batchID: record.batchID,
      txHash: chainResult.txHash
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add trace step.", error: error.message });
  }
}
