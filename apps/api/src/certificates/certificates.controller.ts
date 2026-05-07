import multer from "multer";
import { asyncHandler } from "../lib/http.js";
import { getCertificate, getCertificates, reviewCertificate, uploadCertificate, deleteCertificate } from "./certificates.service.js";

const ALLOWED_MIMETYPES = ["application/pdf", "image/png", "image/jpeg"];

export const certificateUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, PNG, and JPG files are accepted. Please convert your file and try again."));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

export const uploadCertificateController = asyncHandler(async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const halalFile = files?.["certificate"]?.[0];
  const healthFile = files?.["healthCertificate"]?.[0];

  if (!halalFile) {
    return res.status(400).json({ message: "Halal certificate file is required." });
  }

  const certificate = await uploadCertificate(halalFile, req.body, healthFile);
  return res.status(201).json(certificate);
});

export const listCertificatesController = asyncHandler(async (_req, res) => {
  const certificates = await getCertificates();
  return res.json(certificates);
});

export const getCertificateController = asyncHandler(async (req, res) => {
  const certificate = await getCertificate(String(req.params.id));
  if (!certificate) {
    return res.status(404).json({ message: "Certificate not found." });
  }
  return res.json(certificate);
});

export const reviewCertificateController = asyncHandler(async (req, res) => {
  const certificate = await reviewCertificate({
    ...req.body,
    certificateId: String(req.params.id)
  });
  return res.json(certificate);
});

export const deleteCertificateController = asyncHandler(async (req, res) => {
  await deleteCertificate(String(req.params.id));
  return res.status(200).json({ message: "Certificate deleted successfully." });
});
