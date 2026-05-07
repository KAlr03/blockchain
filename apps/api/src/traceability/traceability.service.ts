import mongoose from "mongoose";
import { createTraceabilitySchema } from "@halal/shared";
import { sha256FromString } from "../lib/hash.js";
import { createTraceabilityRecord, listTraceabilityByProductId, deleteTraceabilityById } from "../repositories/traceability.repository.js";
import { getProduct } from "../products/products.service.js";
import { recordTraceabilityOnChain } from "../blockchain/blockchain.service.js";

function buildTraceabilityRecordHash(input: {
  productId: string;
  batchNumber: string;
  actorName: string;
  stage: string;
  status: string;
  location: string;
  country: string;
  notes: string;
  temperature: string;
  timestamp: Date;
}) {
  return sha256FromString(
    JSON.stringify({
      productId: input.productId,
      batchNumber: input.batchNumber,
      actorName: input.actorName,
      stage: input.stage,
      status: input.status,
      location: input.location,
      country: input.country,
      notes: input.notes,
      temperature: input.temperature,
      timestamp: input.timestamp.toISOString()
    })
  );
}

export async function createTrace(input: unknown) {
  const payload = createTraceabilitySchema.parse(input);
  const product = await getProduct(payload.productId);
  if (!product) {
    throw new Error("Product not found.");
  }

  // Block traceability if certificate is rejected
  if (product.halalRef && product.halalRef !== "PENDING_CERTIFICATE") {
    const { findCertificateById } = await import("../repositories/certificate.repository.js");
    const cert = await findCertificateById(product.halalRef);
    if (cert && cert.status === "REJECTED") {
      throw new Error("Cannot add traceability records for a product with a rejected certificate. Please upload a new valid certificate first.");
    }
  }

  const timestamp = new Date(payload.timestamp);
  const traceId = new mongoose.Types.ObjectId();
  const recordHash = buildTraceabilityRecordHash({
    productId: payload.productId,
    batchNumber: payload.batchNumber,
    actorName: payload.actorName,
    stage: payload.stage,
    status: payload.status,
    location: payload.location,
    country: payload.country,
    notes: payload.notes,
    temperature: payload.temperature,
    timestamp
  });
  const chainResult = await recordTraceabilityOnChain({
    traceId: traceId.toString(),
    productId: payload.productId,
    batchNumber: payload.batchNumber,
    stage: payload.stage,
    actorName: payload.actorName,
    recordHash,
    eventTimestamp: Math.floor(timestamp.getTime() / 1000)
  });

  return createTraceabilityRecord({
    id: traceId,
    productId: payload.productId,
    batchNumber: payload.batchNumber,
    actorName: payload.actorName,
    stage: payload.stage,
    status: payload.status,
    location: payload.location,
    country: payload.country,
    notes: payload.notes,
    temperature: payload.temperature,
    timestamp,
    recordHash,
    blockchainHash: chainResult.blockHash,
    blockchainTxId: chainResult.txHash,
    blockchainTimestamp: new Date(chainResult.timestamp)
  });
}

export async function getTraceability(productId: string) {
  return listTraceabilityByProductId(productId);
}

export async function deleteTrace(id: string) {
  return deleteTraceabilityById(id);
}
