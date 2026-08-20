import { Router } from "express";
import { authController } from "../controllers/AuthController";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateRegister, validateLogin } from "../middlewares/validation.middleware";

const router = Router();

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.post("/google", authController.googleAuth);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Authenticated Routes
router.get("/me", authenticateToken, authController.getMe);
router.post("/set-password", authenticateToken, authController.setPassword);
router.post("/change-password", authenticateToken, authController.changePassword);

export default router;
