import { z } from "zod";

export const uploadCertificateSchema = z.object({
  productId: z.string().min(2),
  certNumber: z.string().min(2),
  certType: z.string().min(2),
  authority: z.string().min(2),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime()
});

export const reviewCertificateSchema = z.object({
  certificateId: z.string().min(2),
  approved: z.boolean(),
  approvedBy: z.string().min(2),
  authorityNotes: z.string().min(2)
});
