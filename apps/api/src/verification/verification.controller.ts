import { asyncHandler } from "../lib/http.js";
import { buildQrPayload, buildVerificationPayload } from "./verification.service.js";

export const verifyProductController = asyncHandler(async (req, res) => {
  const payload = await buildVerificationPayload(String(req.params.productId));
  if (!payload) {
    return res.status(404).json({ message: "Product not found." });
  }

  return res.json(payload);
});

export const productQrController = asyncHandler(async (req, res) => {
  const payload = await buildQrPayload(String(req.params.productId));
  return res.json(payload);
});
