import { initializeDatabase, AppDataSource } from "./src/config/database";
import { User } from "./src/entities/User";
import { Video } from "./src/entities/Video";
import { Comment } from "./src/entities/Comment";
import { Like } from "./src/entities/Like";
import { pexelsService, PexelsVideoItem } from "./src/services/PexelsService";
import bcrypt from "bcryptjs";
import { encryptText } from "./src/utils/crypto.util";

async function run() {
  try {
    await initializeDatabase();
    console.log("Starting FAST sync...");

    const userRepository = AppDataSource.getRepository(User);
    const videoRepository = AppDataSource.getRepository(Video);
    const commentRepository = AppDataSource.getRepository(Comment);
    const likeRepository = AppDataSource.getRepository(Like);

    const categories = [
      { query: "coding", category: "Dasturlash" },
      { query: "technology", category: "AI & Data" },
      { query: "design", category: "UI/UX Dizayn" },
      { query: "business", category: "Biznes" },
      { query: "nature", category: "Tabiat" },
      { query: "gaming", category: "O'yinlar" }
    ];

    const hashedPassword = await bcrypt.hash("123456", 10);
    const sampleComments = ["Juda tushunarli! 🔥", "Rahmat!", "Ajoyib sifat!", "Qiziqarli video!"];

    let totalInserted = 0;

    for (const cat of categories) {
      console.log(`Fetching category: ${cat.category}`);
      for (let page = 1; page <= 2; page++) {
        const items = await pexelsService.fetchCategoryVideos(cat.query, cat.category, 50, page);
        if (items.length === 0) continue;

        let videosToSave: any[] = [];
        let commentsToSave: any[] = [];
        let likesToSave: any[] = [];
        let creatorsMap = new Map();

        // 1. Prepare creators
        for (const item of items) {
          const bunnyId = `pexels_${item.pexelsId}`;
          const existingVideo = await videoRepository.findOne({ where: { bunnyVideoId: bunnyId } });
          if (existingVideo) continue;

          let creator = creatorsMap.get(item.creatorHandle);
          if (!creator) {
            creator = await userRepository.findOne({ where: { handle: encryptText(item.creatorHandle) } });
            if (!creator) {
              creator = userRepository.create({
                phoneNumber: encryptText(`+998${Math.floor(100000000 + Math.random() * 900000000)}`),
                name: encryptText(item.creatorName),
                handle: encryptText(item.creatorHandle),
                password: hashedPassword,
                avatarUrl: item.creatorAvatarUrl,
                bio: encryptText(item.creatorBio || "Content Creator"),
                isVerified: true,
              });
              creator = await userRepository.save(creator);
            }
            creatorsMap.set(item.creatorHandle, creator);
          }

          const video = videoRepository.create({
            bunnyVideoId: bunnyId,
            title: encryptText(item.title),
            description: encryptText(item.description),
            thumbnailUrl: item.thumbnailUrl,
            videoUrl: item.videoUrl,
            duration: item.duration,
            views: Math.floor(1500 + Math.random() * 25000),
            category: item.category,
            tags: item.tags,
            authorId: creator.id,
          });
          
          videosToSave.push({ video, creator });
        }

        if (videosToSave.length === 0) continue;

        // 2. Save videos in bulk
        const savedVideos = await videoRepository.save(videosToSave.map(v => v.video), { chunk: 50 });
        totalInserted += savedVideos.length;

        // 3. Prepare comments & likes
        for (let i = 0; i < savedVideos.length; i++) {
          const v = savedVideos[i];
          const creator = videosToSave[i].creator;

          const comment = commentRepository.create({
            text: encryptText(sampleComments[Math.floor(Math.random() * sampleComments.length)]),
            videoId: v.id,
            authorId: creator.id,
          });
          commentsToSave.push(comment);

          const like = likeRepository.create({
            userId: creator.id,
            videoId: v.id,
            isLike: true,
          });
          likesToSave.push(like);
        }

        // 4. Save comments & likes in bulk
        await commentRepository.save(commentsToSave, { chunk: 50 });
        await likeRepository.save(likesToSave, { chunk: 50 });
        
        console.log(`Saved ${savedVideos.length} videos for ${cat.category} (Page ${page})`);
      }
    }
    
    console.log("FAST Sync complete! Inserted total " + totalInserted);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
run();
