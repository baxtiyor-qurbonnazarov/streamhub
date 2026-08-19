import { Router } from "express";
import { userController } from "../controllers/UserController";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.get("/profile/:targetUserId", optionalAuthenticateToken, userController.getProfile);
router.patch("/profile", authenticateToken, userController.updateProfile);
router.post("/change-password", authenticateToken, userController.changePassword);
router.post("/follow/:targetUserId", authenticateToken, userController.toggleFollow);
router.post("/upload-avatar", authenticateToken, upload.single("avatar"), userController.uploadAvatar);

export default router;
