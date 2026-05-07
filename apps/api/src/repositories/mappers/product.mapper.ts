import type { ProductDto } from "@halal/shared";

export function toProductDto(document: Record<string, unknown>): ProductDto {
  return {
    id: String(document._id),
    productId: String(document.ProductID),
    productName: String(document.ProductName),
    batchNumber: String(document.BatchNumber),
    brand: String(document.Brand),
    category: String(document.Category),
    manufacturer: String(document.Manufacturer),
    originCountry: String(document.OriginCountry),
    halalRef: String(document.HalalRef),
    healthRef: String(document.HealthRef),
    weight: String(document.Weight),
    productImage: (document.ProductImage as string | null) ?? null,
    qrCodePath: (document.QRCodePath as string | null) ?? null,
    createdAt: new Date(document.CreatedAt as string | Date).toISOString()
  };
}
