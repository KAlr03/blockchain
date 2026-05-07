import mongoose from "mongoose";

const HalalUserSchema = new mongoose.Schema(
  {
    Country: { type: String, required: true },
    CreatedAt: { type: Date, required: true },
    Email: { type: String, required: true, unique: true, index: true },
    ManufacturerID: { type: String, required: true, index: true },
    Name: { type: String, required: true },
    OrganizationName: { type: String, required: true },
    Password: { type: String, required: true },
    Role: { type: String, required: true, index: true },
    Status: { type: String, required: true, index: true },
  },
  {
    collection: "users",
    versionKey: false,
  },
);

export const HalalUser = mongoose.model("HalalUser", HalalUserSchema);
