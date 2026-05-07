import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    AICheckedAt: { type: Date, required: true },
    AIReason: { type: String, required: true },
    AIScore: { type: Number, required: true },
    AIVerdict: { type: String, required: true },
    ApprovedAt: { type: Date, default: null },
    ApprovedBy: { type: String, default: null },
    Authority: { type: String, required: true },
    BlockchainHash: { type: String, default: null },
    BlockchainTimestamp: { type: Date, default: null },
    BlockchainTxID: { type: String, default: null },
    CertNumber: { type: String, required: true, index: true },
    CertType: { type: String, required: true },
    CreatedAt: { type: Date, required: true },
    ExpiryDate: { type: Date, required: true },
    ImageHash: { type: String, required: true },
    ImagePath: { type: String, required: true },
    ImageData: { type: String, default: null },
    HealthImagePath: { type: String, default: null },
    HealthImageData: { type: String, default: null },
    IssueDate: { type: Date, required: true },
    Status: { type: String, required: true, index: true }
  },
  {
    collection: "certificates",
    versionKey: false
  }
);

export const CertificateModel = mongoose.model("Certificate", certificateSchema);
