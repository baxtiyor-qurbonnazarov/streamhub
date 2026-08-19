import { Router } from "express";
import { authController } from "../controllers/AuthController";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateRegister, validateLogin } from "../middlewares/validation.middleware";

const router = Router();

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.get("/me", authenticateToken, authController.getMe);

export default router;

