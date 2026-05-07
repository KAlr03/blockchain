import { asyncHandler } from "../lib/http.js";
import { createTrace, getTraceability, deleteTrace } from "./traceability.service.js";

export const createTraceabilityController = asyncHandler(async (req, res) => {
  const record = await createTrace(req.body);
  return res.status(201).json(record);
});

export const listTraceabilityController = asyncHandler(async (req, res) => {
  const records = await getTraceability(String(req.params.id));
  return res.json(records);
});

export const deleteTraceabilityController = asyncHandler(async (req, res) => {
  await deleteTrace(String(req.params.id));
  return res.status(200).json({ message: "Traceability record deleted successfully." });
});
