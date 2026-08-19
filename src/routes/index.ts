import { Router } from "express";
import authRoutes from "./auth.routes";
import videoRoutes from "./video.routes";
import userRoutes from "./user.routes";
import { seedService } from "../services/SeedService";
import { sendSuccess } from "../utils/response.util";

const routes = Router();

routes.get("/health", (req, res) => {
  sendSuccess(res, { status: "UP", timestamp: new Date().toISOString() });
});

routes.post("/seed", async (req, res, next) => {
  try {
    await seedService.seedInitialData();
    sendSuccess(res, { message: "Seed operation executed successfully" });
  } catch (err) {
    next(err);
  }
});

routes.post("/sync-pexels", async (req, res, next) => {
  try {
    const count = await seedService.syncPexelsVideos();
    sendSuccess(res, { message: `Sinxronizatsiya muvaffaqiyatli bajarildi. ${count} ta yangi video qo'shildi.`, count });
  } catch (err) {
    next(err);
  }
});

routes.use("/auth", authRoutes);
routes.use("/videos", videoRoutes);
routes.use("/users", userRoutes);

export default routes;

