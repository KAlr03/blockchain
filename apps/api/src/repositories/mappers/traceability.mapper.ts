import type { TraceabilityRecordDto } from "@halal/shared";

export function toTraceabilityDto(document: Record<string, unknown>): TraceabilityRecordDto {
  return {
    id: String(document._id),
    productId: String(document.ProductID),
    batchNumber: String(document.BatchNumber),
    actorName: String(document.ActorName),
    stage: String(document.Stage),
    status: String(document.Status),
    location: String(document.Location),
    country: String(document.Country),
    notes: String(document.Notes),
    temperature: String(document.Temperature),
    timestamp: new Date(document.Timestamp as string | Date).toISOString(),
    recordHash: (document.RecordHash as string | null) ?? null,
    blockchainHash: (document.BlockchainHash as string | null) ?? null,
    blockchainTxId: (document.BlockchainTxID as string | null) ?? null,
    blockchainTimestamp: document.BlockchainTimestamp
      ? new Date(document.BlockchainTimestamp as string | Date).toISOString()
      : null
  };
}
