import { Response, NextFunction } from "express";
import { userService } from "../services/UserService";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendSuccess } from "../utils/response.util";

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber, name, handle, password } = req.body;
      const result = await userService.register(phoneNumber, name, handle, password);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber, password } = req.body;
      const result = await userService.login(phoneNumber, password);
      sendSuccess(res, result, 200);
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

