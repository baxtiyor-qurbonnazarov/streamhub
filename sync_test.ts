import { initializeDatabase } from "./src/config/database";
import { seedService } from "./src/services/SeedService";

async function run() {
  try {
    await initializeDatabase();
    console.log("Starting sync...");
    const count = await seedService.syncPexelsVideos();
    console.log("Sync complete! Inserted " + count);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
run();
