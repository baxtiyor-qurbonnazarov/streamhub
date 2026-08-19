import { Router } from "express";
import { videoController } from "../controllers/VideoController";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/auth.middleware";
import { validateVideoUpload } from "../middlewares/validation.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Feed endpoints
router.get("/feed", optionalAuthenticateToken, videoController.getFeed);
router.get("/subscribed", authenticateToken, videoController.getSubscribedFeed);

// Video operations
router.post("/upload-ticket", authenticateToken, validateVideoUpload, videoController.getUploadTicket);
router.post("/upload-thumbnail", authenticateToken, upload.single("thumbnail"), videoController.uploadThumbnail);

router.post("/:videoId/like", authenticateToken, videoController.toggleLike);
router.post("/:videoId/view", videoController.incrementViews);
router.get("/:videoId/related", optionalAuthenticateToken, videoController.getRelatedVideos);

// Comments
router.get("/:videoId/comments", videoController.getComments);
router.post("/:videoId/comments", authenticateToken, videoController.addComment);

export default router;
