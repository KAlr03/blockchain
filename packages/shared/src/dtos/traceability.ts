import { z } from "zod";

export const createTraceabilitySchema = z.object({
  productId: z.string().min(2),
  batchNumber: z.string().min(2),
  actorName: z.string().min(2),
  stage: z.string().min(2),
  status: z.string().min(2),
  location: z.string().min(2),
  country: z.string().min(2),
  notes: z.string().min(2),
  temperature: z.string().min(1),
  timestamp: z.string().datetime()
});
