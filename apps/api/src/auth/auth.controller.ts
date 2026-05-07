import { loginSchema } from "@halal/shared";
import type { Response } from "express";
import { asyncHandler } from "../lib/http.js";
import { getAuthenticatedUser, loginWithEmail } from "./auth.service.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";

export const loginController = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  let result;
  try {
    result = await loginWithEmail(body.email, body.password);
  } catch (err) {
    return res.status(403).json({ message: err instanceof Error ? err.message : "Login failed." });
  }

  if (!result) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  return res.json(result);
});

export const logoutController = asyncHandler(async (_req, res) => {
  return res.status(204).send();
});

export const meController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await getAuthenticatedUser(req.auth!.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(user);
});
