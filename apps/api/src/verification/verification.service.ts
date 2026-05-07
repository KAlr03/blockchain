import QRCode from "qrcode";
import { env } from "@halal/config";
import type { VerificationDto } from "@halal/shared";
import { getCertificateDecisionFromChain } from "../blockchain/blockchain.service.js";
import { getCertificateByProduct } from "../certificates/certificates.service.js";
import { getProduct } from "../products/products.service.js";
import { getTraceability } from "../traceability/traceability.service.js";

export async function buildVerificationPayload(productId: string): Promise<VerificationDto | null> {
  const product = await getProduct(productId);
  if (!product) {
    return null;
  }

  const certificate = await getCertificateByProduct(productId);

  const traceability = await getTraceability(productId);
  const chain = certificate ? await getCertificateDecisionFromChain(productId) : null;

  return {
    product,
    certificate: certificate ?? null,
    traceability,
    blockchain: {
      isAnchored: Boolean(chain || certificate?.blockchainTxId || certificate?.blockchainHash),
      blockHash: null,
      txId: null,
      timestamp: certificate?.blockchainTimestamp ?? (chain ? new Date(chain.timestamp * 1000).toISOString() : null),
      status: chain?.status ?? certificate?.status ?? null,
      certificateHash: chain?.certificateHash ?? certificate?.imageHash ?? null
    }
  };
}

export async function buildQrPayload(productId: string) {
  const verificationUrl = `${env.VERIFY_BASE_URL}/${encodeURIComponent(productId)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

  return {
    productId,
    verificationUrl,
    qrCodeDataUrl
  };
}
