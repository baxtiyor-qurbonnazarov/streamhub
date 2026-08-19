import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  if (statusCode === 500) {
    console.error("💥 Server Error details:", err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
