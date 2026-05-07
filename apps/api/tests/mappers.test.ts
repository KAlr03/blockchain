import { describe, expect, it } from "vitest";
import { toCertificateDto } from "../src/repositories/mappers/certificate.mapper.js";
import { toProductDto } from "../src/repositories/mappers/product.mapper.js";

describe("repository mappers", () => {
  it("maps production product fields into camelCase DTOs", () => {
    const dto = toProductDto({
      _id: "1",
      ProductID: "PROD-1",
      ProductName: "Halal Lamb",
      BatchNumber: "B-1",
      Brand: "Brand",
      Category: "Meat",
      Manufacturer: "Importer",
      OriginCountry: "Kuwait",
      HalalRef: "CERT-1",
      HealthRef: "HEALTH-1",
      Weight: "1kg",
      ProductImage: null,
      QRCodePath: null,
      CreatedAt: new Date("2025-01-01T00:00:00.000Z")
    });

    expect(dto.productId).toBe("PROD-1");
    expect(dto.originCountry).toBe("Kuwait");
  });

  it("maps production certificate fields into camelCase DTOs", () => {
    const dto = toCertificateDto({
      _id: "CERT-1",
      CertNumber: "123456",
      CertType: "Halal Certificate",
      Authority: "Kuwait Halal Authority",
      ImagePath: "/tmp/file.pdf",
      ImageHash: "hash",
      Status: "UNDER_AUTHORITY_REVIEW",
      AIVerdict: "LIKELY_VALID",
      AIReason: "Looks good",
      AIScore: 80,
      AICheckedAt: new Date("2025-01-01T00:00:00.000Z"),
      IssueDate: new Date("2025-01-01T00:00:00.000Z"),
      ExpiryDate: new Date("2025-06-01T00:00:00.000Z"),
      ApprovedAt: new Date("2025-01-02T00:00:00.000Z"),
      ApprovedBy: "Authority User",
      BlockchainHash: "0xblockhash",
      BlockchainTxID: "0xtxhash",
      BlockchainTimestamp: new Date("2025-01-02T00:05:00.000Z"),
      CreatedAt: new Date("2025-01-01T00:00:00.000Z")
    });

    expect(dto.certNumber).toBe("123456");
    expect(dto.certType).toBe("Halal Certificate");
    expect(dto.aiScore).toBe(80);
    expect(dto.approvedBy).toBe("Authority User");
    expect(dto.blockchainTxId).toBe("0xtxhash");
  });
});
