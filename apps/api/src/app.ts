import cors from "cors";
import express from "express";
import path from "path";
import { buildRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { env } from "@halal/config";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve uploaded certificate files statically
  const uploadsPath = path.resolve(env.STORAGE_BASE_PATH);
  app.use("/uploads", express.static(uploadsPath));

  app.use(buildRouter());
  app.use(errorHandler);
  return app;
}
