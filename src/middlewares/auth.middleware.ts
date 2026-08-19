import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("Muxofaza kaliti topilmadi. Tizimga qayta kiring.", 401));
  }

  try {
    const secret = process.env.JWT_SECRET || "supersecretkeyformvp_streamhub_2026";
    const decoded = jwt.verify(token, secret) as { userId: string };
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return next(new AppError("Yaroqsiz yoki muddati o'tgan token.", 403));
  }
};

export const optionalAuthenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(); // Let request proceed as guest
  }

  try {
    const secret = process.env.JWT_SECRET || "supersecretkeyformvp_streamhub_2026";
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;
  } catch (error) {
    // Fail silently or ignore token if invalid for guest browsing
  }
  next();
};
