import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { validateSession } from "../services/session.service";
import { config } from "../config";

export const authGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Ensure "Bearer " prefix is handled correctly
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    // Session Validation (Server-side check)
    if (!decoded.jti) {
      res.status(401).json({ message: "Invalid session structure: Missing JTI" });
      return;
    }

    const session = await validateSession(decoded.jti);
    if (!session) {
      res.status(401).json({ message: "Session expired or invalid due to inactivity" });
      return;
    }

    (req as any).user = decoded;
    next();
  } catch (error: any) {
    const message = error.name === "TokenExpiredError" ? "Token expired" : "Invalid token authentication";
    res.status(403).json({ message });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    // Check session if token is valid
    if (decoded.jti) {
      const session = await validateSession(decoded.jti);
      if (session) {
        (req as any).user = decoded;
      }
    }
    // If no jti or session invalid, req.user remains undefined (Guest)
    next();
  } catch (error) {
    next();
  }
};
