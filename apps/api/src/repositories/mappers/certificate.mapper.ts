import type { CertificateDto } from "@halal/shared";

export function toCertificateDto(document: Record<string, unknown>): CertificateDto {
  return {
    id: String(document._id),
    certNumber: String(document.CertNumber),
    certType: String(document.CertType ?? ""),
    authority: String(document.Authority),
    imagePath: String(document.ImagePath),
    imageHash: String(document.ImageHash),
    healthImagePath: (document.HealthImagePath as string | null) ?? null,
    status: String(document.Status) as CertificateDto["status"],
    aiVerdict: String(document.AIVerdict),
    aiReason: String(document.AIReason),
    aiScore: Number(document.AIScore),
    aiCheckedAt: new Date(document.AICheckedAt as string | Date).toISOString(),
    issueDate: new Date(document.IssueDate as string | Date).toISOString(),
    expiryDate: document.ExpiryDate ? new Date(document.ExpiryDate as string | Date).toISOString() : null,
    approvedAt: document.ApprovedAt ? new Date(document.ApprovedAt as string | Date).toISOString() : null,
    approvedBy: (document.ApprovedBy as string | null) ?? null,
    blockchainHash: (document.BlockchainHash as string | null) ?? null,
    blockchainTxId: (document.BlockchainTxID as string | null) ?? null,
    blockchainTimestamp: document.BlockchainTimestamp
      ? new Date(document.BlockchainTimestamp as string | Date).toISOString()
      : null,
    createdAt: new Date(document.CreatedAt as string | Date).toISOString()
  };
}
