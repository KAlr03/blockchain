import { CertificateModel } from "./models/certificate.model.js";
import { toCertificateDto } from "./mappers/certificate.mapper.js";

export async function createCertificateRecord(input: {
  id: string;
  certNumber: string;
  certType: string;
  authority: string;
  imagePath: string;
  imageHash: string;
  imageData?: string;
  issueDate: Date;
  expiryDate: Date;
  healthImagePath?: string;
  healthImageData?: string;
}) {
  const now = new Date();
  const certificate = await CertificateModel.create({
    _id: input.id,
    AICheckedAt: now,
    AIReason: "Pending OCR verification.",
    AIScore: 0,
    AIVerdict: "PENDING",
    ApprovedAt: null,
    ApprovedBy: null,
    Authority: input.authority,
    BlockchainHash: null,
    BlockchainTimestamp: null,
    BlockchainTxID: null,
    CertNumber: input.certNumber,
    CertType: input.certType,
    CreatedAt: now,
    ExpiryDate: input.expiryDate,
    ImageHash: input.imageHash,
    ImagePath: input.imagePath,
    ImageData: input.imageData ?? null,
    HealthImagePath: input.healthImagePath ?? null,
    HealthImageData: input.healthImageData ?? null,
    IssueDate: input.issueDate,
    Status: "PENDING_AI"
  });

  return toCertificateDto(certificate.toObject());
}

export async function listCertificates() {
  const certificates = await CertificateModel.find().sort({ CreatedAt: -1 }).lean();
  return certificates.map((certificate) => toCertificateDto(certificate));
}

export async function findCertificateById(id: string) {
  const certificate = await CertificateModel.findById(id).lean();
  return certificate ? toCertificateDto(certificate) : null;
}

export async function findCertificateDocumentById(id: string) {
  return CertificateModel.findById(id).lean();
}

export async function updateCertificateRecord(id: string, updates: Record<string, unknown>) {
  const certificate = await CertificateModel.findByIdAndUpdate(id, updates, { new: true }).lean();
  return certificate ? toCertificateDto(certificate) : null;
}

export async function listPendingAiCertificateDocuments() {
  return CertificateModel.find({ Status: "PENDING_AI" }).lean();
}

export async function deleteCertificateById(id: string) {
  await CertificateModel.findByIdAndDelete(id);
}
