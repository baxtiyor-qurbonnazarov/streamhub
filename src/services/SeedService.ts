import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Video } from "../entities/Video";
import { Comment } from "../entities/Comment";
import { Subscription } from "../entities/Subscription";
import { Like } from "../entities/Like";
import { encryptText } from "../utils/crypto.util";
import { pexelsService, PexelsVideoItem } from "./PexelsService";
import * as bcrypt from "bcryptjs";

export class SeedService {
  async seedInitialData(): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    const videoRepository = AppDataSource.getRepository(Video);
    const commentRepository = AppDataSource.getRepository(Comment);
    const subscriptionRepository = AppDataSource.getRepository(Subscription);

    const userCount = await userRepository.count();
    if (userCount > 0) {
      console.log("🌱 Database already has records, skipping initial seed.");
      return;
    }

    console.log("🚀 Seeding initial demo creators & tech videos with AES-256 zero-knowledge encryption into Neon Postgres...");

    const hashedPassword = await bcrypt.hash("123456", 10);

    // 1. Create Demo Creators (All user PII is AES-256 encrypted before insertion)
    const creator1 = userRepository.create({
      phoneNumber: encryptText("+998901234567"),
      name: encryptText("Flutter Uzbekistan"),
      handle: encryptText("@flutter_uz"),
      password: hashedPassword,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      bio: encryptText("Flutter va Dart bo'yicha rasmiy o'zbekistonlik dasturchilar hamjamiyati"),
      isVerified: true,
    });

    const creator2 = userRepository.create({
      phoneNumber: encryptText("+998912345678"),
      name: encryptText("Code Master Academy"),
      handle: encryptText("@code_master"),
      password: hashedPassword,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      bio: encryptText("Full-Stack Node.js, SOLID & High-Load Backend darslari"),
      isVerified: true,
    });

    const creator3 = userRepository.create({
      phoneNumber: encryptText("+998933456789"),
      name: encryptText("AI & Data Lab"),
      handle: encryptText("@ai_creator"),
      password: hashedPassword,
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200",
      bio: encryptText("Sun'iy intellekt va neyron tarmoqlarini noldan o'rganish"),
      isVerified: false,
    });

    const [savedC1, savedC2, savedC3] = await userRepository.save([creator1, creator2, creator3]);

    // 2. Create Initial Videos (Titles & Descriptions AES-256 encrypted)
    const video1 = videoRepository.create({
      bunnyVideoId: "demo-flutter-solid-01",
      title: encryptText("Flutter 3.22 & SOLID Arxitektura Darsligi | Noldan Master-Klass"),
      description: encryptText("Flutter ilovasida Clean Code va SOLID prinsiplari asosida arxitektura qurishni to'liq o'rganamiz. State Controller, Repository va Injector."),
      thumbnailUrl: "https://images.unsplash.com/photo-1617042375876-a13e36732a04?w=800",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      duration: 745,
      views: 3420,
      category: "Mobil Ilovalar",
      tags: ["flutter", "dart", "solid", "mobile"],
      authorId: savedC1.id,
    });

    const video2 = videoRepository.create({
      bunnyVideoId: "demo-node-postgres-02",
      title: encryptText("Node.js & Neon PostgreSQL High-Performance REST API"),
      description: encryptText("TypeORM va Node.js TypeScript orqali Neon Serverless PostgreSQL bazasi bilan tezkor va xavfsiz backend yaratamiz."),
      thumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      duration: 1180,
      views: 8910,
      category: "Dasturlash",
      tags: ["nodejs", "typescript", "postgres", "backend"],
      authorId: savedC2.id,
    });

    const video3 = videoRepository.create({
      bunnyVideoId: "demo-ai-llm-03",
      title: encryptText("Sun'iy Intellekt va LLM Modellari Amaliyotda"),
      description: encryptText("Neyron tarmoqlari va Generative AI modellarini mobil hamda web dasturlarga integratsiya qilish sir-asrorlari."),
      thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      duration: 950,
      views: 12400,
      category: "AI & Data",
      tags: ["ai", "python", "llm", "machinelearning"],
      authorId: savedC3.id,
    });

    const video4 = videoRepository.create({
      bunnyVideoId: "demo-uiux-mobile-04",
      title: encryptText("Zamonaviy UI/UX Dizayn va Dark Mode Trendlari 2026"),
      description: encryptText("Glassmorphism va interaktiv mikro-animatsiyalar bilan premium mobil UI interfeyslarini yaratish."),
      thumbnailUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      duration: 620,
      views: 4560,
      category: "UI/UX Dizayn",
      tags: ["uiux", "figma", "design", "mobile"],
      authorId: savedC1.id,
    });

    const savedVideos = await videoRepository.save([video1, video2, video3, video4]);

    // 3. Create Sample Comments (Text AES-256 encrypted)
    const comment1 = commentRepository.create({
      text: encryptText("Juda foydali va sifatli darslik bo'libdi, davomini kutamiz!"),
      videoId: savedVideos[0].id,
      authorId: savedC2.id,
    });

    const comment2 = commentRepository.create({
      text: encryptText("SOLID va DRY prinsiplari aniq misollarda tushuntirilgan. Rahmat!"),
      videoId: savedVideos[0].id,
      authorId: savedC3.id,
    });

    await commentRepository.save([comment1, comment2]);

    // 4. Create Initial Subscriptions
    const sub1 = subscriptionRepository.create({
      followerId: savedC2.id,
      followingId: savedC1.id,
    });
    await subscriptionRepository.save([sub1]);

    // 5. If Pexels API Key is provided, sync additional high quality content
    await this.syncPexelsVideos();

    console.log("✅ Seed completed successfully!");
  }

  /**
   * Syncs videos from Pexels API into Postgres safely.
   * If Pexels API key is not present, completes gracefully without throwing.
   */
  async syncPexelsVideos(): Promise<number> {
    const userRepository = AppDataSource.getRepository(User);
    const videoRepository = AppDataSource.getRepository(Video);
    const commentRepository = AppDataSource.getRepository(Comment);
    const likeRepository = AppDataSource.getRepository(Like);

    const categories = [
      { query: "coding", category: "Dasturlash" },
      { query: "technology", category: "AI & Data" },
      { query: "design", category: "UI/UX Dizayn" },
      { query: "business", category: "Biznes" },
    ];

    let insertedCount = 0;
    const hashedPassword = await bcrypt.hash("123456", 10);

    const sampleComments = [
      "Juda tushunarli va qiziqarli video bo'libdi! 🔥",
      "Katta rahmat, foydali ma'lumotlar oldim.",
      "Ajoyib sifat va professional yondashuv! 👏",
      "Kanalga obuna bo'ldim, keyingi qismlarini kutaman.",
      "Zo'r tushuntirilgan, amaliyotda albatta qo'llayman!",
    ];

    for (const cat of categories) {
      for (let page = 1; page <= 2; page++) {
        const items: PexelsVideoItem[] = await pexelsService.fetchCategoryVideos(cat.query, cat.category, 80, page);
        if (items.length === 0) continue;

        for (const item of items) {
          const bunnyId = `pexels_${item.pexelsId}`;

          // Check if video already in database
          const existingVideo = await videoRepository.findOne({ where: { bunnyVideoId: bunnyId } });
          if (existingVideo) continue;

          // Find or create Creator user
          let creator = await userRepository.findOne({
            where: { handle: encryptText(item.creatorHandle) },
          });

          if (!creator) {
            creator = userRepository.create({
              phoneNumber: encryptText(`+998${Math.floor(100000000 + Math.random() * 900000000)}`),
              name: encryptText(item.creatorName),
              handle: encryptText(item.creatorHandle),
              password: hashedPassword,
              avatarUrl: item.creatorAvatarUrl,
              bio: encryptText(item.creatorBio),
              isVerified: true,
            });
            creator = await userRepository.save(creator);
          }

          // Create Video Entity
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

          const savedVideo = await videoRepository.save(video);
          insertedCount++;

          // Add 1-2 realistic comments
          const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
          const comment = commentRepository.create({
            text: encryptText(randomComment),
            videoId: savedVideo.id,
            authorId: creator.id,
          });
          await commentRepository.save(comment);

          // Add random likes
          const like = likeRepository.create({
            userId: creator.id,
            videoId: savedVideo.id,
            isLike: true,
          });
          await likeRepository.save(like);
        }
      }
    }

    if (insertedCount > 0) {
      console.log(`🎬 Successfully synchronized ${insertedCount} Pexels demo videos into Postgres.`);
    }

    return insertedCount;
  }
}

export const seedService = new SeedService();
