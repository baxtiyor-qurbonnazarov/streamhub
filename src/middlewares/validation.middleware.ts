import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { email, name, handle, password } = req.body;

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return next(new AppError("Yaroqli email manzilini kiriting.", 400));
  }

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return next(new AppError("Ismingizni kiriting (kamida 2 ta belgi).", 400));
  }

  if (!handle || typeof handle !== "string" || handle.trim().length < 2) {
    return next(new AppError("Foydalanuvchi nomi (@handle) noto'g'ri kiritilgan.", 400));
  }

  if (handle.trim().includes(" ")) {
    return next(new AppError("Foydalanuvchi nomida (@handle) bo'shliq bo'lishi mumkin emas.", 400));
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return next(new AppError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.", 400));
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { identifier, email, phoneNumber, password } = req.body;
  const loginId = identifier || email || phoneNumber;

  if (!loginId || typeof loginId !== "string" || loginId.trim().length < 2) {
    return next(new AppError("Email yoki foydalanuvchi nomini kiriting.", 400));
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return next(new AppError("Parolni kiriting.", 400));
  }

  next();
};

export const validateVideoUpload = (req: Request, res: Response, next: NextFunction): void => {
  const { title, duration } = req.body;

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return next(new AppError("Video sarlavhasini kiriting (kamida 3 ta belgi).", 400));
  }

  const durationSec = parseInt(duration) || 0;
  if (durationSec > 600) {
    return next(new AppError("StreamHub qoidalariga ko'ra videoning maksimal uzunligi 10 daqiqa (600 soniya) bo'lishi shart.", 400));
  }

  next();
};
