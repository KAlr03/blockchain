import { TraceabilityModel } from "./models/traceability.model.js";
import { toTraceabilityDto } from "./mappers/traceability.mapper.js";

export async function createTraceabilityRecord(input: {
  id?: unknown;
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
  recordHash: string | null;
  blockchainHash: string | null;
  blockchainTxId: string | null;
  blockchainTimestamp: Date | null;
}) {
  const record = await TraceabilityModel.create({
    ...(input.id ? { _id: input.id } : {}),
    ActorName: input.actorName,
    BatchNumber: input.batchNumber,
    BlockchainHash: input.blockchainHash,
    BlockchainTimestamp: input.blockchainTimestamp,
    BlockchainTxID: input.blockchainTxId,
    Country: input.country,
    Location: input.location,
    Notes: input.notes,
    ProductID: input.productId,
    RecordHash: input.recordHash,
    Stage: input.stage,
    Status: input.status,
    Temperature: input.temperature,
    Timestamp: input.timestamp
  });

  return toTraceabilityDto(record.toObject());
}

export async function listTraceabilityByProductId(productId: string) {
  const records = await TraceabilityModel.find({ ProductID: productId }).sort({ Timestamp: 1 }).lean();
  return records.map((record) => toTraceabilityDto(record));
}

export async function deleteTraceabilityById(id: string) {
  await TraceabilityModel.findByIdAndDelete(id);
}
