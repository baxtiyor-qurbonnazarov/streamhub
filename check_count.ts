import { initializeDatabase, AppDataSource } from "./src/config/database";
import { Video } from "./src/entities/Video";

async function run() {
  try {
    await initializeDatabase();
    const count = await AppDataSource.getRepository(Video).count();
    console.log("Total videos in DB:", count);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
