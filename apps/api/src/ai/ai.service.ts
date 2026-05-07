import type { CertificateDto } from "@halal/shared";

export interface AiVerificationResult {
  verdict: string;
  reason: string;
  score: number;
  checkedAt: Date;
}

export function runDeterministicAiVerification(certificate: Pick<CertificateDto, "certNumber" | "certType" | "authority" | "imagePath" | "issueDate" | "expiryDate">): AiVerificationResult {
  const now = new Date();
  const reasons: string[] = [];
  let score = 40;

  if (certificate.certNumber.length >= 6) {
    score += 20;
    reasons.push("Certificate number length looks valid.");
  }

  if (certificate.authority.toLowerCase().includes("kuwait") || certificate.authority.toLowerCase().includes("halal")) {
    score += 20;
    reasons.push("Authority name matches halal governance expectations.");
  }

  if (certificate.certType.toLowerCase().includes("halal")) {
    score += 10;
    reasons.push("Certificate type matches expected halal classification.");
  }

  if (
    certificate.imagePath.endsWith(".pdf") ||
    certificate.imagePath.endsWith(".png") ||
    certificate.imagePath.endsWith(".jpg") ||
    certificate.imagePath.endsWith(".jpeg")
  ) {
    score += 10;
    reasons.push("Document format is accepted.");
  }

  if (!certificate.expiryDate || new Date(certificate.expiryDate).getTime() > Date.now()) {
    score += 10;
    reasons.push("Certificate is not expired at AI review time.");
  }

  const verdict = score >= 70 ? "LIKELY_VALID" : "REQUIRES_REVIEW";

  return {
    verdict,
    reason: reasons.join(" "),
    score,
    checkedAt: now
  };
}
