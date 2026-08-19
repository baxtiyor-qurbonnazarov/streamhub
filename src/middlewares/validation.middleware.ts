import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { phoneNumber, name, handle, password } = req.body;

  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim().length < 9) {
    return next(new AppError("Telefon raqami noto'g'ri kiritilgan (kamida 9 ta belgi).", 400));
  }

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return next(new AppError("Ismingizni kiriting (kamida 2 ta belgi).", 400));
  }

  if (!handle || typeof handle !== "string" || handle.trim().length < 3) {
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
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim().length < 9) {
    return next(new AppError("Telefon raqamini kiriting.", 400));
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return next(new AppError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.", 400));
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

