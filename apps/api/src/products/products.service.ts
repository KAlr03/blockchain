import QRCode from "qrcode";
import { env } from "@halal/config";
import { createProductSchema } from "@halal/shared";
import { buildProductId } from "../lib/ids.js";
import {
  createProductRecord,
  findProductByHalalRef,
  findProductByProductId,
  listProducts,
  updateProductByProductId,
  deleteProductByProductId
} from "../repositories/product.repository.js";

export async function createProduct(input: unknown) {
  const payload = createProductSchema.parse(input);
  const productId = buildProductId(payload.batchNumber);
  const verifyUrl = `${env.VERIFY_BASE_URL}/${encodeURIComponent(productId)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);

  return createProductRecord({
    productId,
    productName: payload.productName,
    batchNumber: payload.batchNumber,
    brand: payload.brand,
    category: payload.category,
    manufacturer: payload.manufacturer,
    originCountry: payload.originCountry,
    halalRef: "PENDING_CERTIFICATE",
    healthRef: payload.healthRef,
    weight: payload.weight,
    productImage: payload.productImage ?? null,
    qrCodePath: qrCodeDataUrl
  });
}

export async function getProducts() {
  return listProducts();
}

export async function getProduct(productId: string) {
  return findProductByProductId(productId);
}

export async function getProductByCertificateRef(certificateId: string) {
  return findProductByHalalRef(certificateId);
}

export async function attachCertificateToProduct(productId: string, certificateId: string) {
  return updateProductByProductId(productId, { halalRef: certificateId });
}

export async function deleteProduct(productId: string) {
  return deleteProductByProductId(productId);
}
