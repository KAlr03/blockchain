import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@halal/config";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role: string;
    email: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  try {
    const payload = jwt.verify(authorization.slice(7), env.JWT_SECRET) as {
      sub: string;
      role: string;
      email: string;
    };

    req.auth = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token." });
  }
}
