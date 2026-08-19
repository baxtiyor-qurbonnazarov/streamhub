import * as dotenv from "dotenv";
dotenv.config();

export interface PexelsVideoItem {
  pexelsId: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  category: string;
  tags: string[];
  creatorName: string;
  creatorHandle: string;
  creatorAvatarUrl: string;
  creatorBio: string;
}

export class PexelsService {
  private apiKey: string = process.env.PEXELS_API_KEY || "";

  /**
   * Fetches videos from Pexels Video API.
   * If PEXELS_API_KEY is not set or network fails, returns empty array safely.
   */
  async fetchCategoryVideos(
    query: string,
    categoryName: string,
    perPage = 80,
    page = 1
  ): Promise<PexelsVideoItem[]> {
    if (!this.apiKey || this.apiKey.trim() === "") {
      return [];
    }

    try {
      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        query
      )}&per_page=${perPage}&page=${page}&orientation=landscape`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Pexels API responded with status ${response.status} for query: "${query}"`
        );
        return [];
      }

      const data = (await response.json()) as any;
      if (!data || !Array.isArray(data.videos)) {
        return [];
      }

      const results: PexelsVideoItem[] = [];

      for (const video of data.videos) {
        // Find best MP4 file (prefer HD or 1080p, otherwise highest width)
        const mp4Files = (video.video_files || []).filter(
          (f: any) => f.file_type === "video/mp4" && f.link
        );

        if (mp4Files.length === 0) continue;

        // Sort by resolution descending, but cap at 1080p for fast mobile playback
        mp4Files.sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
        const chosenFile =
          mp4Files.find((f: any) => (f.width || 0) <= 1920 && (f.width || 0) >= 720) ||
          mp4Files[0];

        const rawName = video.user?.name || "Kreator";
        const cleanHandle =
          "@" +
          rawName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .slice(0, 18);

        // Generate nice descriptive title and tags based on query
        const generatedTitle = this.generateTitle(query, video.id);
        const generatedBio = `Professional video creator & developer at ${rawName} channel.`;

        results.push({
          pexelsId: video.id,
          title: generatedTitle,
          description: `${generatedTitle}. HD sifatdagi to'liq video kontent. Muallif: ${rawName}.`,
          videoUrl: chosenFile.link,
          thumbnailUrl: video.image || (video.video_pictures?.[0]?.picture ?? ""),
          duration: Math.max(15, Math.min(video.duration || 60, 600)),
          category: categoryName,
          tags: [query.toLowerCase(), categoryName.toLowerCase(), "streamhub"],
          creatorName: rawName,
          creatorHandle: cleanHandle,
          creatorAvatarUrl: video.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&background=random&color=fff&size=200`,
          creatorBio: generatedBio,
        });
      }

      return results;
    } catch (error: any) {
      console.warn("⚠️ Pexels fetch exception (non-fatal):", error.message);
      return [];
    }
  }

  private generateTitle(query: string, id: number): string {
    const titlesMap: Record<string, string[]> = {
      coding: [
        "Modern Full-Stack Web Dasturlash & Clean Code",
        "Flutter & Dart da Yuqori Darajali UI Yaratish",
        "TypeScript & Node.js da REST API Arxitekturasi",
        "Python & Algoritmlar: Amaliy Masalalar Yechimi",
      ],
      technology: [
        "Kelajak Texnologiyalari va 2026 Trendlari",
        "Sun'iy Intellekt va Neyron Tarmoqlari Amaliyotda",
        "Kiberxavfsizlik va Ma'lumotlarni Himoyalash Asoslari",
        "Bulutli Texnologiyalar & DevOps Amaliyoti",
      ],
      design: [
        "UI/UX Dizaynda Glassmorphism va Ranglar Gammasi",
        "Figma da Professional Mobil Interfeys Chizish",
        "Micro-Interactions va Animatsiyalar San'ati",
        "Mobil Ilovalar Uchun Dark Mode Standartlari",
      ],
      business: [
        "IT Startapni Noldan Boshlash va Rivojlantirish",
        "Frilanserlik va Xalqaro Loyihalarda Ishlash",
        "Product Management va Jamoani Boshqarish",
        "Raqamli Marketing va Shaxsiy Brend Qurish",
      ],
    };

    const list = titlesMap[query.toLowerCase()] || [
      `${query.toUpperCase()} bo'yicha maxsus video darslik`,
      `Zamonaviy ${query} qo'llanmasi 2026`,
    ];

    const index = Math.abs(id) % list.length;
    return list[index];
  }
}

export const pexelsService = new PexelsService();
