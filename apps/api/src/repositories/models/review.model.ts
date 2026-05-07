import mongoose from "mongoose";
const s = new mongoose.Schema(
  { Name: { type: String, required: true }, Role: { type: String, required: true }, Comment: { type: String, required: true }, Stars: { type: Number, required: true, min: 1, max: 5 }, CreatedAt: { type: Date, default: Date.now } },
  { collection: "reviews", versionKey: false }
);
export const ReviewModel = mongoose.model("Review", s);
