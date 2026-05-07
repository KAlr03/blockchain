import mongoose from "mongoose";
const s = new mongoose.Schema(
  { UserId: { type: String, required: true, index: true }, ProductId: { type: String, required: true }, AddedAt: { type: Date, default: Date.now } },
  { collection: "favourites", versionKey: false }
);
s.index({ UserId: 1, ProductId: 1 }, { unique: true });
export const FavouriteModel = mongoose.model("Favourite", s);
