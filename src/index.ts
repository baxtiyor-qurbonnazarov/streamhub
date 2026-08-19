import "reflect-metadata";
import express from "express";
import cors from "cors";
import path from "path";
import * as dotenv from "dotenv";
import { initializeDatabase, AppDataSource } from "./config/database";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

dotenv.config();

process.on("uncaughtException", (err: any) => {
  if (err.message && err.message.includes("Connection terminated")) {
    console.warn("⚠️ Ignored unhandled pg connection termination error:", err.message);
    return;
  }
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
  if (reason && reason.message && reason.message.includes("Connection terminated")) {
    console.warn("⚠️ Ignored unhandled pg connection termination rejection:", reason.message);
    return;
  }
  console.error("💥 Unhandled Rejection:", reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so the Flutter app can communicate (especially for web/local development)
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    dbInitialized: AppDataSource.isInitialized,
    timestamp: new Date().toISOString(),
  });
});

// Ensure DB is ready before routing
app.use(async (req, res, next) => {
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }
  try {
    await initializeDatabase();
  } catch (e: any) {
    return res.status(503).json({
      success: false,
      message: "Ma'lumotlar bazasiga ulanmoqda, iltimos kuting...",
    });
  }
  next();
});

// API Base routes
app.use("/api", routes);

// Global Error Handler Middleware
app.use(errorHandler);

// Bootstrapping function
const bootstrap = async () => {
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 StreamHub SOLID Backend running on http://0.0.0.0:${PORT}`);
  });

  initializeDatabase().catch((error) => {
    console.error("⚠️ Initial database connection error:", error);
  });
};

bootstrap();
