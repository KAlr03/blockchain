import { z } from "zod";

export const createProductSchema = z.object({
  productName: z.string().min(2),
  batchNumber: z.string().min(2),
  brand: z.string().min(2),
  category: z.string().min(2),
  manufacturer: z.string().min(2),
  originCountry: z.string().min(2),
  halalRef: z.string().min(2),
  healthRef: z.string().min(2),
  weight: z.string().min(1),
  productImage: z.string().nullable().optional()
});
