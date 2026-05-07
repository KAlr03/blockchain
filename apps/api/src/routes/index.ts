import { Router } from "express";
import { loginController, logoutController, meController } from "../auth/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { createUserController, listUsersController, updateUserController, updateProfileController } from "../users/users.controller.js";
import { createProductController, getProductController, listProductsController, deleteProductController } from "../products/products.controller.js";
import {
  certificateUpload,
  getCertificateController,
  listCertificatesController,
  reviewCertificateController,
  uploadCertificateController,
  deleteCertificateController
} from "../certificates/certificates.controller.js";
import { createTraceabilityController, listTraceabilityController, deleteTraceabilityController } from "../traceability/traceability.controller.js";
import { productQrController, verifyProductController } from "../verification/verification.controller.js";
import { registerUser } from "../auth/auth.service.js";
import { asyncHandler } from "../lib/http.js";
import { FavouriteModel } from "../repositories/models/favourite.model.js";
import { ScanHistoryModel } from "../repositories/models/scanhistory.model.js";
import { ReviewModel } from "../repositories/models/review.model.js";
import { ProductModel } from "../repositories/models/product.model.js";

export function buildRouter() {
  const router = Router();

  router.get("/health", (_req, res) => res.json({ ok: true }));

  // ── Auth ──────────────────────────────────────────────────────
  router.post("/auth/login", loginController);
  router.post("/auth/logout", authenticate, logoutController);
  router.get("/auth/me", authenticate, meController);

  // ── Public customer self-registration ─────────────────────────
  router.post("/auth/register", asyncHandler(async (req, res) => {
    const { name, email, password, country } = req.body as Record<string, string>;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    const existing = await import("../repositories/user.repository.js")
      .then(m => m.findUserByEmail(email));
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const user = await registerUser({
      name, email, password,
      country: country || "Kuwait",
      organizationName: "Customer",
      manufacturerId: "CUSTOMER",
      role: "CUSTOMER",
      status: "PENDING_APPROVAL",
    });
    return res.status(201).json(user);
  }));

  // ── Users (admin only) ─────────────────────────────────────────
  router.get("/users", authenticate, authorize(["ADMIN"]), listUsersController);
  router.post("/users", authenticate, authorize(["ADMIN"]), createUserController);
  router.patch("/users/me", authenticate, updateProfileController);
  router.patch("/users/:id", authenticate, authorize(["ADMIN"]), updateUserController);

  // ── Products ───────────────────────────────────────────────────
  router.get("/products/search", asyncHandler(async (req, res) => {
    const q = ((req.query.q as string) || "").trim();
    if (!q || q.length < 2) return res.json([]);
    const results = await ProductModel.find({ ProductName: { $regex: q, $options: "i" } }).limit(10).lean();
    return res.json(results.map((p: any) => ({ productId: p.ProductID, productName: p.ProductName, brand: p.Brand, category: p.Category, originCountry: p.OriginCountry })));
  }));
  router.post("/products", authenticate, authorize(["MANUFACTURER"]), createProductController);
  router.get("/products", authenticate, authorize(["ADMIN", "MANUFACTURER", "AUTHORITY"]), listProductsController);
  router.get("/products/:id", authenticate, authorize(["ADMIN", "MANUFACTURER", "AUTHORITY"]), getProductController);
  router.delete("/products/:id", authenticate, authorize(["ADMIN"]), deleteProductController);

  // ── Certificates ───────────────────────────────────────────────
  router.post("/certificates/upload", authenticate, authorize(["MANUFACTURER"]),
    certificateUpload.fields([{ name: "certificate", maxCount: 1 }, { name: "healthCertificate", maxCount: 1 }]), uploadCertificateController);
  router.get("/certificates", authenticate, authorize(["ADMIN", "AUTHORITY", "MANUFACTURER"]), listCertificatesController);
  router.get("/certificates/:id", authenticate, authorize(["ADMIN", "AUTHORITY", "MANUFACTURER"]), getCertificateController);
  router.patch("/certificates/:id/review", authenticate, authorize(["AUTHORITY"]), reviewCertificateController);
  router.delete("/certificates/:id", authenticate, authorize(["ADMIN"]), deleteCertificateController);

  // ── Traceability ───────────────────────────────────────────────
  router.post("/traceability", authenticate, authorize(["MANUFACTURER"]), createTraceabilityController);
  router.get("/products/:id/traceability", authenticate,
    authorize(["ADMIN", "AUTHORITY", "MANUFACTURER", "CUSTOMER"]), listTraceabilityController);
  router.delete("/traceability/:id", authenticate, authorize(["ADMIN"]), deleteTraceabilityController);

  // ── Public verification ────────────────────────────────────────
  router.get("/verify/:productId", verifyProductController);
  router.get("/verify/qr/:productId", productQrController);

  // ── Favourites (customer only) ─────────────────────────────────
  router.get("/favourites", authenticate, authorize(["CUSTOMER"]), asyncHandler(async (req, res) => {
    const userId = String((req as any).auth?.userId || "");
    const favs = await FavouriteModel.find({ UserId: userId }).sort({ AddedAt: -1 }).lean();
    return res.json(favs.map((f: any) => ({ productId: f.ProductId, addedAt: f.AddedAt })));
  }));
  router.post("/favourites", authenticate, authorize(["CUSTOMER"]), asyncHandler(async (req, res) => {
    const userId = String((req as any).auth?.userId || "");
    const { productId } = req.body as { productId: string };
    if (!productId) return res.status(400).json({ message: "productId is required." });
    await FavouriteModel.findOneAndUpdate({ UserId: userId, ProductId: productId }, { UserId: userId, ProductId: productId, AddedAt: new Date() }, { upsert: true });
    return res.status(201).json({ ok: true });
  }));
  router.delete("/favourites/:productId", authenticate, authorize(["CUSTOMER"]), asyncHandler(async (req, res) => {
    const userId = String((req as any).auth?.userId || "");
    await FavouriteModel.deleteOne({ UserId: userId, ProductId: req.params.productId });
    return res.json({ ok: true });
  }));

  // ── Scan History (customer only) ──────────────────────────────
  router.get("/scan-history", authenticate, authorize(["CUSTOMER"]), asyncHandler(async (req, res) => {
    const userId = String((req as any).auth?.userId || "");
    const history = await ScanHistoryModel.find({ UserId: userId }).sort({ ScannedAt: -1 }).limit(50).lean();
    return res.json(history.map((h: any) => ({ productId: h.ProductId, scannedAt: h.ScannedAt })));
  }));
  router.post("/scan-history", authenticate, authorize(["CUSTOMER"]), asyncHandler(async (req, res) => {
    const userId = String((req as any).auth?.userId || "");
    const { productId } = req.body as { productId: string };
    if (!productId) return res.status(400).json({ message: "productId is required." });
    await ScanHistoryModel.create({ UserId: userId, ProductId: productId, ScannedAt: new Date() });
    return res.status(201).json({ ok: true });
  }));
  router.delete("/scan-history", authenticate, authorize(["CUSTOMER"]), asyncHandler(async (req, res) => {
    const userId = String((req as any).auth?.userId || "");
    await ScanHistoryModel.deleteMany({ UserId: userId });
    return res.json({ ok: true });
  }));

  // ── Reviews (public) ──────────────────────────────────────────
  router.get("/reviews", asyncHandler(async (_req, res) => {
    const reviews = await ReviewModel.find().sort({ CreatedAt: -1 }).limit(50).lean();
    return res.json(reviews.map((r: any) => ({ id: r._id, name: r.Name, role: r.Role, comment: r.Comment, stars: r.Stars, createdAt: r.CreatedAt })));
  }));
  router.post("/reviews", asyncHandler(async (req, res) => {
    const { name, role, comment, stars } = req.body as { name: string; role: string; comment: string; stars: number };
    if (!name || !role || !comment || !stars) return res.status(400).json({ message: "All fields are required." });
    if (Number(stars) < 1 || Number(stars) > 5) return res.status(400).json({ message: "Stars must be between 1 and 5." });
    if (comment.trim().length < 10) return res.status(400).json({ message: "Comment must be at least 10 characters." });
    const review = await ReviewModel.create({ Name: name.trim(), Role: role, Comment: comment.trim(), Stars: Number(stars), CreatedAt: new Date() });
    return res.status(201).json({ id: review._id, name: review.Name, role: review.Role, comment: review.Comment, stars: review.Stars, createdAt: review.CreatedAt });
  }));

  router.delete("/reviews/:id", authenticate, authorize(["ADMIN"]), asyncHandler(async (req, res) => {
    await ReviewModel.findByIdAndDelete(req.params.id);
    return res.json({ ok: true });
  }));

  return router;
}
