export const USER_ROLES = ["ADMIN", "MANUFACTURER", "AUTHORITY"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const CERTIFICATE_STATUSES = [
  "PENDING_AI",
  "AI_REVIEWED",
  "UNDER_AUTHORITY_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED"
] as const;

export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const TRACE_STATUSES = ["RECORDED", "VERIFIED", "FLAGGED"] as const;
export type TraceStatus = (typeof TRACE_STATUSES)[number];
