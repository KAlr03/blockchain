import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authenticate.js";

export function authorize(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden." });
    }

    return next();
  };
}
