import { asyncHandler } from "../lib/http.js";
import { createProduct, getProduct, getProducts, deleteProduct } from "./products.service.js";

export const createProductController = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body);
  return res.status(201).json(product);
});

export const listProductsController = asyncHandler(async (_req, res) => {
  const products = await getProducts();
  return res.json(products);
});

export const getProductController = asyncHandler(async (req, res) => {
  const product = await getProduct(String(req.params.id));
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }
  return res.json(product);
});

export const deleteProductController = asyncHandler(async (req, res) => {
  await deleteProduct(String(req.params.id));
  return res.status(200).json({ message: "Product deleted successfully." });
});
