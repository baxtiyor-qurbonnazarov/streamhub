import { Response, NextFunction } from "express";
import { videoService } from "../services/VideoService";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendSuccess } from "../utils/response.util";

export class VideoController {
  async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      const category = req.query.category as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const videos = await videoService.getFeed(userId, category, page, limit);
      sendSuccess(res, videos, 200);
    } catch (error) {
      next(error);
    }
  }

  async search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      const q = (req.query.q as string) || "";
      const category = req.query.category as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const videos = await videoService.searchVideos(userId, q, category, page, limit);
      sendSuccess(res, videos, 200);
    } catch (error) {
      next(error);
    }
  }

  async getSubscribedFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const videos = await videoService.getSubscribedFeed(userId);
      sendSuccess(res, videos, 200);
    } catch (error) {
      next(error);
    }
  }

  async getUploadTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { title, description, category, tags, duration, thumbnailUrl } = req.body;
      const parsedTags = Array.isArray(tags) ? tags : [];
      const parsedDuration = parseInt(duration) || 0;

      const result = await videoService.getUploadTicket(
        userId,
        title,
        description,
        category,
        parsedTags,
        parsedDuration,
        thumbnailUrl
      );

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async toggleLike(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { videoId } = req.params;
      const { isLike } = req.body;

      const result = await videoService.toggleLike(userId, videoId, isLike);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { videoId } = req.params;
      const comments = await videoService.getComments(videoId);
      sendSuccess(res, comments, 200);
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { videoId } = req.params;
      const { text, parentId, replyToUserId } = req.body;

      const comment = await videoService.addComment(userId, videoId, text, parentId, replyToUserId);
      sendSuccess(res, comment, 201);
    } catch (error) {
      next(error);
    }
  }


  async getRelatedVideos(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      const { videoId } = req.params;
      const videos = await videoService.getRelatedVideos(userId, videoId);
      sendSuccess(res, videos, 200);
    } catch (error) {
      next(error);
    }
  }

  async incrementViews(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { videoId } = req.params;
      const views = await videoService.incrementViews(videoId);
      sendSuccess(res, { views }, 200);
    } catch (error) {
      next(error);
    }
  }

  async uploadThumbnail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new Error("Rasm fayli yuklanmadi.");
      }
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol || "http";
      const filename = req.file.filename;
      const thumbnailUrl = `${protocol}://${host}/uploads/thumbnails/${filename}`;

      sendSuccess(res, { thumbnailUrl }, 200);
    } catch (error) {
      next(error);
    }
  }
}
export const videoController = new VideoController();

