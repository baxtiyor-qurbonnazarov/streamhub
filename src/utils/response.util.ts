import { Response } from "express";

export interface ApiResponseFormat<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
};

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500
): void => {
  res.status(statusCode).json({
    success: false,
    error,
  });
};
