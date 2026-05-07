import mongoose from "mongoose";
import { env } from "@halal/config";
import { createWorker } from "tesseract.js";
import fs from "fs";
import path from "path";

// ── MongoDB schema (minimal — only what the worker needs) ─────────────────────
const certificateSchema = new mongoose.Schema({
  _id:        { type: String, required: true },
  AICheckedAt:{ type: Date, required: true },
  AIReason:   { type: String, required: true },
  AIScore:    { type: Number, required: true },
  AIVerdict:  { type: String, required: true },
  Authority:  { type: String, required: true },
  CertNumber: { type: String, required: true },
  CertType:   { type: String, required: true },
  CreatedAt:  { type: Date, required: true },
  ExpiryDate: { type: Date, required: true },
  IssueDate:  { type: Date },
  ImagePath:  { type: String, required: true },
  ImageHash:  { type: String },
  Status:     { type: String, required: true },
}, { collection: "certificates", versionKey: false });

const CertificateModel = mongoose.models.WorkerCertificate ||
  mongoose.model("WorkerCertificate", certificateSchema);

// ── Extract text from certificate file using OCR ──────────────────────────────
async function extractTextFromFile(imagePath: string): Promise<string> {
  try {
    let fullPath: string;

    // Normalize Windows backslashes to forward slashes
    const normalizedPath = imagePath.replace(/\\/g, "/");

    if (path.isAbsolute(imagePath) && !normalizedPath.startsWith("/uploads")) {
      // Absolute path (Windows C:\... or Mac /Users/...) — extract just the uploads portion
      const uploadsIndex = normalizedPath.toLowerCase().indexOf("/uploads/");
      if (uploadsIndex !== -1) {
        const relativePart = normalizedPath.substring(uploadsIndex + 1);
        const rootDir = path.resolve(process.cwd(), "..", "..");
        fullPath = path.resolve(rootDir, "apps", "api", relativePart);
      } else {
        fullPath = imagePath;
      }
    } else {
      // Relative or public path like /uploads/certificates/...
      const cleanPath = normalizedPath.replace(/^\//, "");
      const rootDir = path.resolve(process.cwd(), "..", "..");
      fullPath = path.resolve(rootDir, "apps", "api", cleanPath);
      if (!fs.existsSync(fullPath)) {
        fullPath = path.resolve(process.cwd(), "apps", "api", cleanPath);
      }
    }

    if (!fs.existsSync(fullPath)) {
      console.log(`[worker] File not found: ${fullPath}`);
      return "";
    }

    const ext = fullPath.toLowerCase();

    // For PDF files - extract text using pdf-parse
    if (ext.endsWith(".pdf")) {
      try {
        // @ts-ignore
        const pdfParse = await import("pdf-parse/lib/pdf-parse.js");
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdfParse.default(dataBuffer);
        console.log(`[worker] PDF text extracted: ${data.text.substring(0, 100)}...`);
        return data.text;
      } catch (err) {
        console.log(`[worker] PDF parse failed, trying OCR: ${err}`);
      }
    }

    // For images (JPG, PNG) - use Tesseract OCR
    if (ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".png")) {
      const worker = await createWorker("eng");
      const { data: { text } } = await worker.recognize(fullPath);
      await worker.terminate();
      console.log(`[worker] OCR text extracted: ${text.substring(0, 100)}...`);
      return text;
    }

    return "";
  } catch (err) {
    console.log(`[worker] Text extraction failed: ${err}`);
    return "";
  }
}

// ── Parse extracted text to find key fields ───────────────────────────────────
function parseExtractedText(text: string) {
  const upperText = text.toUpperCase();
  const extracted: {
    hasHalalKeyword: boolean;
    hasExpiryDate: boolean;
    hasCertNumber: boolean;
    hasAuthority: boolean;
    extractedAuthorities: string[];
    dateMatches: string[];
  } = {
    hasHalalKeyword: false,
    hasExpiryDate: false,
    hasCertNumber: false,
    hasAuthority: false,
    extractedAuthorities: [],
    dateMatches: [],
  };

  // Check for halal keywords
  const halalKeywords = ["HALAL", "HALAAL", "حلال", "CERTIFIED HALAL", "HALAL CERTIFIED", "HALAL CERTIFICATE"];
  extracted.hasHalalKeyword = halalKeywords.some(k => upperText.includes(k));

  // Check for expiry date patterns
  const datePatterns = [
    /expir[yed\s]+:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /valid until:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /expiry date:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /valid through:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
  ];
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      extracted.dateMatches.push(match[1]);
      extracted.hasExpiryDate = true;
    }
  }

  // Check for certificate number patterns
  const certNumberPatterns = [
    /cert[ificate\s]+no[.:\s]+([A-Z0-9\-\/]+)/gi,
    /certificate number:?\s*([A-Z0-9\-\/]+)/gi,
    /ref[erence\s]+no[.:\s]+([A-Z0-9\-\/]+)/gi,
  ];
  extracted.hasCertNumber = certNumberPatterns.some(p => p.test(text));

  // Check for known halal authorities
  const authorities = [
    "JAKIM", "MUI", "IFANCA", "ISNA", "HFA", "ESMA", "GSO",
    "PAFN", "P.A.F.N", "KUWAIT", "IHC", "IHCR", "IHCCR",
    "HALAL AUTHORITY", "HALAL BODY", "ISLAMIC"
  ];
  for (const auth of authorities) {
    if (upperText.includes(auth)) {
      extracted.hasAuthority = true;
      extracted.extractedAuthorities.push(auth);
    }
  }

  return extracted;
}

// ── Main AI verification function ─────────────────────────────────────────────
function runAIVerification(doc: {
  CertNumber: string; CertType: string; Authority: string;
  ImagePath: string; ExpiryDate: Date; IssueDate?: Date;
}, ocr?: ReturnType<typeof parseExtractedText>) {
  const now      = new Date();
  const reasons: string[] = [];
  const flags:   string[] = [];
  const rejects: string[] = [];
  let score = 0;

  // ── REJECT conditions ──────────────────────────────────────────────────────

  // 1. Certificate expired
  const expiry = new Date(doc.ExpiryDate);
  if (expiry < now) {
    rejects.push(`Certificate expired on ${expiry.toLocaleDateString()}.`);
  } else {
    score += 20;
    reasons.push("Certificate is not expired.");
  }

  // 2. Issue date after expiry date (illogical dates)
  if (doc.IssueDate) {
    const issue = new Date(doc.IssueDate);
    if (issue > expiry) {
      rejects.push("Issue date is after expiry date — invalid certificate dates.");
    } else if (issue > now) {
      rejects.push("Issue date is in the future — invalid.");
    } else {
      score += 10;
      reasons.push("Certificate dates are valid.");
    }
  }

  // 3. Certificate number present
  if (!doc.CertNumber || doc.CertNumber.trim().length < 3) {
    rejects.push("Certificate number is missing or too short.");
  } else {
    score += 15;
    reasons.push("Certificate number is present.");
  }

  // 4. Accepted file format
  const ext = doc.ImagePath.toLowerCase();
  if (ext.endsWith(".pdf") || ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg")) {
    score += 10;
    reasons.push("Document format is accepted.");
  } else {
    rejects.push("Document format is not accepted. Please upload PDF, PNG, or JPG.");
  }

  // ── FLAGGED conditions (not hard reject, but needs review) ─────────────────

  // 5. Authority name present (AI extracts but P.A.F.N. decides if recognized)
  if (!doc.Authority || doc.Authority.trim().length < 2) {
    flags.push("Issuing authority name is missing.");
  } else {
    score += 15;
    reasons.push(`Issuing authority recorded: ${doc.Authority}.`);
  }

  // 6. Certificate type present
  if (!doc.CertType || doc.CertType.trim().length < 2) {
    flags.push("Certificate type is not specified.");
  } else {
    score += 10;
    reasons.push(`Certificate type: ${doc.CertType}.`);
  }

  // 7. Check if halal cert references a standard (based on type)
  if (doc.CertType?.toUpperCase().includes("HALAL")) {
    score += 20;
    reasons.push("Certificate is classified as a Halal certificate.");
  } else if (doc.CertType?.toUpperCase().includes("FOOD") || doc.CertType?.toUpperCase().includes("HEALTH") || doc.CertType?.toUpperCase().includes("SAFETY")) {
    score += 15;
    reasons.push("Certificate is classified as a Food Safety / Health certificate.");
  } else {
    flags.push("Certificate type could not be clearly classified.");
  }

  // ── OCR Cross-validation (if text was extracted from the file) ────────────
  if (ocr) {
    if (ocr.hasHalalKeyword) {
      score += 15;
      reasons.push("Halal keyword found in certificate document.");
    } else {
      flags.push("No Halal keyword detected in the certificate document.");
    }

    if (ocr.hasAuthority) {
      score += 10;
      reasons.push(`Recognized authority found in document: ${ocr.extractedAuthorities.join(", ")}.`);
    } else {
      flags.push("Could not verify issuing authority from document content.");
    }

    if (ocr.hasExpiryDate) {
      score += 5;
      reasons.push("Expiry date found in document content.");
    }
  } else {
    flags.push("Could not read document content for verification.");
  }

  // ── Determine final verdict ────────────────────────────────────────────────

  let verdict: string;
  let finalReason: string;

  if (rejects.length > 0) {
    verdict     = "REJECTED";
    finalReason = rejects.join(" ");
    score       = Math.min(score, 30); // cap score on rejection
  } else if (flags.length > 0) {
    verdict     = "FLAGGED";
    finalReason = flags.join(" ") + " — Requires P.A.F.N. manual review.";
    score       = Math.min(score, 65);
  } else {
    verdict     = "APPROVED";
    finalReason = reasons.join(" ") + " — All automated checks passed. Ready for P.A.F.N. authority review.";
    score       = Math.min(score, 100);
  }

  return {
    checkedAt: now,
    verdict,
    reason:    finalReason,
    score,
  };
}

// ── Job runner ────────────────────────────────────────────────────────────────
export async function runCertificateProcessingJob() {
  await mongoose.connect(env.MONGODB_URI);
  const pending = await CertificateModel.find({ Status: "PENDING_AI" }).lean();

  for (const doc of pending) {
    console.log(`[worker] Reading certificate file: ${doc.ImagePath}`);

    // Extract text from the actual certificate file
    const extractedText = await extractTextFromFile(String(doc.ImagePath));
    const ocr = extractedText.length > 10 ? parseExtractedText(extractedText) : undefined;

    if (ocr) {
      console.log(`[worker] OCR complete — halal keyword: ${ocr.hasHalalKeyword}, authority: ${ocr.extractedAuthorities.join(",")}`);
    } else {
      console.log(`[worker] Could not extract text from file`);
    }

    const ai = runAIVerification({
      CertNumber: String(doc.CertNumber),
      CertType:   String(doc.CertType),
      Authority:  String(doc.Authority),
      ImagePath:  String(doc.ImagePath),
      ExpiryDate: new Date(doc.ExpiryDate as Date),
      IssueDate:  doc.IssueDate ? new Date(doc.IssueDate as Date) : undefined,
    }, ocr);

    await CertificateModel.findByIdAndUpdate(doc._id, {
      AICheckedAt: ai.checkedAt,
      AIReason:    ai.reason,
      AIScore:     ai.score,
      AIVerdict:   ai.verdict,
      Status:      "UNDER_AUTHORITY_REVIEW",
    });

    console.log(`[worker] ${doc._id}: ${ai.verdict} (${ai.score}/100)`);
  }

  return pending.length;
}
