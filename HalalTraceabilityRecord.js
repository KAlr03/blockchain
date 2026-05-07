import mongoose from "mongoose";

const HalalTraceabilityRecordSchema = new mongoose.Schema(
  {
    ActorName: { type: String, required: true },
    BatchNumber: { type: String, required: true, index: true },
    BlockchainTimestamp: { type: Date, default: null },
    BlockchainHash: { type: String, default: null },
    BlockchainTxID: { type: String, default: null },
    Country: { type: String, required: true },
    Location: { type: String, required: true },
    Notes: { type: String, required: true },
    ProductID: { type: String, required: true, index: true },
    RecordHash: { type: String, default: null },
    Stage: { type: String, required: true, index: true },
    Status: { type: String, required: true, index: true },
    Temperature: { type: String, required: true },
    Timestamp: { type: Date, required: true }
  },
  {
    collection: "traceability_records",
    versionKey: false
  }
);

export const HalalTraceabilityRecord = mongoose.model(
  "HalalTraceabilityRecord",
  HalalTraceabilityRecordSchema
);
