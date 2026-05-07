import type { CertificateStatus, TraceStatus, UserRole } from "../constants/roles.js";

export interface UserDto {
  id: string;
  name: string;
  email: string;
  country: string;
  organizationName: string;
  manufacturerId: string;
  role: UserRole;
  status: string;
  createdAt: string;
}

export interface ProductDto {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  brand: string;
  category: string;
  manufacturer: string;
  originCountry: string;
  halalRef: string;
  healthRef: string;
  weight: string;
  productImage: string | null;
  qrCodePath: string | null;
  createdAt: string;
}

export interface CertificateDto {
  id: string;
  certNumber: string;
  certType: string;
  authority: string;
  imagePath: string;
  imageHash: string;
  imageData: string | null;
  healthImagePath: string | null;
  healthImageData: string | null;
  status: CertificateStatus;
  aiVerdict: string;
  aiReason: string;
  aiScore: number;
  aiCheckedAt: string;
  issueDate: string;
  expiryDate: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  blockchainHash: string | null;
  blockchainTxId: string | null;
  blockchainTimestamp: string | null;
  createdAt: string;
}

export interface TraceabilityRecordDto {
  id: string;
  productId: string;
  batchNumber: string;
  actorName: string;
  stage: string;
  status: TraceStatus | string;
  location: string;
  country: string;
  notes: string;
  temperature: string;
  timestamp: string;
  recordHash: string | null;
  blockchainHash: string | null;
  blockchainTxId: string | null;
  blockchainTimestamp: string | null;
}

export interface VerificationDto {
  product: ProductDto;
  certificate: CertificateDto | null;
  traceability: TraceabilityRecordDto[];
  blockchain: {
    isAnchored: boolean;
    blockHash: string | null;
    txId: string | null;
    timestamp: string | null;
    status: string | null;
    certificateHash: string | null;
  };
}
