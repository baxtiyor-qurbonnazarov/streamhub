import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "../entities/User";
import { Video } from "../entities/Video";
import { Comment } from "../entities/Comment";
import { Like } from "../entities/Like";
import { Subscription } from "../entities/Subscription";
import { seedService } from "../services/SeedService";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false, // Schema is already fully synchronized in Neon PostgreSQL
  logging: false,
  ssl: {
    rejectUnauthorized: false, // Required for Neon serverless PostgreSQL connection
  },
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 45000, // 45s to comfortably accommodate Neon serverless wake-up
    idleTimeoutMillis: 30000,
    max: 15,
  },
  entities: [User, Video, Comment, Like, Subscription],
  migrations: [],
  subscribers: [],
});

let initializationPromise: Promise<DataSource> | null = null;

export const initializeDatabase = async (retries = 5, delay = 2500): Promise<DataSource> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
          console.log("💾 Neon PostgreSQL Database successfully connected and synchronized!");
          // Automatically seed initial content if DB is empty
          await seedService.seedInitialData();
        }
        return AppDataSource;
      } catch (error: any) {
        console.error(`⚠️ DB Connection attempt ${attempt}/${retries} failed (${error.message}). Retrying in ${delay}ms...`);
        if (attempt === retries) {
          console.error("❌ All database connection attempts failed.");
          initializationPromise = null;
          throw error;
        }
        await new Promise((res) => setTimeout(res, delay));
      }
    }
    return AppDataSource;
  })();

  return initializationPromise;
};

