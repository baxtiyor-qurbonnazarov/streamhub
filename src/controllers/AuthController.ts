import { Response, NextFunction } from "express";
import { userService } from "../services/UserService";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendSuccess } from "../utils/response.util";

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name, handle, password, phoneNumber } = req.body;
      const result = await userService.register(email, name, handle, password, phoneNumber);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, email, phoneNumber, password } = req.body;
      const loginId = identifier || email || phoneNumber;
      const result = await userService.login(loginId, password);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async googleAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken, accessToken, googleId, email, name, avatarUrl } = req.body;
      const result = await userService.googleAuth({
        idToken,
        accessToken,
        googleId,
        email,
        name,
        avatarUrl,
      });
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async setPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { newPassword } = req.body;
      const user = await userService.setPassword(userId, newPassword);
      sendSuccess(res, { message: "Parol muvaffaqiyatli o'rnatildi", user }, 200);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;
      await userService.changePassword(userId, currentPassword, newPassword);
      sendSuccess(res, { message: "Parol muvaffaqiyatli o'zgartirildi" }, 200);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await userService.forgotPassword(email);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await userService.resetPassword(token, newPassword);
      sendSuccess(res, { message: "Parol yangilandi. Yangi parol bilan kiring." }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const user = await userService.getMe(userId);
      sendSuccess(res, user, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
