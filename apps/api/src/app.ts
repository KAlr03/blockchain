import cors from "cors";
import express from "express";
import { buildRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(buildRouter());
  app.use(errorHandler);
  return app;
}
