import { randomUUID } from "crypto";

function normalizeIdSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function buildProductId(batchNumber: string) {
  return `PROD-${normalizeIdSegment(batchNumber)}-${Date.now()}`;
}

export function buildCertificateId(certNumber: string) {
  return `CERT-${normalizeIdSegment(certNumber)}-${randomUUID()}`;
}
