import mongoose from "mongoose";

const HalalProductSchema = new mongoose.Schema(
  {
    BatchNumber: { type: String, required: true, index: true },
    Brand: { type: String, required: true },
    Category: { type: String, required: true, index: true },
    CreatedAt: { type: Date, required: true },
    HalalRef: { type: String, required: true, index: true },
    HealthRef: { type: String, required: true },
    Manufacturer: { type: String, required: true, index: true },
    OriginCountry: { type: String, required: true },
    ProductID: { type: String, required: true, unique: true, index: true },
    ProductImage: { type: String, default: null },
    ProductName: { type: String, required: true },
    QRCodePath: { type: String, default: null },
    Weight: { type: String, required: true }
  },
  {
    collection: "products",
    versionKey: false
  }
);

export const HalalProduct = mongoose.model("HalalProduct", HalalProductSchema);
