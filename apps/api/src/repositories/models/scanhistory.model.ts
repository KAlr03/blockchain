import mongoose from "mongoose";
const s = new mongoose.Schema(
  { UserId: { type: String, required: true, index: true }, ProductId: { type: String, required: true }, ScannedAt: { type: Date, default: Date.now } },
  { collection: "scan_history", versionKey: false }
);
export const ScanHistoryModel = mongoose.model("ScanHistory", s);
