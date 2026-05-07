import { runDeterministicAiVerification } from "../ai/ai.service.js";
import { listPendingAiCertificateDocuments, updateCertificateRecord } from "../repositories/certificate.repository.js";
import { toCertificateDto } from "../repositories/mappers/certificate.mapper.js";

export async function processPendingCertificatesOnce() {
  const pending = await listPendingAiCertificateDocuments();

  for (const document of pending) {
    const dto = toCertificateDto(document);
    const aiResult = runDeterministicAiVerification(dto);

    await updateCertificateRecord(dto.id, {
      AICheckedAt: aiResult.checkedAt,
      AIReason: aiResult.reason,
      AIScore: aiResult.score,
      AIVerdict: aiResult.verdict,
      Status: "UNDER_AUTHORITY_REVIEW"
    });
  }

  return pending.length;
}
