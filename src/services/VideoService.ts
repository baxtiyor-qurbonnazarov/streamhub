import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Video } from "../entities/Video";
import { User } from "../entities/User";
import { Like } from "../entities/Like";
import { Comment } from "../entities/Comment";
import { Subscription } from "../entities/Subscription";
import {
  encryptText,
  decryptVideo,
  decryptComment,
} from "../utils/crypto.util";
import { AppError } from "../middlewares/errorHandler";
import { pexelsService } from "./PexelsService";

export class VideoService {
  private get videoRepository() { return AppDataSource.getRepository(Video); }
  private get userRepository() { return AppDataSource.getRepository(User); }
  private get likeRepository() { return AppDataSource.getRepository(Like); }
  private get commentRepository() { return AppDataSource.getRepository(Comment); }
  private get subscriptionRepository() { return AppDataSource.getRepository(Subscription); }

  async getFeed(userId?: string, category?: string, page: number = 1, limit: number = 20): Promise<any[]> {
    const offset = (page - 1) * limit;

    const query = this.videoRepository
      .createQueryBuilder("video")
      .leftJoinAndSelect("video.author", "author")
      .orderBy("video.createdAt", "DESC")
      .skip(offset)
      .take(limit);

    if (category && category !== "Barchasi") {
      query.where("video.category = :category", { category });
    }

    const videos = await query.getMany();
    const enrichedVideos = await this.enrichVideosWithMetadata(videos, userId);

    // Dynamic Pexels Injection
    try {
      const pexelsQuery = "technology";
      const pexelsCategory = category || "Barchasi";
      const pexelsVideos = await pexelsService.fetchCategoryVideos(pexelsQuery, pexelsCategory, 4);

      if (pexelsVideos.length > 0) {
        const mappedPexels = pexelsVideos.map((p) => ({
          id: `dyn_${p.pexelsId}`,
          bunnyVideoId: `pexels_${p.pexelsId}`,
          title: p.title,
          description: p.description,
          thumbnailUrl: p.thumbnailUrl,
          videoUrl: p.videoUrl,
          duration: p.duration,
          views: Math.floor(Math.random() * 100000),
          createdAt: new Date().toISOString(),
          category: p.category,
          tags: p.tags,
          authorId: `dyn_author_${p.pexelsId}`,
          author: {
            id: `dyn_author_${p.pexelsId}`,
            name: p.creatorName,
            handle: p.creatorHandle,
            avatarUrl: p.creatorAvatarUrl,
            bio: p.creatorBio,
            subscribersCount: Math.floor(Math.random() * 5000),
            isFollowed: false,
            isVerified: true
          },
          likesCount: Math.floor(Math.random() * 5000),
          dislikesCount: Math.floor(Math.random() * 100),
          isLiked: false,
          isDisliked: false,
          comments: []
        }));

        // Mix Pexels videos into the feed
        mappedPexels.forEach((pVideo, idx) => {
          const insertPos = Math.min(enrichedVideos.length, (idx + 1) * 2);
          enrichedVideos.splice(insertPos, 0, pVideo);
        });
      }
    } catch (e) {
      console.warn("⚠️ Dynamic Pexels injection failed:", e);
    }

    return enrichedVideos;
  }

  async getSubscribedFeed(userId: string): Promise<any[]> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { followerId: userId },
    });

    if (subscriptions.length === 0) {
      return [];
    }

    const authorIds = subscriptions.map((s) => s.followingId);

    const videos = await this.videoRepository
      .createQueryBuilder("video")
      .leftJoinAndSelect("video.author", "author")
      .where("video.authorId IN (:...authorIds)", { authorIds })
      .orderBy("video.createdAt", "DESC")
      .limit(30)
      .getMany();

    return this.enrichVideosWithMetadata(videos, userId);
  }

  async getUploadTicket(
    userId: string,
    title: string,
    description: string,
    category: string,
    tags: string[],
    duration: number,
    thumbnailUrl?: string,
  ): Promise<{ video: Video; uploadUrl: string; accessKey: string }> {
    if (duration > 600) {
      throw new AppError(
        "StreamHub qoidalariga ko'ra videoning maksimal uzunligi 10 daqiqa (600 soniya) bo'lishi shart.",
        400,
      );
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError("Foydalanuvchi topilmadi.", 404);
    }

    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;
    const pullZone = process.env.BUNNY_PULL_ZONE_URL;

    if (!libraryId || !apiKey || !pullZone) {
      throw new AppError("Bunny Stream konfiguratsiyasi topilmadi.", 500);
    }

    // 1. Create Video in Bunny Stream
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ title }),
      },
    );

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("Bunny API Error:", errorText);
      throw new AppError("Bunny Stream orqali video yaratishda xatolik.", 500);
    }

    const bunnyData = (await createRes.json()) as { guid: string };
    const videoGuid = bunnyData?.guid || `bunny_${Date.now()}`;

    const video = new Video();
    video.bunnyVideoId = videoGuid;
    video.title = encryptText(title);
    video.description = encryptText(description);
    video.category = category;
    video.tags = tags;
    video.duration = duration;
    video.authorId = userId;
    video.author = user;

    // Use Bunny Stream HLS pull zone URL and generated thumbnail, or custom thumbnail if provided
    video.videoUrl = `${pullZone}/${videoGuid}/playlist.m3u8`;
    video.thumbnailUrl = thumbnailUrl && thumbnailUrl.trim() !== '' 
      ? thumbnailUrl 
      : `${pullZone}/${videoGuid}/thumbnail.jpg`;

    const savedVideo = await this.videoRepository.save(video);

    return {
      video: decryptVideo(savedVideo),
      uploadUrl: `https://video.bunnycdn.com/library/${libraryId}/videos/${videoGuid}`,
      accessKey: apiKey, // The frontend uses this to stream PUT the file chunks directly
    };
  }

  async completeUpload(
    videoId: string,
    userId: string,
    videoUrl: string,
    thumbnailUrl: string,
  ): Promise<any> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId, authorId: userId },
      relations: ["author"],
    });

    if (!video) {
      throw new AppError("Video topilmadi yoki ruxsat berilmagan.", 404);
    }

    video.videoUrl = videoUrl;
    video.thumbnailUrl = thumbnailUrl;

    const updated = await this.videoRepository.save(video);
    return decryptVideo(updated);
  }

  async toggleLike(
    userId: string,
    videoId: string,
    isLike: boolean,
  ): Promise<any> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });
    if (!video) {
      throw new AppError("Video topilmadi.", 404);
    }

    const existingLike = await this.likeRepository.findOne({
      where: { userId, videoId },
    });

    if (existingLike) {
      if (existingLike.isLike === isLike) {
        // Toggle off (remove vote)
        await this.likeRepository.remove(existingLike);
      } else {
        // Switch from like to dislike or vice versa
        existingLike.isLike = isLike;
        await this.likeRepository.save(existingLike);
      }
    } else {
      // Create new vote
      const newLike = new Like();
      newLike.userId = userId;
      newLike.videoId = videoId;
      newLike.isLike = isLike;
      await this.likeRepository.save(newLike);
    }

    // Return updated totals
    const likesCount = await this.likeRepository.count({
      where: { videoId, isLike: true },
    });
    const dislikesCount = await this.likeRepository.count({
      where: { videoId, isLike: false },
    });
    const currentVote = await this.likeRepository.findOne({
      where: { userId, videoId },
    });

    return {
      likesCount,
      dislikesCount,
      isLiked: currentVote ? currentVote.isLike : false,
      isDisliked: currentVote ? !currentVote.isLike : false,
    };
  }

  async getComments(videoId: string): Promise<any[]> {
    const comments = await this.commentRepository.find({
      where: { videoId, parentId: undefined },
      relations: [
        "author",
        "replyToUser",
        "replies",
        "replies.author",
        "replies.replyToUser",
      ],
      order: { createdAt: "DESC" },
    });

    return comments.map((c) => {
      const decrypted = decryptComment(c);
      if (decrypted.replies && decrypted.replies.length > 0) {
        decrypted.replies = decrypted.replies.map((r: any) =>
          decryptComment(r),
        );
      }
      return decrypted;
    });
  }

  async addComment(
    userId: string,
    videoId: string,
    text: string,
    parentId?: string,
    replyToUserId?: string,
  ): Promise<any> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });
    if (!video) {
      throw new AppError("Video topilmadi.", 404);
    }

    const comment = new Comment();
    comment.text = encryptText(text);
    comment.authorId = userId;
    comment.videoId = videoId;
    comment.parentId = parentId;
    comment.replyToUserId = replyToUserId;

    const savedComment = await this.commentRepository.save(comment);

    const populated = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ["author", "replyToUser"],
    });

    return decryptComment(populated!);
  }

  /**
   * Smart Multi-Factor Recommendation Engine.
   * Ranks matching videos by category match, author match, tag overlap, views count, and likes count.
   */
  async getRelatedVideos(
    userId: string | undefined,
    videoId: string,
    limit: number = 15,
  ): Promise<any[]> {
    const targetVideo = await this.videoRepository.findOne({
      where: { id: videoId },
    });
    if (!targetVideo) {
      throw new AppError("Video topilmadi.", 404);
    }

    // Fetch candidate videos (excluding current video)
    const candidates = await this.videoRepository
      .createQueryBuilder("video")
      .leftJoinAndSelect("video.author", "author")
      .where("video.id != :videoId", { videoId })
      .orderBy("video.createdAt", "DESC")
      .take(50)
      .getMany();

    if (candidates.length === 0) return [];

    const enriched = await this.enrichVideosWithMetadata(candidates, userId);
    const targetCategory = targetVideo.category.toLowerCase();
    const targetTags = (targetVideo.tags || []).map((t) => t.toLowerCase());

    // Calculate smart multi-factor similarity score for each candidate
    const scored = enriched.map((v) => {
      let score = 0;

      // 1. Category match (+15 points)
      if (v.category && v.category.toLowerCase() === targetCategory) {
        score += 15;
      }

      // 2. Author match (+10 points)
      if (v.authorId === targetVideo.authorId) {
        score += 10;
      }

      // 3. Tag overlap (+8 points per common tag)
      if (v.tags && Array.isArray(v.tags)) {
        const commonTags = v.tags.filter((t: string) => targetTags.includes(t.toLowerCase()));
        score += commonTags.length * 8;
      }

      // 4. Popularity bonus (views & likes)
      const viewsBonus = Math.min(10, Math.log10((v.views || 0) + 1) * 3);
      const likesBonus = Math.min(15, (v.likesCount || 0) * 1.5);
      score += viewsBonus + likesBonus;

      return { video: v, score };
    });

    // Sort by Similarity Score DESC
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.video);
  }

  /**
   * Smart High-Performance Tokenized Search Engine.
   * Searches title, description, category, tags, author name, and handle with multi-field relevance scoring.
   */
  async searchVideos(
    userId: string | undefined,
    queryStr: string,
    category?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any[]> {
    let query = this.videoRepository
      .createQueryBuilder("video")
      .leftJoinAndSelect("video.author", "author")
      .orderBy("video.createdAt", "DESC");

    if (category && category !== "Barchasi") {
      query = query.where("video.category = :category", { category });
    }

    const allVideos = await query.getMany();
    if (allVideos.length === 0) return [];

    const enriched = await this.enrichVideosWithMetadata(allVideos, userId);

    if (!queryStr || queryStr.trim() === "") {
      const offset = (page - 1) * limit;
      return enriched.slice(offset, offset + limit);
    }

    const tokens = queryStr.trim().toLowerCase().split(/\s+/);

    const scored = enriched.map((v) => {
      let score = 0;
      const titleLower = (v.title || "").toLowerCase();
      const descLower = (v.description || "").toLowerCase();
      const categoryLower = (v.category || "").toLowerCase();
      const authorNameLower = (v.author?.name || "").toLowerCase();
      const authorHandleLower = (v.author?.handle || "").toLowerCase();
      const tagsLower = (v.tags || []).map((t: string) => t.toLowerCase());

      for (const token of tokens) {
        // Title match (highest weight: +10)
        if (titleLower.includes(token)) score += 10;

        // Tag match (weight: +8)
        if (tagsLower.some((t: string) => t.includes(token))) score += 8;

        // Category match (weight: +6)
        if (categoryLower.includes(token)) score += 6;

        // Author name/handle match (weight: +5)
        if (authorNameLower.includes(token) || authorHandleLower.includes(token)) score += 5;

        // Description match (weight: +3)
        if (descLower.includes(token)) score += 3;
      }

      return { video: v, score };
    });

    // Filter out videos with 0 relevance score
    const matches = scored.filter((s) => s.score > 0);

    // Sort by relevance score DESC
    matches.sort((a, b) => b.score - a.score);

    const offset = (page - 1) * limit;
    return matches.slice(offset, offset + limit).map((s) => s.video);
  }

  async incrementViews(videoId: string): Promise<number> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });
    if (!video) return 0;

    video.views += 1;
    await this.videoRepository.save(video);
    return video.views;
  }

  /**
   * High-Performance Batch Metadata Enrichment (Solves N+1 Query Problem).
   * Executes only 2 to 4 bulk queries total regardless of video count.
   */
  private async enrichVideosWithMetadata(
    videos: Video[],
    userId?: string,
  ): Promise<any[]> {
    if (videos.length === 0) return [];

    const videoIds = videos.map((v) => v.id);
    const authorIds = Array.from(
      new Set(videos.map((v) => v.authorId).filter(Boolean)),
    );

    // 1. Bulk count likes & dislikes per video
    const likesRawPromise = this.likeRepository
      .createQueryBuilder("like")
      .select("like.videoId", "videoId")
      .addSelect(
        "SUM(CASE WHEN like.isLike = true THEN 1 ELSE 0 END)",
        "likesCount",
      )
      .addSelect(
        "SUM(CASE WHEN like.isLike = false THEN 1 ELSE 0 END)",
        "dislikesCount",
      )
      .where("like.videoId IN (:...videoIds)", { videoIds })
      .groupBy("like.videoId")
      .getRawMany();

    // 2. Bulk count subscribers per author
    const subsRawPromise =
      authorIds.length > 0
        ? this.subscriptionRepository
            .createQueryBuilder("sub")
            .select("sub.followingId", "followingId")
            .addSelect("COUNT(sub.followerId)", "subscribersCount")
            .where("sub.followingId IN (:...authorIds)", { authorIds })
            .groupBy("sub.followingId")
            .getRawMany()
        : Promise.resolve([]);

    // 3. User specific votes & follows
    const userLikesPromise =
      userId && videoIds.length > 0
        ? this.likeRepository.find({ where: { userId, videoId: In(videoIds) } })
        : Promise.resolve([]);

    const userFollowsPromise =
      userId && authorIds.length > 0
        ? this.subscriptionRepository.find({
            where: { followerId: userId, followingId: In(authorIds) },
          })
        : Promise.resolve([]);

    // Execute all batch queries in parallel
    const [likesRaw, subsRaw, userLikes, userFollows] = await Promise.all([
      likesRawPromise,
      subsRawPromise,
      userLikesPromise,
      userFollowsPromise,
    ]);

    // Build O(1) in-memory lookup maps
    const likesMap = new Map<string, { likes: number; dislikes: number }>();
    for (const r of likesRaw) {
      likesMap.set(r.videoId, {
        likes: parseInt(r.likesCount, 10) || 0,
        dislikes: parseInt(r.dislikesCount, 10) || 0,
      });
    }

    const subsMap = new Map<string, number>();
    for (const r of subsRaw) {
      subsMap.set(r.followingId, parseInt(r.subscribersCount, 10) || 0);
    }

    const userVoteMap = new Map<string, boolean>();
    for (const ul of userLikes) {
      userVoteMap.set(ul.videoId, ul.isLike);
    }

    const userFollowSet = new Set<string>();
    for (const uf of userFollows) {
      userFollowSet.add(uf.followingId);
    }

    // Assemble final decrypted responses
    return videos.map((v) => {
      const counts = likesMap.get(v.id) || { likes: 0, dislikes: 0 };
      const userVote = userVoteMap.get(v.id);
      const isLiked = userVote === true;
      const isDisliked = userVote === false;
      const subscribersCount = subsMap.get(v.authorId) || 0;
      const isFollowed = userFollowSet.has(v.authorId);

      const decryptedVideo = decryptVideo(v);
      return {
        ...decryptedVideo,
        likesCount: counts.likes,
        dislikesCount: counts.dislikes,
        isLiked,
        isDisliked,
        author: {
          ...decryptedVideo.author,
          subscribersCount,
          isFollowed,
        },
      };
    });
  }
}
export const videoService = new VideoService();
