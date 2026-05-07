import { ProductModel } from "./models/product.model.js";
import { toProductDto } from "./mappers/product.mapper.js";

export async function createProductRecord(input: {
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
}) {
  const product = await ProductModel.create({
    BatchNumber: input.batchNumber,
    Brand: input.brand,
    Category: input.category,
    CreatedAt: new Date(),
    HalalRef: input.halalRef,
    HealthRef: input.healthRef,
    Manufacturer: input.manufacturer,
    OriginCountry: input.originCountry,
    ProductID: input.productId,
    ProductImage: input.productImage,
    ProductName: input.productName,
    QRCodePath: input.qrCodePath,
    Weight: input.weight
  });

  return toProductDto(product.toObject());
}

export async function listProducts() {
  const products = await ProductModel.find().sort({ CreatedAt: -1 }).lean();
  return products.map((product) => toProductDto(product));
}

export async function findProductByProductId(productId: string) {
  const product = await ProductModel.findOne({ ProductID: productId }).lean();
  return product ? toProductDto(product) : null;
}

export async function findProductByHalalRef(halalRef: string) {
  const product = await ProductModel.findOne({ HalalRef: halalRef }).lean();
  return product ? toProductDto(product) : null;
}

export async function deleteProductByProductId(productId: string) {
  await ProductModel.findOneAndDelete({ ProductID: productId });
}

export async function updateProductByProductId(productId: string, updates: {
  halalRef?: string;
  qrCodePath?: string | null;
}) {
  const product = await ProductModel.findOneAndUpdate(
    { ProductID: productId },
    {
      ...(updates.halalRef ? { HalalRef: updates.halalRef } : {}),
      ...(updates.qrCodePath !== undefined ? { QRCodePath: updates.qrCodePath } : {})
    },
    { new: true }
  ).lean();

  return product ? toProductDto(product) : null;
}
