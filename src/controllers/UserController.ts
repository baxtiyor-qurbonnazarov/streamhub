import { Response, NextFunction } from "express";
import { userService } from "../services/UserService";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendSuccess } from "../utils/response.util";

export class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId || "";
      const { targetUserId } = req.params;
      const profile = await userService.getProfile(userId, targetUserId);
      sendSuccess(res, profile, 200);
    } catch (error) {
      next(error);
    }
  }

  async toggleFollow(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.userId!;
      const { targetUserId } = req.params;
      const result = await userService.toggleFollow(followerId, targetUserId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { name, handle, bio, avatarUrl } = req.body;
      const updatedUser = await userService.updateProfile(userId, { name, handle, bio, avatarUrl });
      sendSuccess(res, updatedUser, 200);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;
      await userService.changePassword(userId, currentPassword, newPassword);
      sendSuccess(res, { message: "Parol muvaffaqiyatli o'zgartirildi." }, 200);
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new Error("Rasm fayli yuklanmadi.");
      }
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol || "http";
      const filename = req.file.filename;
      const avatarUrl = `${protocol}://${host}/uploads/avatars/${filename}`;

      sendSuccess(res, { avatarUrl }, 200);
    } catch (error) {
      next(error);
    }
  }
}
export const userController = new UserController();
